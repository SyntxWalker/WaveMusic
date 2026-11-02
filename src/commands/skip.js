const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'skip',
  description: 'Skip to the next song in the queue',
  aliases: ['s', 'next'],
  slashData: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip to the next song in queue'),

  async executeSlash(interaction, client) {
    const queue = client.music.get(interaction.guild.id);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('No track currently playing.')],
        ephemeral: true
      });
    }

    const title = queue.currentTrack.title;
    queue.skip();

    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(config.colors.primary).setDescription(`Skipped **${title}**`)]
    });
  },

  async executePrefix(message, args, client) {
    const queue = client.music.get(message.guild.id);
    if (!queue || !queue.currentTrack) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('No track currently playing.')]
      });
    }

    const title = queue.currentTrack.title;
    queue.skip();

    return message.reply({
      embeds: [new EmbedBuilder().setColor(config.colors.primary).setDescription(`Skipped **${title}**`)]
    });
  }
};
