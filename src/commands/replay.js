const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'replay',
  description: 'Restart the currently playing song from the beginning',
  slashData: new SlashCommandBuilder()
    .setName('replay')
    .setDescription('Restart the currently playing song from the beginning'),

  async executeSlash(interaction, client) {
    const queue = client.music.get(interaction.guild.id);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('No track currently playing.')],
        ephemeral: true
      });
    }

    await queue.replay();
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.primary)
          .setDescription(`Replaying **${queue.currentTrack.title}** from the beginning.`)
      ]
    });
  },

  async executePrefix(message, args, client) {
    const queue = client.music.get(message.guild.id);
    if (!queue || !queue.currentTrack) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('No track currently playing.')]
      });
    }

    await queue.replay();
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.primary)
          .setDescription(`Replaying **${queue.currentTrack.title}** from the beginning.`)
      ]
    });
  }
};
