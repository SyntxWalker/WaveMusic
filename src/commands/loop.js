const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'loop',
  description: 'Change the loop mode (off, track, queue)',
  aliases: ['repeat'],
  slashData: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set or toggle loop mode')
    .addStringOption(option =>
      option.setName('mode')
        .setDescription('Loop mode to set')
        .setRequired(false)
        .addChoices(
          { name: 'Off', value: 'off' },
          { name: 'Track (repeat current song)', value: 'track' },
          { name: 'Queue (repeat entire queue)', value: 'queue' }
        )
    ),

  async executeSlash(interaction, client) {
    const queue = client.music.get(interaction.guild.id);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('No track currently playing.')],
        ephemeral: true
      });
    }

    const chosenMode = interaction.options.getString('mode');
    const newMode = chosenMode ? queue.setLoop(chosenMode) : queue.cycleLoop();

    const modeLabels = {
      off: 'Off',
      track: 'Current Track',
      queue: 'Entire Queue'
    };

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.primary)
          .setDescription(`Loop mode set to: **${modeLabels[newMode]}**`)
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

    const arg = args[0]?.toLowerCase();
    let newMode;
    if (['off', 'none'].includes(arg)) {
      newMode = queue.setLoop('off');
    } else if (['track', 'song', 'current', '1'].includes(arg)) {
      newMode = queue.setLoop('track');
    } else if (['queue', 'all', 'q'].includes(arg)) {
      newMode = queue.setLoop('queue');
    } else {
      newMode = queue.cycleLoop();
    }

    const modeLabels = {
      off: 'Off',
      track: 'Current Track',
      queue: 'Entire Queue'
    };

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.primary)
          .setDescription(`Loop mode set to: **${modeLabels[newMode]}**`)
      ]
    });
  }
};
