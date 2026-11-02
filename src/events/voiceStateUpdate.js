module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    const guild = oldState.guild;
    const queue = client.music.get(guild.id);
    if (!queue || !queue.voiceChannel) return;

    // Check if bot was disconnected
    if (oldState.member.id === client.user.id && !newState.channelId) {
      if (queue.mode247) {
        // Try to re-connect to locked channel after 3 seconds
        setTimeout(async () => {
          try {
            const ch = guild.channels.cache.get(queue.voiceChannel.id);
            if (ch && ch.isVoiceBased()) {
              await queue.connect(ch);
            }
          } catch (e) {}
        }, 3000);
      } else {
        queue.destroy();
      }
      return;
    }

    // Check if bot was moved to a new channel
    if (oldState.member.id === client.user.id && newState.channelId && oldState.channelId !== newState.channelId) {
      queue.voiceChannel = newState.channel;
      return;
    }

    // Check if everyone left the bot's channel
    if (queue.voiceChannel) {
      const channel = guild.channels.cache.get(queue.voiceChannel.id);
      if (channel && channel.isVoiceBased()) {
        const humanMembers = channel.members.filter(m => !m.user.bot);
        if (humanMembers.size === 0) {
          if (!queue.mode247) {
            queue.startIdleTimer();
          }
        } else {
          queue.clearIdleTimer();
        }
      }
    }
  }
};
