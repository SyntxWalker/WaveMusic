const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'pause',
  description: 'Pause the currently playing track',
  slashData: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the currently playing track'),

  async executeSlash(interaction, client) {
    const queue = client.music.get(interaction.guild.id);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('No track currently playing.')],
        ephemeral: true
      });
    }

    if (queue.paused) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription('Playback is already paused.')],
        ephemeral: true
      });
    }

    queue.pause();
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(config.colors.primary).setDescription('Paused playback.')]
    });
  },

  async executePrefix(message, args, client) {
    const queue = client.music.get(message.guild.id);
    if (!queue || !queue.currentTrack) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('No track currently playing.')]
      });
    }

    if (queue.paused) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription('Playback is already paused.')]
      });
    }

    queue.pause();
    return message.reply({
      embeds: [new EmbedBuilder().setColor(config.colors.primary).setDescription('Paused playback.')]
    });
  }
};
