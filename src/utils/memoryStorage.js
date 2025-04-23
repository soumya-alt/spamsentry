// In-memory storage for the bot
const storage = {
    bannedWords: new Set(),
    spamRules: [],
    timeoutHistory: []
};

// Banned words functions
function addBannedWord(word) {
    storage.bannedWords.add(word.toLowerCase());
    return Promise.resolve(true);
}

function removeBannedWord(word) {
    const result = storage.bannedWords.delete(word.toLowerCase());
    return Promise.resolve(result ? 1 : 0);
}

function getBannedWords() {
    return Promise.resolve(Array.from(storage.bannedWords).map(word => ({ word })));
}

// Spam rules functions
function addSpamRule(pattern, description) {
    const id = storage.spamRules.length + 1;
    storage.spamRules.push({ id, pattern, description });
    return Promise.resolve(id);
}

function getSpamRules() {
    return Promise.resolve(storage.spamRules);
}

function deleteSpamRule(ruleId) {
    const initialLength = storage.spamRules.length;
    storage.spamRules = storage.spamRules.filter(rule => rule.id !== ruleId);
    return Promise.resolve(initialLength - storage.spamRules.length);
}

// Timeout history functions
function addTimeoutRecord(userId, reason, duration) {
    storage.timeoutHistory.push({
        user_id: userId,
        reason,
        duration,
        timestamp: new Date()
    });
    return Promise.resolve(true);
}

function getTimeoutHistory(userId) {
    return Promise.resolve(
        storage.timeoutHistory
            .filter(record => record.user_id === userId)
            .sort((a, b) => b.timestamp - a.timestamp)
    );
}

// Initialize function (no-op for in-memory storage)
function initializeStorage() {
    return Promise.resolve();
}

module.exports = {
    initializeStorage,
    addBannedWord,
    removeBannedWord,
    getBannedWords,
    addSpamRule,
    getSpamRules,
    deleteSpamRule,
    addTimeoutRecord,
    getTimeoutHistory
}; 