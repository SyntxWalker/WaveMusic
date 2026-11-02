const { REST, Routes, ActivityType } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`[WaveMusic Engine] Online as ${client.user.tag} (ID: ${client.user.id})`);

    // Set activity
    client.user.setPresence({
      activities: [
        {
          name: '/play | 48kHz Hi-Fi',
          type: ActivityType.Listening
        }
      ],
      status: 'online'
    });

    // Register Slash Commands with Discord REST API
    try {
      const rest = new REST({ version: '10' }).setToken(config.token);
      const slashCommands = [];

      for (const cmd of client.commands.values()) {
        if (cmd.slashData) {
          slashCommands.push(cmd.slashData.toJSON());
        }
      }

      console.log(`[Slash Commands] Registering ${slashCommands.length} global application commands...`);
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: slashCommands }
      );
      console.log('[Slash Commands] Successfully registered all global commands with Discord.');
    } catch (err) {
      console.error('[Slash Commands Error]:', err.message);
    }

    // Restore 24/7 Voice Channel Connections
    await client.music.restore247Connections();
  }
};
