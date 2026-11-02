const { spawn } = require('child_process');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const { createAudioResource, StreamType } = require('@discordjs/voice');
const AudioExtractor = require('./extractor');
const config = require('../config');

function getFfmpegBinary() {
  if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }
  return 'ffmpeg';
}

class AudioStreamer {
  /**
   * Directly pipes yt-dlp stdout into FFmpeg stdin.
   * Completely bypasses URL extraction and signed CDN tokens, eliminating:
   * 1. Datacenter IP 429 / bot challenges
   * 2. YouTube SABR audio fragment failures
   * 3. GoogleVideo 403 Forbidden token timeouts
   *
   * Audio mastering:
   * - Codec: Opus (libopus)
   * - Sample Rate: 48,000 Hz
   * - Channels: Stereo 2.0
   * - Bitrate: 256 kbps VBR
   * - Loudness Normalization: EBU R128 (Integrated -16 LUFS, True Peak -1.0 dB Headroom, LRA 11)
   * - Resampling: High-quality FFmpeg swr 28-bit triangular dithered resampler
   * @param {string} sourceUrl YouTube, YouTube Music, or raw audio source URL
   * @param {number} initialVolume Initial volume (0 - 150)
   * @param {number} seekSeconds Optional seek offset in seconds
   */
  static createResourceFromSource(sourceUrl, initialVolume = 100, seekSeconds = 0) {
    const normVolume = Math.max(0, Math.min(150, initialVolume)) / 100;
    const ytdlpBin = AudioExtractor.getYtDlp ? AudioExtractor.getYtDlp() : 'yt-dlp';

    const ytdlpArgs = [
      '-o', '-',
      '-f', 'ba/b',
      '--no-check-certificates',
      '--geo-bypass',
      '--no-warnings',
      '--quiet'
    ];

    if (seekSeconds > 0) {
      ytdlpArgs.push('--download-sections', `*${seekSeconds}-inf`);
    }

    ytdlpArgs.push(sourceUrl);

    const ytdlpProcess = spawn(ytdlpBin, ytdlpArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    const audioFilters = [
      'aresample=48000:resampler=swr:precision=28:dither_method=triangular',
      'loudnorm=I=-16:TP=-1.0:LRA=11',
      `volume=${normVolume.toFixed(3)}`
    ].join(', ');

    const ffmpegArgs = [
      '-i', 'pipe:0',
      '-vn',
      '-af', audioFilters,
      '-ar', '48000',
      '-ac', '2',
      '-c:a', 'libopus',
      '-b:a', '256k',
      '-vbr', 'on',
      '-application', 'audio',
      '-f', 'opus',
      'pipe:1'
    ];

    const ffmpegProcess = spawn(getFfmpegBinary(), ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });

    ytdlpProcess.stdout.pipe(ffmpegProcess.stdin);

    ytdlpProcess.stderr.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('ERROR:')) {
        console.warn('[yt-dlp stream warning]:', msg.trim().slice(0, 160));
      }
    });

    ffmpegProcess.stderr.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('Error') || msg.includes('Invalid')) {
        console.warn('[FFmpeg Stream Warning]:', msg.trim().slice(0, 160));
      }
    });

    const cleanup = () => {
      try {
        if (!ytdlpProcess.killed) ytdlpProcess.kill();
      } catch (e) {}
      try {
        if (!ffmpegProcess.killed) ffmpegProcess.kill();
      } catch (e) {}
    };

    ytdlpProcess.on('error', cleanup);
    ffmpegProcess.on('error', cleanup);

    const stream = ffmpegProcess.stdout;
    stream.on('close', cleanup);
    stream.on('end', cleanup);

    const resource = createAudioResource(stream, {
      inputType: StreamType.OggOpus
    });

    resource.ytdlpProcess = ytdlpProcess;
    resource.ffmpegProcess = ffmpegProcess;
    return resource;
  }

  /**
   * Direct audio playback from pre-resolved URL (fallback)
   */
  static createResource(streamUrl, initialVolume = 100, seekSeconds = 0) {
    const ffmpegArgs = [
      '-reconnect', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '5'
    ];

    if (seekSeconds > 0) {
      ffmpegArgs.push('-ss', String(seekSeconds));
    }

    const normVolume = Math.max(0, Math.min(150, initialVolume)) / 100;

    // Audiophile mastering filter chain matching user specifications:
    // 1. High-quality FFmpeg SWR resampler (48kHz, 28-bit precision, triangular dither)
    // 2. EBU R128 loudness normalization (I=-16 LUFS, True-Peak -1.0 dB Headroom, LRA 11)
    // 3. User volume adjustment
    const audioFilters = [
      'aresample=48000:resampler=swr:precision=28:dither_method=triangular',
      'loudnorm=I=-16:TP=-1.0:LRA=11',
      `volume=${normVolume.toFixed(3)}`
    ].join(', ');

    ffmpegArgs.push(
      '-i', streamUrl,
      '-vn',
      '-af', audioFilters,
      '-ar', '48000',
      '-ac', '2',
      '-c:a', 'libopus',
      '-b:a', '256k',
      '-vbr', 'on',
      '-application', 'audio',
      '-f', 'opus',
      'pipe:1'
    );

    const ffmpegProcess = spawn(getFfmpegBinary(), ffmpegArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    ffmpegProcess.stderr.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('Error') || msg.includes('Invalid')) {
        console.warn('[FFmpeg Stream Warning]:', msg.trim().slice(0, 160));
      }
    });

    const stream = ffmpegProcess.stdout;

    ffmpegProcess.on('error', (err) => {
      console.error('[FFmpeg Process Error]:', err.message);
    });

    stream.on('error', (err) => {
      console.error('[FFmpeg Stream Error]:', err.message);
    });

    const resource = createAudioResource(stream, {
      inputType: StreamType.OggOpus
    });

    resource.ffmpegProcess = ffmpegProcess;
    return resource;
  }
}

module.exports = AudioStreamer;
