const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const config = require('./config');
const MusicManager = require('./music/MusicManager');
const { createWebServer } = require('./web/server');

// Validate Discord token
if (!config.token) {
  console.error('FATAL: DISCORD_TOKEN is missing in .env file!');
  process.exit(1);
}

// Create Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Attach Collections and Music Manager
client.commands = new Collection();
client.music = new MusicManager(client);

// 1. Load Commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if (command.name) {
    client.commands.set(command.name, command);
    console.log(`[Command Loader] Loaded: ${command.name}`);
  }
}

// 2. Load Events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  console.log(`[Event Loader] Registered event: ${event.name}`);
}

// 3. Start Full-Stack Web Dashboard
createWebServer(client);

// 4. Connect to Discord Gateway
client.login(config.token).catch(err => {
  console.error('FATAL: Failed to login to Discord:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('[WaveMusic Global Warning] Unhandled Rejection:', err?.message || err);
});

process.on('uncaughtException', (err) => {
  console.error('[WaveMusic Global Warning] Uncaught Exception:', err?.message || err);
});

// Handle graceful process exits
process.on('SIGINT', () => {
  console.log('\n[WaveMusic] Shutting down gracefully...');
  client.music.queues.forEach(queue => queue.destroy());
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[WaveMusic] Received SIGTERM. Shutting down...');
  client.music.queues.forEach(queue => queue.destroy());
  client.destroy();
  process.exit(0);
});
