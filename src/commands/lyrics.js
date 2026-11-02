const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const LyricsFetcher = require('../audio/lyrics');
const config = require('../config');

function chunkLyrics(text, chunkSize = 3500) {
  if (text.length <= chunkSize) return [text];
  const lines = text.split('\n');
  const chunks = [];
  let currentChunk = '';

  for (const line of lines) {
    if ((currentChunk + '\n' + line).length > chunkSize) {
      chunks.push(currentChunk.trim());
      currentChunk = line;
    } else {
      currentChunk += '\n' + line;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

module.exports = {
  name: 'lyrics',
  description: 'Fetch lyrics for the current song or a specific search query',
  aliases: ['ly'],
  slashData: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Fetch lyrics for the current or specified song')
    .addStringOption(option =>
      option.setName('song')
        .setDescription('Song title to search (leave empty for current playing track)')
        .setRequired(false)
    ),

  async executeSlash(interaction, client) {
    const queue = client.music.get(interaction.guild.id);
    const query = interaction.options.getString('song');
    let titleToSearch = query;
    let artistToSearch = '';

    if (!titleToSearch) {
      if (!queue || !queue.currentTrack) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.warning)
              .setDescription('No song is currently playing. Please provide a song name: `/lyrics song:Blinding Lights`')
          ],
          ephemeral: true
        });
      }
      titleToSearch = queue.currentTrack.title;
      artistToSearch = queue.currentTrack.author;
    }

    await interaction.deferReply();

    const data = await LyricsFetcher.getLyrics(titleToSearch, artistToSearch);
    if (!data || !data.lyrics) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription(`No lyrics found for **${titleToSearch}**.`)
        ]
      });
    }

    await this.sendPaginatedLyrics(interaction, data, true);
  },

  async executePrefix(message, args, client) {
    const queue = client.music.get(message.guild.id);
    let titleToSearch = args.join(' ');
    let artistToSearch = '';

    if (!titleToSearch) {
      if (!queue || !queue.currentTrack) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.warning)
              .setDescription('No song is currently playing. Please provide a song name: `!lyrics Blinding Lights`')
          ]
        });
      }
      titleToSearch = queue.currentTrack.title;
      artistToSearch = queue.currentTrack.author;
    }

    const waitMsg = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.primary)
          .setDescription(`Fetching lyrics for **${titleToSearch}**...`)
      ]
    });

    const data = await LyricsFetcher.getLyrics(titleToSearch, artistToSearch);
    if (!data || !data.lyrics) {
      return waitMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription(`No lyrics found for **${titleToSearch}**.`)
        ]
      });
    }

    await this.sendPaginatedLyrics(waitMsg, data, false, message.author.id);
  },

  async sendPaginatedLyrics(context, data, isSlash, authorId = null) {
    const pages = chunkLyrics(data.lyrics, 3500);
    let currentPage = 0;

    const buildEmbed = (pageIndex) => {
      return new EmbedBuilder()
        .setColor(config.colors.primary)
        .setAuthor({ name: `W A V E M U S I C   •   L Y R I C S` })
        .setTitle(`${data.title} — ${data.artist}`)
        .setDescription(pages[pageIndex])
        .setFooter({
          text: `Page ${pageIndex + 1} of ${pages.length} • Source: ${data.source}`
        })
        .setTimestamp();
    };

    const buildButtons = (pageIndex) => {
      if (pages.length <= 1) return [];
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('lyrics_prev')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pageIndex === 0),
          new ButtonBuilder()
            .setCustomId('lyrics_next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pageIndex === pages.length - 1)
        )
      ];
    };

    let replyMsg;
    if (isSlash) {
      replyMsg = await context.editReply({
        embeds: [buildEmbed(0)],
        components: buildButtons(0)
      });
    } else {
      replyMsg = await context.edit({
        embeds: [buildEmbed(0)],
        components: buildButtons(0)
      });
    }

    if (pages.length <= 1) return;

    const userId = isSlash ? context.user.id : authorId;
    const collector = replyMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === userId,
      time: 120000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'lyrics_prev' && currentPage > 0) {
        currentPage--;
      } else if (interaction.customId === 'lyrics_next' && currentPage < pages.length - 1) {
        currentPage++;
      }
      await interaction.update({
        embeds: [buildEmbed(currentPage)],
        components: buildButtons(currentPage)
      });
    });

    collector.on('end', () => {
      if (isSlash) {
        context.editReply({ components: [] }).catch(() => {});
      } else {
        context.edit({ components: [] }).catch(() => {});
      }
    });
  }
};
