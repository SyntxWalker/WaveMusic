const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');

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

function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let str = text;
  while (str.length > 0 && ctx.measureText(str + '...').width > maxWidth) {
    str = str.slice(0, -1);
  }
  return str + '...';
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

let cachedLogo = null;
async function getLogoImage() {
  if (cachedLogo) return cachedLogo;
  const logoPath = path.join(__dirname, '../assets/logo.png');
  if (fs.existsSync(logoPath)) {
    try {
      cachedLogo = await loadImage(logoPath);
      return cachedLogo;
    } catch (e) {}
  }
  return null;
}

class CardGenerator {
  /**
   * Generates a sleek, transparent, glassmorphic Miniplayer card as an image buffer
   */
  static async renderMiniplayer(queue, track, currentSec = 0) {
    const width = 960;
    const height = 370;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const totalSec = track.duration || 0;
    const progress = totalSec > 0 ? Math.min(Math.max(currentSec / totalSec, 0), 1) : 0;
    const isPaused = queue.paused;
    const loopMode = queue.loopMode; // 'off' | 'track' | 'queue'
    const is247 = queue.mode247;
    const volume = queue.volume || 100;

    // Load track cover art if available
    let coverImg = null;
    if (track.thumbnail) {
      try {
        coverImg = await loadImage(track.thumbnail);
      } catch (e) {
        // Fallback to null
      }
    }

    // 1. Draw Background Glass & Blurred Ambient Cover Art
    ctx.save();
    drawRoundedRect(ctx, 0, 0, width, height, 24);
    ctx.clip();

    // Dark base
    ctx.fillStyle = '#08070D';
    ctx.fillRect(0, 0, width, height);

    if (coverImg) {
      // Draw cover art large and blurred for glass reflection
      ctx.globalAlpha = 0.22;
      ctx.drawImage(coverImg, -50, -50, width + 100, height + 100);
      ctx.globalAlpha = 1.0;
    }

    // Glass gradient overlay
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, 'rgba(14, 11, 24, 0.88)');
    bgGradient.addColorStop(0.5, 'rgba(8, 7, 14, 0.93)');
    bgGradient.addColorStop(1, 'rgba(18, 14, 30, 0.90)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle violet ambient flare
    const radial = ctx.createRadialGradient(200, 200, 10, 200, 200, 400);
    radial.addColorStop(0, 'rgba(139, 92, 246, 0.18)');
    radial.addColorStop(1, 'transparent');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    // Inner frosted glass card container
    const inset = 16;
    drawRoundedRect(ctx, inset, inset, width - inset * 2, height - inset * 2, 18);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.fill();

    // Glass border stroke
    const borderGrad = ctx.createLinearGradient(0, 0, width, height);
    borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
    borderGrad.addColorStop(0.4, 'rgba(139, 92, 246, 0.35)');
    borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    // 2. Header: Logo, Branding & Status Pill
    const logo = await getLogoImage();
    if (logo) {
      ctx.save();
      drawRoundedRect(ctx, 42, 34, 34, 34, 8);
      ctx.clip();
      ctx.drawImage(logo, 42, 34, 34, 34);
      ctx.restore();
    }

    // Brand text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('W A V E M U S I C', logo ? 88 : 42, 56);

    // Status Pill
    let statusText = 'PLAYING';
    if (isPaused) statusText = 'PAUSED';
    else if (loopMode === 'track') statusText = 'LOOP: TRACK';
    else if (loopMode === 'queue') statusText = 'LOOP: QUEUE';

    const pillX = logo ? 260 : 210;
    ctx.save();
    drawRoundedRect(ctx, pillX, 39, 120, 24, 12);
    ctx.fillStyle = isPaused ? 'rgba(245, 158, 11, 0.15)' : 'rgba(139, 92, 246, 0.18)';
    ctx.fill();
    ctx.strokeStyle = isPaused ? 'rgba(245, 158, 11, 0.4)' : 'rgba(167, 139, 250, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = isPaused ? '#FBBF24' : '#C4B5FD';
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(statusText, pillX + 60, 55);
    ctx.textAlign = 'left';
    ctx.restore();

    // Top Right Studio Hi-Fi Badge
    const isSpotify = track.source === 'spotify';
    const badgeWidth = isSpotify ? 200 : 192;
    const badgeLabel = isSpotify ? 'SPOTIFY OPUS • 256k VBR' : 'STUDIO OPUS • 256k VBR';

    ctx.save();
    drawRoundedRect(ctx, width - (badgeWidth + 42), 39, badgeWidth, 24, 12);
    ctx.fillStyle = isSpotify ? 'rgba(29, 185, 84, 0.08)' : 'rgba(255, 255, 255, 0.04)';
    ctx.fill();
    ctx.strokeStyle = isSpotify ? 'rgba(29, 185, 84, 0.35)' : 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = isSpotify ? '#1DB954' : '#A78BFA';
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(badgeLabel, width - (badgeWidth + 42) + badgeWidth / 2, 55);
    ctx.textAlign = 'left';
    ctx.restore();

    // 3. Cover Artwork (x: 42, y: 92, w: 180, h: 180)
    const artX = 42;
    const artY = 92;
    const artSize = 180;

    ctx.save();
    // Drop shadow
    ctx.shadowColor = 'rgba(139, 92, 246, 0.45)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;
    drawRoundedRect(ctx, artX, artY, artSize, artSize, 16);
    ctx.fillStyle = '#12111A';
    ctx.fill();
    ctx.restore();

    ctx.save();
    drawRoundedRect(ctx, artX, artY, artSize, artSize, 16);
    ctx.clip();
    if (coverImg) {
      ctx.drawImage(coverImg, artX, artY, artSize, artSize);
    } else {
      // Clean fallback if no art
      ctx.fillStyle = '#1c182c';
      ctx.fillRect(artX, artY, artSize, artSize);
      ctx.fillStyle = '#8B5CF6';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('WAVE', artX + artSize / 2, artY + artSize / 2);
      ctx.textAlign = 'left';
    }
    // Subtle inner glass border around cover art
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 4. Track Details
    const contentX = 250;
    const maxTextW = 665;

    // Track Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const cleanTitle = truncateText(ctx, track.title || 'Unknown Track', maxTextW);
    ctx.fillText(cleanTitle, contentX, 130);

    // Track Artist
    ctx.fillStyle = '#A78BFA';
    ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const cleanArtist = truncateText(ctx, track.author || 'Unknown Artist', maxTextW);
    ctx.fillText(cleanArtist, contentX, 162);

    // 5. Progress Bar
    const barX = contentX;
    const barY = 205;
    const barW = maxTextW;
    const barH = 6;

    // Background track
    drawRoundedRect(ctx, barX, barY, barW, barH, 3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fill();

    // Filled bar
    const filledW = Math.max(8, barW * progress);
    drawRoundedRect(ctx, barX, barY, filledW, barH, 3);
    const progressGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    progressGrad.addColorStop(0, '#8B5CF6');
    progressGrad.addColorStop(1, '#C4B5FD');
    ctx.fillStyle = progressGrad;
    ctx.fill();

    // Handle (Circle)
    const handleX = barX + filledW;
    ctx.save();
    ctx.beginPath();
    ctx.arc(handleX, barY + barH / 2, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();

    // Time Stamps
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(formatDuration(currentSec), barX, barY + 26);

    const totalStr = formatDuration(totalSec);
    const totalW = ctx.measureText(totalStr).width;
    ctx.fillText(totalStr, barX + barW - totalW, barY + 26);

    // 6. Bottom Metadata Badges
    const badgeY = 292;
    const reqTag = track.requestedBy ? `@${track.requestedBy.tag?.split('#')[0] || track.requestedBy.id}` : 'User';

    // Badge 1: Source (Spotify Studio)
    let curBadgeX = contentX;
    if (track.source === 'spotify') {
      const srcText = 'Spotify Studio';
      this.drawMetaBadge(ctx, curBadgeX, badgeY, srcText, '#1DB954');
      curBadgeX += ctx.measureText(srcText).width + 24 + 12;
    }

    // Badge 2: Requester
    const bReqText = `Requested by: ${reqTag}`;
    this.drawMetaBadge(ctx, curBadgeX, badgeY, bReqText);
    curBadgeX += ctx.measureText(bReqText).width + 24 + 12;

    // Badge 3: Volume
    const bVolText = `Volume: ${volume}%`;
    this.drawMetaBadge(ctx, curBadgeX, badgeY, bVolText);
    curBadgeX += ctx.measureText(bVolText).width + 24 + 12;

    // Badge 4: Queue Count
    const queueLen = queue.tracks.length;
    const bQueueText = `Queue: ${queueLen} track${queueLen === 1 ? '' : 's'}`;
    this.drawMetaBadge(ctx, curBadgeX, badgeY, bQueueText);
    curBadgeX += ctx.measureText(bQueueText).width + 24 + 12;

    // Badge 5: 24/7 Mode
    if (is247) {
      this.drawMetaBadge(ctx, curBadgeX, badgeY, '24/7 Locked In', '#10B981');
    }

    return canvas.toBuffer('image/png');
  }

  static drawMetaBadge(ctx, x, y, text, accentColor = null) {
    ctx.save();
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const textW = ctx.measureText(text).width;
    const padX = 12;
    const badgeW = textW + padX * 2;
    const badgeH = 26;

    drawRoundedRect(ctx, x, y, badgeW, badgeH, 8);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fill();
    ctx.strokeStyle = accentColor ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.09)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = accentColor || '#CBD5E1';
    ctx.fillText(text, x + padX, y + 17);
    ctx.restore();
  }
}

module.exports = CardGenerator;
