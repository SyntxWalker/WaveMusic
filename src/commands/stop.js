const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'stop',
  description: 'Stop music playback and clear the queue',
  aliases: ['leave', 'dc', 'disconnect'],
  slashData: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop music playback and clear the queue'),

  async executeSlash(interaction, client) {
    const queue = client.music.get(interaction.guild.id);
    if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription('WaveMusic is not playing any music.')],
        ephemeral: true
      });
    }

    queue.stop();
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.error)
          .setDescription(
            queue.mode247
              ? 'Stopped playback and cleared queue. (Staying in VC because 24/7 mode is active)'
              : 'Stopped playback, cleared queue, and disconnected.'
          )
      ]
    });
  },

  async executePrefix(message, args, client) {
    const queue = client.music.get(message.guild.id);
    if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription('WaveMusic is not playing any music.')]
      });
    }

    queue.stop();
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.error)
          .setDescription(
            queue.mode247
              ? 'Stopped playback and cleared queue. (Staying in VC because 24/7 mode is active)'
              : 'Stopped playback, cleared queue, and disconnected.'
          )
      ]
    });
  }
};
