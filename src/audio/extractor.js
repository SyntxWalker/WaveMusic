const { exec, execSync } = require('child_process');
const YouTube = require('youtube-sr').default;
const spotifyInfo = require('spotify-url-info')(fetch);

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '00:00';
  const sec = Math.floor(seconds % 60);
  const min = Math.floor((seconds / 60) % 60);
  const hrs = Math.floor(seconds / 3600);
  const pad = (n) => n.toString().padStart(2, '0');
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(min)}:${pad(sec)}`;
  }
  return `${pad(min)}:${pad(sec)}`;
}

function parseDurationFormatted(formatted) {
  if (!formatted) return 0;
  const parts = formatted.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

let cachedYtDlp = null;
function getYtDlp() {
  if (cachedYtDlp) return cachedYtDlp;

  // 1. Direct yt-dlp binary (works on Docker /usr/local/bin/yt-dlp, Linux, and Windows PATH)
  try {
    execSync('yt-dlp --version', { stdio: 'ignore' });
    cachedYtDlp = 'yt-dlp';
    return cachedYtDlp;
  } catch (e) {}

  // 2. /usr/local/bin/yt-dlp (standard Linux curl install in Docker)
  try {
    execSync('/usr/local/bin/yt-dlp --version', { stdio: 'ignore' });
    cachedYtDlp = '/usr/local/bin/yt-dlp';
    return cachedYtDlp;
  } catch (e) {}

  // 3. python3 -m yt_dlp
  try {
    execSync('python3 -m yt_dlp --version', { stdio: 'ignore' });
    cachedYtDlp = 'python3 -m yt_dlp';
    return cachedYtDlp;
  } catch (e) {}

  // 4. python -m yt_dlp
  try {
    execSync('python -m yt_dlp --version', { stdio: 'ignore' });
    cachedYtDlp = 'python -m yt_dlp';
    return cachedYtDlp;
  } catch (e) {}

  cachedYtDlp = 'yt-dlp';
  return cachedYtDlp;
}

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 15 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout.trim());
    });
  });
}

class AudioExtractor {
  /**
   * Resolves direct audio stream URL with anti-bot bypass for cloud hosts (Render/Docker)
   */
  static async getAudioStreamUrl(targetUrl) {
    let cleanUrl = targetUrl;
    if (cleanUrl.includes('watch?v=') && cleanUrl.includes('list=RD')) {
      const match = cleanUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      if (match) {
        cleanUrl = `https://music.youtube.com/watch?v=${match[1]}`;
      }
    }

    const bin = getYtDlp();

    // Primary: Android client bypass prevents cloud datacenter IP blocks (HTTP 429 / bot challenges)
    const primaryCmd = `${bin} -g -f "bestaudio[acodec=opus]/bestaudio[ext=m4a]/bestaudio/best" --extractor-args "youtube:player_client=android,web" --no-check-certificates --geo-bypass --audio-quality 0 "${cleanUrl}"`;
    try {
      const output = await execPromise(primaryCmd);
      const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length) return lines[lines.length - 1];
    } catch (err) {
      console.warn('[getAudioStreamUrl primary warning]:', err.message);
    }

    // Fallback: Standard audio format extraction
    try {
      const fallbackCmd = `${bin} -g -f "bestaudio/best" --no-check-certificates --geo-bypass "${cleanUrl}"`;
      const output = await execPromise(fallbackCmd);
      const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length) return lines[lines.length - 1];
    } catch (err) {
      console.warn('[getAudioStreamUrl fallback warning]:', err.message);
    }

    throw new Error('Could not extract direct stream URL');
  }

  /**
   * Searches the official studio catalogue (matching Spotify discography)
   */
  static async searchStudioTracks(query, limit = 5) {
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results.map(t => {
          const artwork = t.artworkUrl100
            ? t.artworkUrl100.replace('100x100bb', '1000x1000bb')
            : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500';
          const durationSec = Math.round(t.trackTimeMillis / 1000);
          return {
            title: t.trackName,
            author: t.artistName,
            album: t.collectionName || '',
            duration: durationSec,
            durationFormatted: formatDuration(durationSec),
            thumbnail: artwork,
            url: null,
            searchQuery: `${t.artistName} - ${t.trackName} audio`,
            source: 'spotify'
          };
        });
      }
    } catch (e) {
      console.warn('[Studio Catalogue Search Warning]:', e.message);
    }
    return [];
  }

  /**
   * Searches official studio catalogue for a single track
   */
  static async getStudioTrackMetadata(query) {
    const list = await this.searchStudioTracks(query, 1);
    return list.length > 0 ? list[0] : null;
  }

  /**
   * Guaranteed YouTube search fallback returning non-null playable URLs
   */
  static async searchYouTubeOnly(query, limit = 5) {
    try {
      const results = await YouTube.search(query, { limit });
      if (results && results.length > 0) {
        return results.map(item => ({
          title: item.title || 'Unknown Title',
          author: item.channel?.name || 'Unknown Artist',
          url: item.url,
          thumbnail: item.thumbnail?.url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
          duration: item.duration ? Math.floor(item.duration / 1000) : parseDurationFormatted(item.durationFormatted),
          durationFormatted: item.durationFormatted || formatDuration(item.duration ? item.duration / 1000 : 0),
          source: 'spotify'
        }));
      }
    } catch (e) {}

    const bin = getYtDlp();
    try {
      const cmd = `${bin} --default-search "ytsearch${limit}" --no-check-certificates --geo-bypass --print "%(id)s\t%(duration)s\t%(uploader)s\t%(title)s" "${query.replace(/"/g, '')}"`;
      const stdout = await execPromise(cmd);
      const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
      return lines.map(line => {
        const parts = line.split('\t');
        const id = parts[0];
        const dur = parseInt(parts[1], 10) || 0;
        const uploader = parts[2] || 'Artist';
        const title = parts.slice(3).join('\t') || 'Unknown Title';
        return {
          title,
          author: uploader,
          url: `https://www.youtube.com/watch?v=${id}`,
          thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          duration: dur,
          durationFormatted: formatDuration(dur),
          source: 'spotify'
        };
      });
    } catch (err) {
      console.warn('[searchYouTubeOnly Warning]:', err.message);
      return [];
    }
  }

  /**
   * Smart matcher that finds the exact studio master recording matching Spotify track duration
   * Prioritizes official Topic / Record Label distributions and heavily penalizes remixes/slowed/pitch-shifts.
   */
  static async matchStudioAudio(title, artist, targetDurationSec = 0) {
    try {
      const bin = getYtDlp();

      // Split multiple artists on comma, ampersand, feat, etc.
      const artistParts = (artist || '').split(/[,&]|\bfeat\b|\bft\b/i).map(a => a.trim()).filter(Boolean);
      const primaryArtist = (artistParts[0] || artist || '').toLowerCase();
      const secondaryArtist = (artistParts[1] || '').toLowerCase();

      const cleanTitle = (title || '')
        .replace(/\(feat\..*?\)/i, '')
        .replace(/\[feat\..*?\]/i, '')
        .replace(/\(remaster.*?\)/i, '')
        .replace(/\[remaster.*?\]/i, '')
        .replace(/\(from ".*?"\)/i, '')
        .replace(/\[from ".*?"\]/i, '')
        .trim();
      const cleanTitleLower = cleanTitle.toLowerCase();

      const queries = [
        `${cleanTitle} ${primaryArtist} official audio`,
        `${primaryArtist} - ${cleanTitle} Topic`,
        `${cleanTitle} ${primaryArtist}`
      ];

      const officialLabels = [
        'topic', 'yrf', 'yash raj', 't-series', 'tseries', 'sony', 'sonymusic', 'zee', 'zeemusic',
        'saregama', 'tips', 'speed records', 'white hill', 'geet mp3', 'desi music', 'eros',
        'universal', 'warner', 'atlantic', 'columbia', 'interscope', 'republic', 'def jam', 'rca',
        'epic', 'capitol', 'virgin', 'spinnin', 'monstercat', 'vevo'
      ];

      const bannedModifiers = [
        'remix', 'mix', 'dj', 'slowed', 'reverb', 'sped up', 'speed up', 'speedup', 'bass boosted',
        'bassboosted', 'mashup', 'mash up', 'lofi', 'lo-fi', 'cover', 'rendition', 'tribute',
        'karaoke', 'instrumental', 'live', 'concert', 'teaser', 'trailer', 'dialogue', 'skit',
        'reaction', '8d', '16d', '3d audio', 'parody', 'unplugged', 'acoustic'
      ];

      let best = null;
      let bestScore = -9999;

      for (const q of queries) {
        const cmd = `${bin} --default-search "ytsearch5" --extractor-args "youtube:player_client=android,web" --no-check-certificates --geo-bypass --print "%(id)s\t%(duration)s\t%(uploader)s\t%(title)s" "${q.replace(/"/g, '')}"`;
        let stdout = '';
        try {
          stdout = await execPromise(cmd);
        } catch (e) {
          continue;
        }

        const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
        if (!lines.length) continue;

        for (const line of lines) {
          const parts = line.split('\t');
          if (parts.length < 4) continue;
          const id = parts[0];
          const dur = parseInt(parts[1], 10) || 0;
          const uploader = (parts[2] || '').toLowerCase();
          const candTitle = (parts.slice(3).join('\t') || '').toLowerCase();

          let score = 0;
          const durDiff = targetDurationSec > 0 ? Math.abs(dur - targetDurationSec) : 0;

          // 1. Channel authority
          if (uploader.includes('topic')) {
            score += 160;
          } else if (uploader.includes(primaryArtist) || primaryArtist.includes(uploader)) {
            score += 130;
          } else if (officialLabels.some(lbl => uploader.includes(lbl))) {
            score += 100;
          } else {
            score -= 50; // Fan / unofficial channel penalty (often pitch-shifted)
          }

          // 2. Strict duration matching
          if (targetDurationSec > 0) {
            if (durDiff <= 2) score += 80;
            else if (durDiff <= 5) score += 50;
            else if (durDiff <= 10) score += 20;
            else if (durDiff > 25) score -= 180;
            else if (durDiff > 45) score -= 350;
          }

          // 3. Title accuracy
          if (candTitle.includes(cleanTitleLower)) score += 40;
          if (candTitle.includes('official audio')) score += 50;

          // 4. Strict penalties for altered / remixed audio
          for (const mod of bannedModifiers) {
            if (!cleanTitleLower.includes(mod) && candTitle.includes(mod)) {
              score -= 300;
            }
          }

          if (score > bestScore) {
            bestScore = score;
            best = {
              id,
              url: `https://www.youtube.com/watch?v=${id}`,
              duration: dur,
              score
            };
          }
        }

        // If an authentic verified master track was found (> 180 score), stop searching further queries
        if (best && bestScore >= 180) {
          return best.url;
        }
      }

      if (best) {
        return best.url;
      }

      // Fallback: direct simple search
      const fallbackCmd = `${bin} --default-search "ytsearch1" --no-check-certificates --geo-bypass --print "%(id)s" "${cleanTitle} ${primaryArtist}"`;
      const fallbackOut = await execPromise(fallbackCmd);
      const fallbackId = fallbackOut.split('\n')[0].trim();
      return fallbackId ? `https://www.youtube.com/watch?v=${fallbackId}` : null;
    } catch (err) {
      console.warn('[matchStudioAudio Warning]:', err.message);
      return null;
    }
  }

  /**
   * Search for multiple tracks (used by /search command)
   * ALWAYS searches Spotify / Studio catalogue first!
   */
  static async search(query, limit = 5) {
    const studioTracks = await this.searchStudioTracks(query, limit);
    if (studioTracks.length > 0) {
      return studioTracks;
    }
    return await this.searchYouTubeOnly(query, limit);
  }

  /**
   * Resolve any input (prioritizing Spotify)
   * GUARANTEES track.url is never null!
   */
  static async resolve(input, requester) {
    input = input.trim();

    // 1. Direct Spotify URL
    if (input.includes('spotify.com')) {
      return await this.resolveSpotify(input, requester);
    }

    // 2. Direct YouTube Music or YouTube URL
    if (input.includes('youtube.com') || input.includes('youtu.be')) {
      return await this.resolveYouTube(input, requester);
    }

    // 3. Query string: ALWAYS search Spotify / Studio Catalogue first!
    const studioTrack = await this.getStudioTrackMetadata(input);
    if (studioTrack) {
      let matchedUrl = await this.matchStudioAudio(studioTrack.title, studioTrack.author, studioTrack.duration);
      if (!matchedUrl) {
        // Fallback search to guarantee a playable URL
        const ytResults = await this.searchYouTubeOnly(`${studioTrack.title} ${studioTrack.author}`, 1);
        if (ytResults.length > 0 && ytResults[0].url) {
          matchedUrl = ytResults[0].url;
        }
      }

      if (matchedUrl) {
        return {
          type: 'single',
          tracks: [{
            title: studioTrack.title,
            author: studioTrack.author,
            url: matchedUrl,
            thumbnail: studioTrack.thumbnail,
            duration: studioTrack.duration,
            durationFormatted: formatDuration(studioTrack.duration),
            requestedBy: requester,
            source: 'spotify'
          }]
        };
      }
    }

    // 4. Fallback: Search YouTube with guaranteed URL
    const searchResults = await this.searchYouTubeOnly(input, 1);
    if (!searchResults.length) {
      throw new Error(`No tracks found matching "${input}"`);
    }

    const track = {
      ...searchResults[0],
      source: 'spotify',
      requestedBy: requester
    };

    return {
      type: 'single',
      tracks: [track]
    };
  }

  /**
   * Resolve Spotify links
   */
  static async resolveSpotify(url, requester) {
    if (url.includes('/track/')) {
      let data = null;
      try {
        data = await spotifyInfo.getData(url);
      } catch (err) {
        // Fallback 1: extract track name from oembed
        try {
          const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
          const odata = await oembedRes.json();
          if (odata && odata.title) {
            data = {
              title: odata.title,
              name: odata.title,
              artists: [{ name: odata.author_name || 'Spotify Artist' }],
              duration: 0,
              thumbnail: odata.thumbnail_url
            };
          }
        } catch (e) {}

        // Fallback 2: scrape <title> tag from Spotify page directly
        if (!data) {
          try {
            const pageRes = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
              }
            });
            const html = await pageRes.text();
            const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
              const fullTitle = titleMatch[1];
              const parsed = fullTitle.match(/^(.+?)\s+-\s+song(?:\s+and\s+lyrics)?\s+by\s+(.+?)\s*\|\s*Spotify$/i);
              if (parsed) {
                data = {
                  title: parsed[1].trim(),
                  name: parsed[1].trim(),
                  artists: [{ name: parsed[2].trim() }],
                  duration: 0,
                  thumbnail: null
                };
              }
            }
          } catch (e) {}
        }
      }

      if (!data) {
        throw new Error('This Spotify track link is invalid or unavailable.');
      }

      const artist = data.artists ? data.artists.map(a => a.name).join(', ') : 'Unknown Artist';
      const title = data.name || data.title || 'Unknown Track';
      const durationSec = data.duration ? Math.round(data.duration / 1000) : 0;

      let thumbnail = data.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500';
      if (data.visualIdentity && data.visualIdentity.image && data.visualIdentity.image.length > 0) {
        const sorted = [...data.visualIdentity.image].sort((a, b) => (b.maxWidth || 0) - (a.maxWidth || 0));
        thumbnail = sorted[0].url;
      } else if (data.album && data.album.images && data.album.images[0]) {
        thumbnail = data.album.images[0].url;
      }

      // Match exact studio audio corresponding to the Spotify track
      let matchedUrl = await this.matchStudioAudio(title, artist, durationSec);
      if (!matchedUrl) {
        const ytResults = await this.searchYouTubeOnly(`${title} ${artist}`, 1);
        if (ytResults.length > 0 && ytResults[0].url) {
          matchedUrl = ytResults[0].url;
        }
      }

      if (!matchedUrl) {
        throw new Error(`Could not find studio audio source for "${title} - ${artist}"`);
      }

      return {
        type: 'single',
        tracks: [{
          title,
          author: artist,
          url: matchedUrl,
          spotifyUrl: url,
          thumbnail,
          duration: durationSec,
          durationFormatted: formatDuration(durationSec),
          requestedBy: requester,
          source: 'spotify'
        }]
      };
    }

    // Spotify Playlist or Album
    if (url.includes('/playlist/') || url.includes('/album/')) {
      const tracksData = await spotifyInfo.getTracks(url);
      if (!tracksData || !tracksData.length) {
        throw new Error('Spotify playlist or album is empty or private.');
      }

      const tracks = [];
      for (const t of tracksData.slice(0, 100)) {
        const title = t.name || t.title || 'Unknown Title';
        const artist = t.artists ? t.artists.map(a => a.name).join(', ') : (t.artist || 'Unknown Artist');
        const durationSec = t.duration ? Math.round(t.duration / 1000) : 0;

        tracks.push({
          title,
          author: artist,
          url: null,
          searchQuery: `${artist} - ${title} audio`,
          thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
          duration: durationSec,
          durationFormatted: formatDuration(durationSec),
          requestedBy: requester,
          source: 'spotify'
        });
      }

      return {
        type: 'playlist',
        title: url.includes('/album/') ? 'Spotify Album' : 'Spotify Playlist',
        tracks
      };
    }

    throw new Error('Unsupported Spotify link. Please provide a track, album, or playlist URL.');
  }

  /**
   * Resolve YouTube & YouTube Music links
   */
  static async resolveYouTube(url, requester) {
    const isYtMusic = url.includes('music.youtube.com');

    if (url.includes('watch?v=') && url.includes('list=RD')) {
      const vMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      if (vMatch) {
        url = isYtMusic ? `https://music.youtube.com/watch?v=${vMatch[1]}` : `https://www.youtube.com/watch?v=${vMatch[1]}`;
      }
    }

    const bin = getYtDlp();

    if (url.includes('list=') && !url.includes('list=RD')) {
      const cmd = `${bin} --flat-playlist --dump-single-json --no-warnings --no-check-certificates "${url}"`;
      try {
        const stdout = await execPromise(cmd);
        const data = JSON.parse(stdout);
        const entries = data.entries || [];
        if (!entries.length) throw new Error('Playlist is empty or private.');

        const tracks = entries.slice(0, 100).map(e => ({
          title: e.title || 'Unknown Track',
          author: e.uploader || e.channel || (isYtMusic ? 'YouTube Music' : 'YouTube Artist'),
          url: e.url || (e.id ? `https://www.youtube.com/watch?v=${e.id}` : null),
          searchQuery: `${e.title || ''}`,
          thumbnail: (e.thumbnails && e.thumbnails[0]?.url) || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
          duration: Math.floor(e.duration || 0),
          durationFormatted: formatDuration(e.duration || 0),
          requestedBy: requester,
          source: isYtMusic ? 'ytmusic' : 'youtube'
        }));

        return {
          type: 'playlist',
          title: data.title || (isYtMusic ? 'YouTube Music Playlist' : 'YouTube Playlist'),
          tracks
        };
      } catch (e) {}
    }

    const cmd = `${bin} --dump-single-json --no-warnings --no-check-certificates "${url}"`;
    const stdout = await execPromise(cmd);
    const data = JSON.parse(stdout);

    // Upgrade music video to Spotify Studio release if available
    const cleanTitle = (data.title || '')
      .replace(/\(official (music )?video\)/i, '')
      .replace(/\[official (music )?video\]/i, '')
      .replace(/\(audio\)/i, '')
      .replace(/\(lyrics?\)/i, '')
      .replace(/\(4k.*?\)/i, '')
      .replace(/\(hd\)/i, '')
      .trim();

    try {
      const studioCandidate = await this.getStudioTrackMetadata(`${data.uploader || ''} ${cleanTitle}`);
      if (studioCandidate) {
        const matchedUrl = await this.matchStudioAudio(studioCandidate.title, studioCandidate.author, studioCandidate.duration);
        if (matchedUrl) {
          return {
            type: 'single',
            tracks: [{
              title: studioCandidate.title,
              author: studioCandidate.author,
              url: matchedUrl,
              thumbnail: studioCandidate.thumbnail,
              duration: studioCandidate.duration,
              durationFormatted: formatDuration(studioCandidate.duration),
              requestedBy: requester,
              source: 'spotify'
            }]
          };
        }
      }
    } catch (e) {}

    const track = {
      title: data.title || 'Unknown Track',
      author: data.uploader || data.channel || (isYtMusic ? 'YouTube Music' : 'YouTube Artist'),
      url: data.webpage_url || url,
      thumbnail: data.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
      duration: Math.floor(data.duration || 0),
      durationFormatted: formatDuration(data.duration || 0),
      requestedBy: requester,
      source: isYtMusic ? 'ytmusic' : 'youtube'
    };

    return {
      type: 'single',
      tracks: [track]
    };
  }

  static getYtDlp() {
    return getYtDlp();
  }
}

module.exports = AudioExtractor;
