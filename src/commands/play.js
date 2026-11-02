const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const AudioExtractor = require('../audio/extractor');
const SafeMessenger = require('../utils/safeMessenger');
const config = require('../config');

module.exports = {
  name: 'play',
  description: 'Play a song from YouTube, Spotify, or by search query',
  aliases: ['p'],
  slashData: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube, Spotify, or by search query')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Song name, YouTube URL, or Spotify URL')
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
            .setDescription('You must be in a voice channel to play music.')
        ],
        ephemeral: true
      });
    }

    const query = interaction.options.getString('query');
    await interaction.deferReply();

    try {
      const queue = client.music.getOrCreate(interaction.guild, interaction.channel);
      if (!queue.connection) {
        await queue.connect(voiceChannel);
      }

      const requester = {
        id: member.id,
        tag: member.user.tag,
        avatar: member.user.displayAvatarURL()
      };

      const result = await AudioExtractor.resolve(query, requester);

      if (result.type === 'playlist') {
        await queue.enqueue(result.tracks, requester);
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.primary)
              .setAuthor({ name: 'Playlist Added to Queue' })
              .setTitle(result.title)
              .setDescription(`Added **${result.tracks.length}** tracks to the queue.`)
              .setFooter({ text: `Requested by ${member.user.tag}` })
          ]
        });
      }

      const track = result.tracks[0];
      const isAlreadyPlaying = Boolean(queue.currentTrack);
      await queue.enqueue(track, requester);

      if (isAlreadyPlaying) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.primary)
              .setAuthor({ name: 'Added to Queue (Spotify Studio)' })
              .setTitle(track.title)
              .setURL(track.spotifyUrl || track.url || 'https://open.spotify.com')
              .setDescription(
                `**Artist:** ${track.author}\n` +
                `**Duration:** \`${track.durationFormatted}\` • **Position in Queue:** #${queue.tracks.length}`
              )
              .setThumbnail(track.thumbnail)
              .setFooter({ text: `Requested by ${member.user.tag}` })
          ]
        });
      } else {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.success)
              .setDescription(`Loaded **${track.title}** by **${track.author}** (Spotify Studio) into <#${voiceChannel.id}>.`)
          ]
        });
      }
    } catch (err) {
      console.error('[Play Slash Error]:', err);
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription(`Could not play track: ${err.message}`)
        ]
      });
    }
  },

  async executePrefix(message, args, client) {
    const member = message.member;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return SafeMessenger.reply(message, {
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('You must be in a voice channel to play music.')
        ]
      });
    }

    if (!args.length) {
      return SafeMessenger.reply(message, {
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription('Please provide a song name or link. Example: `!play Blinding Lights`')
        ]
      });
    }

    const query = args.join(' ');
    const loadingMsg = await SafeMessenger.reply(message, {
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.primary)
          .setDescription(`Searching Spotify for **${query}**...`)
      ]
    });

    try {
      const queue = client.music.getOrCreate(message.guild, message.channel);
      if (!queue.connection) {
        await queue.connect(voiceChannel);
      }

      const requester = {
        id: message.author.id,
        tag: message.author.tag,
        avatar: message.author.displayAvatarURL()
      };

      const result = await AudioExtractor.resolve(query, requester);

      if (result.type === 'playlist') {
        await queue.enqueue(result.tracks, requester);
        if (loadingMsg) {
          return SafeMessenger.edit(loadingMsg, {
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.primary)
                .setAuthor({ name: 'Playlist Added to Queue' })
                .setTitle(result.title)
                .setDescription(`Added **${result.tracks.length}** tracks to the queue.`)
                .setFooter({ text: `Requested by ${message.author.tag}` })
            ]
          });
        }
        return;
      }

      const track = result.tracks[0];
      const isAlreadyPlaying = Boolean(queue.currentTrack);
      await queue.enqueue(track, requester);

      if (isAlreadyPlaying) {
        if (loadingMsg) {
          return SafeMessenger.edit(loadingMsg, {
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.primary)
                .setAuthor({ name: 'Added to Queue (Spotify Studio)' })
                .setTitle(track.title)
                .setURL(track.spotifyUrl || track.url || 'https://open.spotify.com')
                .setDescription(
                  `**Artist:** ${track.author}\n` +
                  `**Duration:** \`${track.durationFormatted}\` • **Position in Queue:** #${queue.tracks.length}`
                )
                .setThumbnail(track.thumbnail)
                .setFooter({ text: `Requested by ${message.author.tag}` })
            ]
          });
        }
      } else {
        if (loadingMsg) {
          await SafeMessenger.edit(loadingMsg, {
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.success)
                .setDescription(`Loaded **${track.title}** by **${track.author}** (Spotify Studio) into <#${voiceChannel.id}>.`)
            ]
          });
          setTimeout(() => {
            loadingMsg.delete().catch(() => {});
          }, 5000);
        }
      }
    } catch (err) {
      console.error('[Play Prefix Error]:', err);
      if (loadingMsg) {
        return SafeMessenger.edit(loadingMsg, {
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error)
              .setDescription(`Could not play track: ${err.message}`)
          ]
        });
      }
    }
  }
};
