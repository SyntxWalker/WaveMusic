const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType
} = require('discord.js');
const AudioExtractor = require('../audio/extractor');
const config = require('../config');

module.exports = {
  name: 'search',
  description: 'Search for songs and choose which one to play',
  aliases: ['find'],
  slashData: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for songs and pick one to play')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Song title or keywords')
        .setRequired(true)
    ),

  async executeSlash(interaction, client) {
    const member = interaction.member;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('You must be in a voice channel to search and play music.')
        ],
        ephemeral: true
      });
    }

    const query = interaction.options.getString('query');
    await interaction.deferReply();

    try {
      const results = await AudioExtractor.search(query, 5);
      if (!results.length) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.warning)
              .setDescription(`No tracks found for **${query}**.`)
          ]
        });
      }

      await this.handleSearchSelection(interaction, member, voiceChannel, results, client, true);
    } catch (err) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription(`Search failed: ${err.message}`)
        ]
      });
    }
  },

  async executePrefix(message, args, client) {
    const member = message.member;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('You must be in a voice channel to search and play music.')
        ]
      });
    }

    if (!args.length) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription('Please provide keywords to search. Example: `!search Starboy`')
        ]
      });
    }

    const query = args.join(' ');
    const searchMsg = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.primary)
          .setDescription(`Searching Spotify for **${query}**...`)
      ]
    });

    try {
      const results = await AudioExtractor.search(query, 5);
      if (!results.length) {
        return searchMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.warning)
              .setDescription(`No tracks found for **${query}**.`)
          ]
        });
      }

      await this.handleSearchSelection(searchMsg, member, voiceChannel, results, client, false);
    } catch (err) {
      return searchMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription(`Search failed: ${err.message}`)
        ]
      });
    }
  },

  async handleSearchSelection(context, member, voiceChannel, results, client, isSlash) {
    const descriptionList = results
      .map((r, i) => `\`${i + 1}.\` **[${r.title}](${r.url || 'https://open.spotify.com'})**\n     Artist: ${r.author} • Duration: \`${r.durationFormatted}\``)
      .join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: 'W A V E M U S I C   •   S P O T I F Y   S E A R C H' })
      .setTitle('Select a Track to Play')
      .setDescription(descriptionList)
      .setFooter({ text: 'Selection expires in 60 seconds • Pick an option below' });

    const menuOptions = results.map((r, i) => ({
      label: r.title.length > 95 ? `${r.title.slice(0, 92)}...` : r.title,
      description: `${r.author} (${r.durationFormatted})`.slice(0, 100),
      value: String(i)
    }));

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('wm_search_select')
        .setPlaceholder('Choose a track from the list...')
        .addOptions(menuOptions)
    );

    let responseMsg;
    if (isSlash) {
      responseMsg = await context.editReply({ embeds: [embed], components: [menu] });
    } else {
      responseMsg = await context.edit({ embeds: [embed], components: [menu] });
    }

    const collector = responseMsg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: (i) => i.user.id === member.id,
      time: 60000,
      max: 1
    });

    collector.on('collect', async (interaction) => {
      // Immediately defer to avoid Discord 3-second timeout (code 10062)
      await interaction.deferUpdate().catch(() => {});

      const selectedIndex = parseInt(interaction.values[0], 10);
      const chosenTrack = results[selectedIndex];

      const user = member.user || member;
      const requester = {
        id: user.id,
        tag: user.tag || user.username || 'User',
        avatar: user.displayAvatarURL ? user.displayAvatarURL() : null
      };

      const track = {
        ...chosenTrack,
        requestedBy: requester
      };

      const queue = client.music.getOrCreate(member.guild, interaction.channel);
      if (!queue.connection) {
        await queue.connect(voiceChannel);
      }

      await queue.enqueue(track, requester);

      const confirmPayload = {
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.success)
            .setDescription(`Selected: **[${track.title}](${track.url || 'https://open.spotify.com'})** (Spotify Studio)\nArtist: ${track.author} • Duration: \`${track.durationFormatted}\``)
        ],
        components: []
      };

      if (isSlash) {
        await context.editReply(confirmPayload).catch(() => {});
      } else {
        await responseMsg.edit(confirmPayload).catch(() => {});
      }
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        if (isSlash) {
          context.editReply({
            embeds: [new EmbedBuilder().setColor(config.colors.secondary).setDescription('Search selection timed out.')],
            components: []
          }).catch(() => {});
        } else {
          context.edit({
            embeds: [new EmbedBuilder().setColor(config.colors.secondary).setDescription('Search selection timed out.')],
            components: []
          }).catch(() => {});
        }
      }
    });
  }
};
