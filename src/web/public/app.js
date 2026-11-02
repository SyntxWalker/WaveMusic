async function updateStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return;
    const data = await res.json();

    const statusElem = document.getElementById('stat-status');
    const pingElem = document.getElementById('stat-ping');
    const serversElem = document.getElementById('stat-servers');
    const playersElem = document.getElementById('stat-players');

    if (statusElem) statusElem.textContent = 'Online';
    if (pingElem) pingElem.textContent = `${data.ping || 0} ms`;
    if (serversElem) serversElem.textContent = data.guildCount || 0;
    if (playersElem) playersElem.textContent = `${data.activeStreams || 0} active`;

    if (data.clientId) {
      const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${data.clientId}&permissions=36768832&scope=bot%20applications.commands`;
      const topBtn = document.getElementById('invite-top-btn');
      const heroBtn = document.getElementById('invite-hero-btn');
      if (topBtn) topBtn.href = inviteUrl;
      if (heroBtn) heroBtn.href = inviteUrl;
    }
  } catch (err) {
    console.error('Failed to update stats:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateStats();
  setInterval(updateStats, 5000);
});
