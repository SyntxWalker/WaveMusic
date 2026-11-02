const { PermissionFlagsBits } = require('discord.js');

function hasPermission(channel, permission) {
  if (!channel || !channel.guild || !channel.permissionsFor) return true;
  const me = channel.guild.members.me;
  if (!me) return true;
  const perms = channel.permissionsFor(me);
  if (!perms) return true;
  return perms.has(permission);
}

class SafeMessenger {
  /**
   * Safely reply to a message handling potential Missing Permissions (EmbedLinks)
   */
  static async reply(message, payload) {
    const canEmbed = hasPermission(message.channel, PermissionFlagsBits.EmbedLinks);

    if (!canEmbed && payload.embeds && payload.embeds.length > 0) {
      // Convert embed to plain text representation
      const embed = payload.embeds[0];
      const data = embed.data || embed;
      let text = '';
      if (data.title) text += `**${data.title}**\n`;
      if (data.description) text += `${data.description}\n`;
      if (data.fields) {
        for (const f of data.fields) {
          text += `**${f.name}**: ${f.value}\n`;
        }
      }

      return await message.reply({
        content: text.trim() || 'Command processed.',
        components: payload.components || []
      });
    }

    try {
      return await message.reply(payload);
    } catch (err) {
      if (err.code === 50013) {
        // Fallback to minimal content
        return await message.reply({
          content: 'Command executed. (Please grant WaveMusic the "Embed Links" & "Attach Files" permission in this channel for rich visuals)',
          components: payload.components || []
        }).catch(() => {});
      }
      throw err;
    }
  }

  /**
   * Safely send message to a channel handling potential Missing Permissions
   */
  static async send(channel, payload) {
    const canEmbed = hasPermission(channel, PermissionFlagsBits.EmbedLinks);
    const canAttach = hasPermission(channel, PermissionFlagsBits.AttachFiles);

    // If payload has files but channel forbids AttachFiles
    if (payload.files && payload.files.length > 0 && !canAttach) {
      delete payload.files;
      if (canEmbed && payload.embeds && payload.embeds.length > 0) {
        // Strip attachment reference from embed
        payload.embeds[0].setImage(null);
        payload.embeds[0].setFooter({
          text: 'Enable "Attach Files" permission for WaveMusic to see the glassmorphism image card'
        });
      }
    }

    // If payload has embeds but channel forbids EmbedLinks
    if (payload.embeds && payload.embeds.length > 0 && !canEmbed) {
      const embed = payload.embeds[0];
      const data = embed.data || embed;
      let text = '';
      if (data.title) text += `**${data.title}**\n`;
      if (data.description) text += `${data.description}\n`;
      if (data.fields) {
        for (const f of data.fields) {
          text += `**${f.name}**: ${f.value}\n`;
        }
      }
      text += `\n*(Enable "Embed Links" & "Attach Files" in this channel for rich Miniplayer)*`;

      return await channel.send({
        content: text.trim(),
        components: payload.components || []
      });
    }

    try {
      return await channel.send(payload);
    } catch (err) {
      if (err.code === 50013) {
        return await channel.send({
          content: 'WaveMusic is playing! Please grant "Embed Links" & "Attach Files" permission to view the Miniplayer UI.',
          components: payload.components || []
        }).catch(() => {});
      }
      throw err;
    }
  }

  /**
   * Safely edit an existing message
   */
  static async edit(message, payload) {
    const canAttach = hasPermission(message.channel, PermissionFlagsBits.AttachFiles);
    if (payload.files && payload.files.length > 0 && !canAttach) {
      delete payload.files;
      if (payload.embeds && payload.embeds[0]) {
        payload.embeds[0].setImage(null);
      }
    }

    const canEmbed = hasPermission(message.channel, PermissionFlagsBits.EmbedLinks);
    if (payload.embeds && payload.embeds.length > 0 && !canEmbed) {
      const embed = payload.embeds[0];
      const data = embed.data || embed;
      let text = '';
      if (data.title) text += `**${data.title}**\n`;
      if (data.description) text += `${data.description}\n`;
      return await message.edit({
        content: text.trim(),
        embeds: [],
        files: [],
        components: payload.components || []
      }).catch(() => {});
    }

    try {
      return await message.edit(payload);
    } catch (err) {
      if (err.code === 50013) {
        return await message.edit({
          content: 'WaveMusic playback active. Grant "Embed Links" & "Attach Files" for full Miniplayer card.',
          embeds: [],
          files: [],
          components: payload.components || []
        }).catch(() => {});
      }
      throw err;
    }
  }
}

module.exports = SafeMessenger;
