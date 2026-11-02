const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const config = require('../config');

module.exports = {
  name: '247',
  description: 'Toggle 24/7 mode to keep WaveMusic locked into your voice channel',
  aliases: ['24/7', 'stay', 'lock'],
  slashData: new SlashCommandBuilder()
    .setName('247')
    .setDescription('Toggle 24/7 mode to lock WaveMusic in your voice channel'),

  async executeSlash(interaction, client) {
    const member = interaction.member;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('You must join the voice channel where you want WaveMusic locked in 24/7.')
        ],
        ephemeral: true
      });
    }

    const queue = client.music.getOrCreate(interaction.guild, interaction.channel);
    if (!queue.connection) {
      await queue.connect(voiceChannel);
    }

    const newState = !queue.mode247;
    queue.set247(newState, voiceChannel);

    const embed = new EmbedBuilder()
      .setColor(newState ? config.colors.success : config.colors.secondary)
      .setAuthor({ name: 'W A V E M U S I C   •   2 4 / 7   M O D E' })
      .setTitle(newState ? '24/7 Mode Enabled' : '24/7 Mode Disabled')
      .setDescription(
        newState
          ? `WaveMusic is now **locked in** to <#${voiceChannel.id}> 24/7.\nThe bot will not disconnect even after songs finish or everyone leaves.`
          : `24/7 mode disabled. WaveMusic will now automatically disconnect after inactivity.`
      )
      .setFooter({ text: 'Status is saved across bot restarts' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args, client) {
    const member = message.member;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('You must join the voice channel where you want WaveMusic locked in 24/7.')
        ]
      });
    }

    const queue = client.music.getOrCreate(message.guild, message.channel);
    if (!queue.connection) {
      await queue.connect(voiceChannel);
    }

    const newState = !queue.mode247;
    queue.set247(newState, voiceChannel);

    const embed = new EmbedBuilder()
      .setColor(newState ? config.colors.success : config.colors.secondary)
      .setAuthor({ name: 'W A V E M U S I C   •   2 4 / 7   M O D E' })
      .setTitle(newState ? '24/7 Mode Enabled' : '24/7 Mode Disabled')
      .setDescription(
        newState
          ? `WaveMusic is now **locked in** to <#${voiceChannel.id}> 24/7.\nThe bot will not disconnect even after songs finish or everyone leaves.`
          : `24/7 mode disabled. WaveMusic will now automatically disconnect after inactivity.`
      )
      .setFooter({ text: 'Status is saved across bot restarts' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
