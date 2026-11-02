const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const config = require('../config');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const guildPrefix = (db.getPrefix(message.guild.id) || config.defaultPrefix || '!').trim();
    const content = message.content.trim();

    // Check if bot was mentioned alone
    const mentionAloneRegex = new RegExp(`^<@!?${client.user.id}>$`);
    if (mentionAloneRegex.test(content)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.primary)
            .setAuthor({ name: 'W A V E M U S I C', iconURL: client.user.displayAvatarURL() })
            .setTitle('WaveMusic Hi-Fi Assistant')
            .setDescription(
              `My prefix in **${message.guild.name}** is: \`${guildPrefix}\`\n\n` +
              `**Example commands:**\n` +
              `• \`${guildPrefix}play <song or link>\`\n` +
              `• \`${guildPrefix}search <song name>\`\n` +
              `• \`${guildPrefix}247\` (locks in voice channel)\n` +
              `• \`${guildPrefix}lyrics [song]\`\n` +
              `• \`${guildPrefix}prefix <new>\` (change prefix)\n\n` +
              `*You can also use Discord Slash Commands (\`/play\`) or tag me as a prefix (\`@WaveMusic play ...\`).*`
            )
            .setFooter({ text: 'Lossless 48kHz Studio Audio' })
        ]
      });
    }

    let commandString = '';
    const mentionPrefixRegex = new RegExp(`^<@!?${client.user.id}>\\s*`, 'i');

    if (content.toLowerCase().startsWith(guildPrefix.toLowerCase())) {
      commandString = content.slice(guildPrefix.length).trim();
    } else if (mentionPrefixRegex.test(content)) {
      commandString = content.replace(mentionPrefixRegex, '').trim();
    } else {
      return;
    }

    if (!commandString) return;

    const args = commandString.split(/ +/);
    const commandName = args.shift().toLowerCase();
    if (!commandName) return;

    // Search command by primary name or alias
    const command =
      client.commands.get(commandName) ||
      client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command || !command.executePrefix) return;

    try {
      await command.executePrefix(message, args, client);
    } catch (err) {
      console.error(`[Prefix Execution Error - ${commandName}]:`, err);
      message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription(`Error executing command: ${err.message}`)
        ]
      }).catch(() => {});
    }
  }
};
