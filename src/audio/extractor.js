const { exec } = require('child_process');
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

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout.trim());
    });
  });
}

class AudioExtractor {
  /**
   * Resolves direct audio stream URL using yt-dlp with best audio format
   */
  static async getAudioStreamUrl(targetUrl) {
    let cleanUrl = targetUrl;
    if (cleanUrl.includes('watch?v=') && cleanUrl.includes('list=RD')) {
      const match = cleanUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      if (match) {
        cleanUrl = `https://music.youtube.com/watch?v=${match[1]}`;
      }
    }

    const cmd = `python -m yt_dlp -g -f "bestaudio[acodec=opus]/bestaudio[ext=m4a]/bestaudio/best" --audio-quality 0 "${cleanUrl}"`;
    const output = await execPromise(cmd);
    const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) throw new Error('Could not extract direct stream URL');
    return lines[lines.length - 1];
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
   * Searches the official studio catalogue for a single track
   */
  static async getStudioTrackMetadata(query) {
    const list = await this.searchStudioTracks(query, 1);
    return list.length > 0 ? list[0] : null;
  }

  /**
   * Smart matcher that finds the exact studio master recording matching Spotify track duration
   * Prioritizes official Topic / Record Label distributions over music videos or covers.
   */
  static async matchStudioAudio(title, artist, targetDurationSec = 0) {
    try {
      const cleanArtist = artist.split(',')[0].replace(/ft\..*$/i, '').trim();
      const cleanTitle = title
        .replace(/\(feat\..*?\)/i, '')
        .replace(/\[feat\..*?\]/i, '')
        .replace(/\(remaster.*?\)/i, '')
        .replace(/\[remaster.*?\]/i, '')
        .trim();

      // Query 1: YouTube Music Topic / Official Studio release
      const queries = [
        `${cleanArtist} - ${cleanTitle} Topic`,
        `${cleanArtist} - ${cleanTitle} audio`
      ];

      for (const q of queries) {
        const cmd = `python -m yt_dlp --default-search "ytsearch5" --print "%(id)s\t%(duration)s\t%(uploader)s\t%(title)s" "${q.replace(/"/g, '')}"`;
        let stdout = '';
        try {
          stdout = await execPromise(cmd);
        } catch (e) {
          continue;
        }

        const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
        if (!lines.length) continue;

        let best = null;
        let bestScore = -9999;

        for (const line of lines) {
          const parts = line.split('\t');
          if (parts.length < 4) continue;
          const id = parts[0];
          const dur = parseInt(parts[1], 10) || 0;
          const uploader = (parts[2] || '').toLowerCase();
          const candTitle = (parts.slice(3).join('\t') || '').toLowerCase();

          let score = 0;
          const durDiff = targetDurationSec > 0 ? Math.abs(dur - targetDurationSec) : 0;

          // Official Topic channel is the exact studio track distributed to Spotify / YouTube Music
          if (uploader.includes('topic')) score += 80;
          else if (uploader.includes('vevo')) score += 30;

          // Exact duration match (±2s)
          if (durDiff <= 2) score += 50;
          else if (durDiff <= 5) score += 30;
          else if (durDiff > 25) score -= 50;

          if (candTitle.includes('audio') || candTitle.includes('remaster')) score += 25;
          // Heavily penalize music videos, live performances, and covers
          if (candTitle.includes('official video') || candTitle.includes('music video')) score -= 70;
          if (candTitle.includes('live') || candTitle.includes('concert')) score -= 90;
          if (candTitle.includes('cover') || candTitle.includes('tribute') || candTitle.includes('karaoke')) score -= 100;

          if (score > bestScore) {
            bestScore = score;
            best = {
              id,
              url: `https://www.youtube.com/watch?v=${id}`,
              duration: dur
            };
          }
        }

        if (best && bestScore > 0) {
          return best.url;
        }
      }

      // Fallback: simple search
      const fallbackCmd = `python -m yt_dlp --default-search "ytsearch1" --print "%(id)s" "${cleanArtist} - ${cleanTitle} audio"`;
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
    // 1. Primary: Search Spotify / Studio discography catalogue
    const studioTracks = await this.searchStudioTracks(query, limit);
    if (studioTracks.length > 0) {
      return studioTracks;
    }

    // 2. Fallback: Search YouTube if not found in studio catalogue
    try {
      const results = await YouTube.search(query, { limit });
      return results.map(item => ({
        title: item.title || 'Unknown Title',
        author: item.channel?.name || 'Unknown Artist',
        url: item.url,
        thumbnail: item.thumbnail?.url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
        duration: item.duration ? Math.floor(item.duration / 1000) : parseDurationFormatted(item.durationFormatted),
        durationFormatted: item.durationFormatted || formatDuration(item.duration ? item.duration / 1000 : 0),
        source: 'spotify'
      }));
    } catch (err) {
      const cmd = `python -m yt_dlp --default-search "ytsearch${limit}" --print "%(id)s\t%(duration)s\t%(uploader)s\t%(title)s" "${query.replace(/"/g, '')}"`;
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
    }
  }

  /**
   * Resolve any input (prioritizing Spotify)
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
      const matchedUrl = await this.matchStudioAudio(studioTrack.title, studioTrack.author, studioTrack.duration);
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

    // Fallback: search query
    const searchResults = await this.search(input, 1);
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
        // Fallback: extract track name from oembed
        try {
          const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
          const odata = await oembedRes.json();
          if (odata && odata.title) {
            data = {
              title: odata.title,
              name: odata.title,
              artists: [{ name: 'Spotify Artist' }],
              duration: 210000,
              thumbnail: odata.thumbnail_url
            };
          }
        } catch (e) {}
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
      const matchedUrl = await this.matchStudioAudio(title, artist, durationSec);
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

    if (url.includes('list=') && !url.includes('list=RD')) {
      const cmd = `python -m yt_dlp --flat-playlist --dump-single-json --no-warnings "${url}"`;
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

    const cmd = `python -m yt_dlp --dump-single-json --no-warnings "${url}"`;
    const stdout = await execPromise(cmd);
    const data = JSON.parse(stdout);

    // Even if user provides a YouTube link, upgrade to Spotify Studio release if possible!
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
}

module.exports = AudioExtractor;
