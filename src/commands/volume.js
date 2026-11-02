const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'volume',
  description: 'Adjust playback volume (0% - 150%)',
  aliases: ['vol', 'v'],
  slashData: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Adjust the playback volume (0 to 150)')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Volume level between 0 and 150')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(150)
    ),

  async executeSlash(interaction, client) {
    const queue = client.music.get(interaction.guild.id);
    if (!queue) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('WaveMusic is not playing any audio right now.')],
        ephemeral: true
      });
    }

    const amount = interaction.options.getInteger('amount');
    if (amount === null) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.primary).setDescription(`Current playback volume: **${queue.volume}%**`)]
      });
    }

    const newVol = queue.setVolume(amount);
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(`Volume set to **${newVol}%**`)]
    });
  },

  async executePrefix(message, args, client) {
    const queue = client.music.get(message.guild.id);
    if (!queue) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('WaveMusic is not playing any audio right now.')]
      });
    }

    if (!args.length) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.primary).setDescription(`Current playback volume: **${queue.volume}%**`)]
      });
    }

    const amount = parseInt(args[0], 10);
    if (isNaN(amount) || amount < 0 || amount > 150) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription('Please provide a valid volume between 0 and 150.')]
      });
    }

    const newVol = queue.setVolume(amount);
    return message.reply({
      embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(`Volume set to **${newVol}%**`)]
    });
  }
};
