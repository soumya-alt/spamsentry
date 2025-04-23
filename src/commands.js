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
const config = require('./config');

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

async function handleCommands(message) {
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    try {
        switch (command) {
            case 'timeout-history':
                const user = message.mentions.users.first();
                if (!user) {
                    await message.reply('Please mention a user to check their timeout history.');
                    return;
                }
                const history = await getTimeoutHistory(user.id);
                if (history.length === 0) {
                    await message.reply(`${user.tag} has no timeout history.`);
                    return;
                }
                const historyEmbed = {
                    title: `Timeout History for ${user.tag}`,
                    fields: history.map(record => ({
                        name: new Date(record.timestamp).toLocaleString(),
                        value: `Reason: ${record.reason}\nDuration: ${record.duration} minutes`
                    })),
                    color: 0xFF0000
                };
                await message.reply({ embeds: [historyEmbed] });
                break;

            case 'add-rule':
                if (args.length < 2) {
                    await message.reply('Please provide a pattern and description for the rule.');
                    return;
                }
                const pattern = args[0];
                const description = args.slice(1).join(' ');
                await addSpamRule(pattern, description);
                await message.reply('Spam rule added successfully.');
                break;

            case 'list-rules':
                const rules = await getSpamRules();
                if (rules.length === 0) {
                    await message.reply('No spam rules configured.');
                    return;
                }
                const rulesEmbed = {
                    title: 'Spam Detection Rules',
                    fields: rules.map(rule => ({
                        name: `Rule #${rule.id}`,
                        value: `Pattern: ${rule.pattern}\nDescription: ${rule.description}`
                    })),
                    color: 0x00FF00
                };
                await message.reply({ embeds: [rulesEmbed] });
                break;

            case 'delete-rule':
                const ruleId = parseInt(args[0]);
                if (isNaN(ruleId)) {
                    await message.reply('Please provide a valid rule ID.');
                    return;
                }
                const result = await deleteSpamRule(ruleId);
                if (result === 0) {
                    await message.reply('Rule not found.');
                    return;
                }
                await message.reply('Rule deleted successfully.');
                break;

            case 'add-banned-word':
                if (args.length === 0) {
                    await message.reply('Please provide a word to ban.');
                    return;
                }
                const word = args[0].toLowerCase();
                await addBannedWord(word);
                await message.reply(`Word "${word}" added to banned words list.`);
                break;

            case 'remove-banned-word':
                if (args.length === 0) {
                    await message.reply('Please provide a word to remove from the banned list.');
                    return;
                }
                const wordToRemove = args[0].toLowerCase();
                const removeResult = await removeBannedWord(wordToRemove);
                if (removeResult === 0) {
                    await message.reply('Word not found in banned list.');
                    return;
                }
                await message.reply(`Word "${wordToRemove}" removed from banned words list.`);
                break;

            case 'list-banned-words':
                const bannedWords = await getBannedWords();
                if (bannedWords.length === 0) {
                    await message.reply('No banned words configured.');
                    return;
                }
                const wordsEmbed = {
                    title: 'Banned Words List',
                    description: bannedWords.map(w => w.word).join(', '),
                    color: 0xFF0000
                };
                await message.reply({ embeds: [wordsEmbed] });
                break;

            default:
                await message.reply('Unknown command. Available commands: timeout-history, add-rule, list-rules, delete-rule, add-banned-word, remove-banned-word, list-banned-words');
        }
    } catch (error) {
        console.error('Error handling command:', error);
        await message.reply('An error occurred while processing your command.');
    }
}

module.exports = {
    commands,
    handleCommands
}; 