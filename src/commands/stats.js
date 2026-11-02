const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const os = require('os');
const config = require('../config');

function formatUptime(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

module.exports = {
  name: 'stats',
  description: 'View WaveMusic system and performance statistics',
  aliases: ['botinfo', 'ping'],
  slashData: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View WaveMusic performance statistics'),

  async executeSlash(interaction, client) {
    const embed = this.buildStatsEmbed(client);
    return interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args, client) {
    const embed = this.buildStatsEmbed(client);
    return message.reply({ embeds: [embed] });
  },

  buildStatsEmbed(client) {
    const activeQueues = client.music.queues.filter(q => q.currentTrack).size;
    const totalQueues = client.music.queues.size;
    const memUsedMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
    const uptimeStr = formatUptime(client.uptime || 0);

    return new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({
        name: 'W A V E M U S I C   •   S Y S T E M   S T A T S',
        iconURL: client.user.displayAvatarURL()
      })
      .setTitle('Real-Time Performance Dashboard')
      .addFields(
        { name: 'Gateway Latency', value: `\`${Math.round(client.ws.ping)} ms\``, inline: true },
        { name: 'Active Streamers', value: `\`${activeQueues} playing / ${totalQueues} connected\``, inline: true },
        { name: 'Guilds / Servers', value: `\`${client.guilds.cache.size}\``, inline: true },
        { name: 'Memory Consumption', value: `\`${memUsedMB} MB\``, inline: true },
        { name: 'Audio Engine', value: `\`48kHz Opus / Stereo\``, inline: true },
        { name: 'System Uptime', value: `\`${uptimeStr}\``, inline: true }
      )
      .setFooter({ text: 'WaveMusic Full-Stack Architecture' })
      .setTimestamp();
  }
};
