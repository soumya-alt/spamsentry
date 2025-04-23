const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { handleSpamDetection } = require('./utils/spamDetector');
const { initializeStorage } = require('./utils/memoryStorage');
const { handleCommands } = require('./commands');
const config = require('./config');
const healthServer = require('./health');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// Initialize storage and start bot
async function startBot() {
    try {
        // Initialize in-memory storage
        await initializeStorage();
        console.log('In-memory storage initialized successfully');

        // Login to Discord
        await client.login(config.token);
        console.log(`Logged in as ${client.user.tag}`);
    } catch (error) {
        console.error('Failed to start bot:', error);
        process.exit(1);
    }
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log('Bot is ready!');
    console.log('Enabled intents:', client.options.intents);
});

// Message event handler
client.on('messageCreate', async (message) => {
    console.log(`Received message from ${message.author.tag}: ${message.content}`);
    
    // Ignore bot messages and slash commands
    if (message.author.bot || message.content.startsWith('/')) {
        console.log('Ignoring message: Bot message or slash command');
        return;
    }

    // Ignore messages from users with administrator or moderator permissions for spam detection only
    if (message.member.permissions.has(['Administrator', 'ManageMessages', 'ModerateMembers'])) {
        console.log(`Ignoring spam check for ${message.author.tag} (has admin/moderator permissions)`);
        return;
    }

    try {
        // Check for spam
        console.log(`Starting spam detection for message: "${message.content}"`);
        const spamResult = await handleSpamDetection(message);
        console.log(`Spam detection result:`, spamResult);
        
        if (spamResult.isSpam) {
            console.log(`Spam detected from ${message.author.tag}: ${spamResult.reason}`);
            
            // Delete the spam message immediately
            console.log('Deleting spam message...');
            await message.delete().catch(error => {
                console.error('Error deleting message:', error);
            });
            
            // Apply timeout immediately
            console.log('Applying timeout to user...');
            await message.member.timeout(24 * 60 * 60 * 1000, `Spam detection: ${spamResult.reason}`).catch(error => {
                console.error('Error applying timeout:', error);
            });
            
            // Send warning message and handle logging asynchronously
            console.log('Sending warning message and logging incident...');
            Promise.all([
                // Send warning message
                message.channel.send({
                    content: `⚠️ ${message.author}, your message was flagged as spam: ${spamResult.reason}`,
                    allowedMentions: { users: [message.author.id] }
                }).then(warningMsg => {
                    // Delete warning message after 5 seconds
                    setTimeout(() => {
                        warningMsg.delete().catch(console.error);
                    }, 5000);
                }).catch(console.error),
                
                // Log the incident
                (async () => {
                    try {
                        const logChannel = await client.channels.fetch(config.logChannelId);
                        if (logChannel) {
                            await logChannel.send({
                                embeds: [{
                                    title: '🚫 Spam Detected',
                                    description: `User: ${message.author.tag} (${message.author.id})`,
                                    fields: [
                                        { name: 'Channel', value: message.channel.name },
                                        { name: 'Reason', value: spamResult.reason },
                                        { name: 'Action Taken', value: 'Message deleted and user timed out for 24 hours' }
                                    ],
                                    color: 0xFF0000,
                                    timestamp: new Date()
                                }]
                            });
                        }
                    } catch (error) {
                        console.error('Error logging spam incident:', error);
                    }
                })()
            ]).catch(console.error);
        } else {
            console.log(`No spam detected in message: "${message.content}"`);
        }
    } catch (error) {
        console.error('Error handling spam:', error);
        // Try to send error message to the channel
        message.channel.send({
            content: '❌ An error occurred while handling spam detection. Please contact an administrator.',
            allowedMentions: { users: [message.author.id] }
        }).catch(console.error);
    }

    // Handle commands
    if (message.content.startsWith(config.prefix)) {
        console.log(`Processing command: ${message.content}`);
        await handleCommands(message);
    }
});

// Command handler
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    
    console.log(`Received command: ${interaction.commandName} from ${interaction.user.tag}`);
    
    try {
        await handleCommands(interaction);
    } catch (error) {
        console.error('Error handling command:', error);
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({
                content: '❌ An error occurred while executing this command. Please try again.',
                ephemeral: true
            }).catch(console.error);
        } else {
            await interaction.reply({
                content: '❌ An error occurred while executing this command. Please try again.',
                ephemeral: true
            }).catch(console.error);
        }
    }
});

// Error handling
client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Start the bot
startBot(); 