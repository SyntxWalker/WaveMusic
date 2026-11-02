const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const MiniplayerUI = require('../ui/miniplayer');
const config = require('../config');

module.exports = {
  name: 'nowplaying',
  description: 'Display the glassmorphic image Miniplayer for the current song',
  aliases: ['np', 'current'],
  slashData: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Display the glassmorphic image Miniplayer for the current song'),

  async executeSlash(interaction, client) {
    const queue = client.music.get(interaction.guild.id);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('No song is currently playing.')],
        ephemeral: true
      });
    }

    await interaction.deferReply();
    const payload = await MiniplayerUI.buildMessagePayload(queue, queue.currentTrack, queue.getCurrentPlaybackSeconds());
    return interaction.editReply(payload);
  },

  async executePrefix(message, args, client) {
    const queue = client.music.get(message.guild.id);
    if (!queue || !queue.currentTrack) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('No song is currently playing.')]
      });
    }

    const payload = await MiniplayerUI.buildMessagePayload(queue, queue.currentTrack, queue.getCurrentPlaybackSeconds());
    return message.reply(payload);
  }
};
