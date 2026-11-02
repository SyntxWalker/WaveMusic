const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'clear',
  description: 'Clear all upcoming songs from the queue',
  aliases: ['cls'],
  slashData: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear all songs from the queue'),

  async executeSlash(interaction, client) {
    const queue = client.music.get(interaction.guild.id);
    if (!queue || queue.tracks.length === 0) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription('The queue is already empty.')],
        ephemeral: true
      });
    }

    const count = queue.tracks.length;
    queue.tracks = [];
    queue.updateMiniplayer();

    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(`Cleared **${count}** songs from the queue.`)]
    });
  },

  async executePrefix(message, args, client) {
    const queue = client.music.get(message.guild.id);
    if (!queue || queue.tracks.length === 0) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription('The queue is already empty.')]
      });
    }

    const count = queue.tracks.length;
    queue.tracks = [];
    queue.updateMiniplayer();

    return message.reply({
      embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(`Cleared **${count}** songs from the queue.`)]
    });
  }
};
