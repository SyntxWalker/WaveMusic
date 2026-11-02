const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'queue',
  description: 'Display the server music queue',
  aliases: ['q', 'list'],
  slashData: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('View upcoming songs in the queue'),

  async executeSlash(interaction, client) {
    const queue = client.music.get(interaction.guild.id);
    if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.primary).setDescription('The queue is currently empty.')],
        ephemeral: true
      });
    }

    await this.sendPaginatedQueue(interaction, queue, true);
  },

  async executePrefix(message, args, client) {
    const queue = client.music.get(message.guild.id);
    if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.primary).setDescription('The queue is currently empty.')]
      });
    }

    await this.sendPaginatedQueue(message, queue, false);
  },

  async sendPaginatedQueue(context, queue, isSlash) {
    const tracks = queue.tracks;
    const itemsPerPage = 8;
    const totalPages = Math.max(1, Math.ceil(tracks.length / itemsPerPage));
    let currentPage = 0;

    const buildEmbed = (page) => {
      const start = page * itemsPerPage;
      const end = start + itemsPerPage;
      const current = queue.currentTrack;

      let description = '';
      if (current) {
        description += `**Now Playing:**\n[${current.title}](${current.url || '#'}) \`[${current.durationFormatted}]\` • Requested by <@${current.requestedBy?.id}>\n\n`;
      }

      description += '**Up Next:**\n';
      if (tracks.length === 0) {
        description += '*No upcoming tracks in queue.*';
      } else {
        const slice = tracks.slice(start, end);
        description += slice
          .map((t, i) => `\`${start + i + 1}.\` [${t.title}](${t.url || '#'}) \`[${t.durationFormatted}]\` • <@${t.requestedBy?.id}>`)
          .join('\n');
      }

      return new EmbedBuilder()
        .setColor(config.colors.primary)
        .setAuthor({ name: 'W A V E M U S I C   •   Q U E U E' })
        .setTitle(`Server Music Queue (${tracks.length + (current ? 1 : 0)} total)`)
        .setDescription(description)
        .setFooter({
          text: `Page ${page + 1} of ${totalPages} • Loop: ${queue.loopMode.toUpperCase()} • 24/7: ${queue.mode247 ? 'ON' : 'OFF'}`
        })
        .setTimestamp();
    };

    const buildButtons = (page) => {
      if (totalPages <= 1) return [];
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('q_prev')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId('q_next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === totalPages - 1)
        )
      ];
    };

    let replyMsg;
    if (isSlash) {
      replyMsg = await context.reply({
        embeds: [buildEmbed(0)],
        components: buildButtons(0),
        fetchReply: true
      });
    } else {
      replyMsg = await context.reply({
        embeds: [buildEmbed(0)],
        components: buildButtons(0)
      });
    }

    if (totalPages <= 1) return;

    const userId = isSlash ? context.user.id : context.author.id;
    const collector = replyMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === userId,
      time: 60000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'q_prev' && currentPage > 0) {
        currentPage--;
      } else if (interaction.customId === 'q_next' && currentPage < totalPages - 1) {
        currentPage++;
      }
      await interaction.update({
        embeds: [buildEmbed(currentPage)],
        components: buildButtons(currentPage)
      });
    });

    collector.on('end', () => {
      replyMsg.edit({ components: [] }).catch(() => {});
    });
  }
};
