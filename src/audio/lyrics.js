function cleanTitle(rawTitle) {
  if (!rawTitle) return '';
  return rawTitle
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/(official video|official audio|lyrics|lyric video|music video|remastered|4k|hd)/gi, '')
    .replace(/ft\..*?$/i, '')
    .replace(/feat\..*?$/i, '')
    .trim();
}

class LyricsFetcher {
  /**
   * Search and fetch plain lyrics for a song
   * @param {string} songTitle 
   * @param {string} artist 
   */
  static async getLyrics(songTitle, artist = '') {
    const queries = [];
    if (artist && songTitle) {
      queries.push(`${artist} ${cleanTitle(songTitle)}`);
      queries.push(`${songTitle} ${artist}`);
    }
    queries.push(cleanTitle(songTitle));
    queries.push(songTitle);

    for (const q of queries) {
      try {
        const url = `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'WaveMusicBot/1.0.0 (https://discord.gg)' }
        });
        if (!res.ok) continue;

        const results = await res.json();
        if (Array.isArray(results) && results.length > 0) {
          // Find first entry with lyrics
          const match = results.find(r => r.plainLyrics && r.plainLyrics.trim().length > 30);
          if (match) {
            return {
              title: match.trackName || songTitle,
              artist: match.artistName || artist || 'Unknown Artist',
              lyrics: match.plainLyrics.trim(),
              source: 'LRCLIB'
            };
          }
        }
      } catch (err) {
        // Continue to next query attempt
      }
    }

    return null;
  }
}

module.exports = LyricsFetcher;
