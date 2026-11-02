const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const config = require('../config');

module.exports = {
  name: 'prefix',
  description: 'View or change the command prefix for this server',
  aliases: ['setprefix'],
  slashData: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('View or change the bot prefix for this server')
    .addStringOption(option =>
      option.setName('new_prefix')
        .setDescription('The new prefix (1 to 5 characters)')
        .setRequired(false)
    ),

  async executeSlash(interaction, client) {
    const newPrefix = interaction.options.getString('new_prefix');
    const currentPrefix = db.getPrefix(interaction.guild.id);

    if (!newPrefix) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.primary)
            .setAuthor({ name: 'W A V E M U S I C   •   P R E F I X' })
            .setTitle('Server Prefix Configuration')
            .setDescription(`The current prefix for this server is: \`${currentPrefix}\`\n\nTo change it, use: \`/prefix new_prefix:<symbol>\``)
            .setFooter({ text: 'Slash commands (/) are also always available!' })
        ]
      });
    }

    // Check permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('You need the **Manage Server** permission to change the prefix.')
        ],
        ephemeral: true
      });
    }

    if (newPrefix.length > 5 || newPrefix.includes(' ')) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('Prefix must be between 1 and 5 characters and cannot contain spaces.')
        ],
        ephemeral: true
      });
    }

    db.setPrefix(interaction.guild.id, newPrefix);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.success)
          .setAuthor({ name: 'W A V E M U S I C   •   P R E F I X' })
          .setTitle('Prefix Updated Successfully')
          .setDescription(`The prefix has been changed to: \`${newPrefix}\`\n\nExample command: \`${newPrefix}play Blinding Lights\``)
          .setFooter({ text: 'Slash commands (/) remain functional' })
          .setTimestamp()
      ]
    });
  },

  async executePrefix(message, args, client) {
    const currentPrefix = db.getPrefix(message.guild.id);

    if (!args.length) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.primary)
            .setAuthor({ name: 'W A V E M U S I C   •   P R E F I X' })
            .setTitle('Server Prefix Configuration')
            .setDescription(`The current prefix for this server is: \`${currentPrefix}\`\n\nTo change it, use: \`${currentPrefix}prefix <new_prefix>\``)
            .setFooter({ text: 'Slash commands (/) are also always available!' })
        ]
      });
    }

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('You need the **Manage Server** permission to change the prefix.')
        ]
      });
    }

    const newPrefix = args[0];
    if (newPrefix.length > 5) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('Prefix must be between 1 and 5 characters.')
        ]
      });
    }

    db.setPrefix(message.guild.id, newPrefix);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.success)
          .setAuthor({ name: 'W A V E M U S I C   •   P R E F I X' })
          .setTitle('Prefix Updated Successfully')
          .setDescription(`The prefix has been changed to: \`${newPrefix}\`\n\nExample command: \`${newPrefix}play Blinding Lights\``)
          .setFooter({ text: 'Slash commands (/) remain functional' })
          .setTimestamp()
      ]
    });
  }
};
