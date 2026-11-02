const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command || !command.executeSlash) return;

      try {
        await command.executeSlash(interaction, client);
      } catch (err) {
        console.error(`[Error executing /${interaction.commandName}]:`, err);
        const replyPayload = {
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error)
              .setDescription(`An unexpected error occurred: ${err.message}`)
          ],
          ephemeral: true
        };

        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(replyPayload).catch(() => {});
        } else {
          await interaction.reply(replyPayload).catch(() => {});
        }
      }
      return;
    }

    // 2. Handle Button Controls (Miniplayer Buttons)
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('wm_')) {
        try {
          await client.music.handleButtonInteraction(interaction);
        } catch (err) {
          console.error('[Error handling player button]:', err);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('Failed to process button action.')],
              ephemeral: true
            }).catch(() => {});
          }
        }
      }
    }
  }
};
