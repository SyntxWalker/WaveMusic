const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'resume',
  description: 'Resume paused playback',
  slashData: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume paused playback'),

  async executeSlash(interaction, client) {
    const queue = client.music.get(interaction.guild.id);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('No track currently playing.')],
        ephemeral: true
      });
    }

    if (!queue.paused) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription('Playback is not paused.')],
        ephemeral: true
      });
    }

    queue.resume();
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription('Resumed playback.')]
    });
  },

  async executePrefix(message, args, client) {
    const queue = client.music.get(message.guild.id);
    if (!queue || !queue.currentTrack) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('No track currently playing.')]
      });
    }

    if (!queue.paused) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription('Playback is not paused.')]
      });
    }

    queue.resume();
    return message.reply({
      embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription('Resumed playback.')]
    });
  }
};
