const { SlashCommandBuilder } = require('discord.js');
const { 
    getTimeoutHistory, 
    addSpamRule, 
    getSpamRules, 
    deleteSpamRule,
    addBannedWord,
    removeBannedWord,
    getBannedWords
} = require('./database');

const commands = [
    new SlashCommandBuilder()
        .setName('timeout-history')
        .setDescription('View timeout history for a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to check')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remove timeout from a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to unmute')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('add-rule')
        .setDescription('Add a new spam detection rule')
        .addStringOption(option => 
            option.setName('pattern')
                .setDescription('Regex pattern to match')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('description')
                .setDescription('Description of the rule')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('list-rules')
        .setDescription('List all spam detection rules'),
    
    new SlashCommandBuilder()
        .setName('delete-rule')
        .setDescription('Delete a spam detection rule')
        .addIntegerOption(option => 
            option.setName('rule_id')
                .setDescription('ID of the rule to delete')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('add-banned-word')
        .setDescription('Add a word to the banned words list')
        .addStringOption(option => 
            option.setName('word')
                .setDescription('The word to ban')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('remove-banned-word')
        .setDescription('Remove a word from the banned words list')
        .addStringOption(option => 
            option.setName('word')
                .setDescription('The word to remove')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('list-banned-words')
        .setDescription('List all banned words')
];

async function handleCommands(interaction) {
    // Defer the reply immediately to prevent timeout
    await interaction.deferReply({ ephemeral: true });

    // Check for administrator permission
    if (!interaction.member.permissions.has('Administrator')) {
        await interaction.editReply({ 
            content: '❌ You need Administrator permission to use this command.', 
            ephemeral: true 
        });
        return;
    }

    // Check if the bot has necessary permissions
    const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
    if (!botMember.permissions.has(['ManageMessages', 'ModerateMembers'])) {
        await interaction.editReply({ 
            content: '❌ I need the following permissions to work properly:\n- Manage Messages\n- Moderate Members\n\nPlease ask an administrator to grant these permissions.', 
            ephemeral: true 
        });
        return;
    }

    try {
        switch (interaction.commandName) {
            case 'timeout-history':
                await handleTimeoutHistory(interaction);
                break;
            case 'unmute':
                await handleUnmute(interaction);
                break;
            case 'add-rule':
                await handleAddRule(interaction);
                break;
            case 'list-rules':
                await handleListRules(interaction);
                break;
            case 'delete-rule':
                await handleDeleteRule(interaction);
                break;
            case 'add-banned-word':
                await handleAddBannedWord(interaction);
                break;
            case 'remove-banned-word':
                await handleRemoveBannedWord(interaction);
                break;
            case 'list-banned-words':
                await handleListBannedWords(interaction);
                break;
        }
    } catch (error) {
        console.error(`Error handling command ${interaction.commandName}:`, error);
        await interaction.editReply({
            content: '❌ An error occurred while processing your command. Please try again.',
            ephemeral: true
        });
    }
}

async function handleTimeoutHistory(interaction) {
    const user = interaction.options.getUser('user');
    const history = await getTimeoutHistory(user.id, interaction.guildId);

    if (history.length === 0) {
        await interaction.editReply({
            content: `No timeout history found for ${user.tag}`,
            ephemeral: true
        });
        return;
    }

    const embed = {
        title: `Timeout History for ${user.tag}`,
        fields: history.map(record => ({
            name: new Date(record.timestamp).toLocaleString(),
            value: record.reason
        })),
        color: 0xFF0000
    };

    await interaction.editReply({ embeds: [embed], ephemeral: true });
}

async function handleUnmute(interaction) {
    const user = interaction.options.getUser('user');
    console.log(`Attempting to unmute user: ${user.tag} (${user.id})`);
    
    try {
        const member = await interaction.guild.members.fetch(user.id);
        console.log(`Found member: ${member.user.tag}`);
        
        if (!member.communicationDisabledUntil) {
            await interaction.editReply({
                content: `${user.tag} is not currently muted.`,
                ephemeral: true
            });
            return;
        }

        await member.timeout(null, 'Timeout removed by admin');
        console.log(`Successfully removed timeout from ${user.tag}`);
        
        await interaction.editReply({
            content: `Successfully removed timeout from ${user.tag}`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error removing timeout:', error);
        await interaction.editReply({
            content: `Failed to remove timeout. Error: ${error.message}\nMake sure I have the necessary permissions (Moderate Members).`,
            ephemeral: true
        });
    }
}

async function handleAddRule(interaction) {
    const pattern = interaction.options.getString('pattern');
    const description = interaction.options.getString('description');

    try {
        // Test if the pattern is valid regex
        new RegExp(pattern);
        
        await addSpamRule(pattern, description, interaction.user.id);
        await interaction.editReply({
            content: 'Spam rule added successfully',
            ephemeral: true
        });
    } catch (error) {
        await interaction.editReply({
            content: 'Invalid regex pattern. Please try again.',
            ephemeral: true
        });
    }
}

async function handleListRules(interaction) {
    const rules = await getSpamRules();

    if (rules.length === 0) {
        await interaction.editReply({
            content: 'No spam rules configured',
            ephemeral: true
        });
        return;
    }

    const embed = {
        title: 'Spam Detection Rules',
        fields: rules.map(rule => ({
            name: `Rule #${rule.id}`,
            value: `Pattern: \`${rule.pattern}\`\nDescription: ${rule.description}\nAdded by: <@${rule.created_by}>`
        })),
        color: 0x00FF00
    };

    await interaction.editReply({ embeds: [embed], ephemeral: true });
}

async function handleDeleteRule(interaction) {
    const ruleId = interaction.options.getInteger('rule_id');

    try {
        const result = await deleteSpamRule(ruleId);
        if (result > 0) {
            await interaction.editReply({
                content: `Successfully deleted rule #${ruleId}`,
                ephemeral: true
            });
        } else {
            await interaction.editReply({
                content: `Rule #${ruleId} not found`,
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('Error deleting rule:', error);
        await interaction.editReply({
            content: 'Failed to delete rule',
            ephemeral: true
        });
    }
}

async function handleAddBannedWord(interaction) {
    const word = interaction.options.getString('word');
    
    try {
        await addBannedWord(word, interaction.user.id);
        await interaction.editReply({
            content: `✅ Successfully added "${word}" to the banned words list`,
            ephemeral: true
        });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT') {
            await interaction.editReply({
                content: `❌ "${word}" is already in the banned words list`,
                ephemeral: true
            });
        } else {
            console.error('Error adding banned word:', error);
            await interaction.editReply({
                content: '❌ Failed to add banned word. Please try again.',
                ephemeral: true
            });
        }
    }
}

async function handleRemoveBannedWord(interaction) {
    const word = interaction.options.getString('word');
    
    try {
        const result = await removeBannedWord(word);
        if (result > 0) {
            await interaction.editReply({
                content: `✅ Successfully removed "${word}" from the banned words list`,
                ephemeral: true
            });
        } else {
            await interaction.editReply({
                content: `❌ "${word}" was not found in the banned words list`,
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('Error removing banned word:', error);
        await interaction.editReply({
            content: '❌ Failed to remove banned word. Please try again.',
            ephemeral: true
        });
    }
}

async function handleListBannedWords(interaction) {
    try {
        const words = await getBannedWords();
        
        if (words.length === 0) {
            await interaction.editReply({
                content: '📝 No banned words configured',
                ephemeral: true
            });
            return;
        }

        const embed = {
            title: '📝 Banned Words List',
            description: `Total banned words: ${words.length}`,
            fields: words.map(word => ({
                name: `Word #${word.id}`,
                value: `Word: \`${word.word}\`\nAdded by: <@${word.added_by}>\nAdded at: ${new Date(word.created_at).toLocaleString()}`
            })),
            color: 0x00FF00,
            timestamp: new Date()
        };

        await interaction.editReply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        console.error('Error listing banned words:', error);
        await interaction.editReply({
            content: '❌ Failed to list banned words. Please try again.',
            ephemeral: true
        });
    }
}

module.exports = {
    commands,
    handleCommands
}; 