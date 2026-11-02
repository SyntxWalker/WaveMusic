const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'shuffle',
  description: 'Randomly shuffle the upcoming songs in the queue',
  aliases: ['sh'],
  slashData: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle the upcoming songs in the queue'),

  async executeSlash(interaction, client) {
    const queue = client.music.get(interaction.guild.id);
    if (!queue || queue.tracks.length < 2) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription('You need at least 2 songs in the queue to shuffle.')],
        ephemeral: true
      });
    }

    queue.shuffle();
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(`Shuffled **${queue.tracks.length}** songs in queue.`)]
    });
  },

  async executePrefix(message, args, client) {
    const queue = client.music.get(message.guild.id);
    if (!queue || queue.tracks.length < 2) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription('You need at least 2 songs in the queue to shuffle.')]
      });
    }

    queue.shuffle();
    return message.reply({
      embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(`Shuffled **${queue.tracks.length}** songs in queue.`)]
    });
  }
};
