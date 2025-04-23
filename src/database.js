const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

function initializeDatabase() {
    db = new sqlite3.Database(path.join(__dirname, '../data/spamsentry.db'), (err) => {
        if (err) {
            console.error('Error opening database:', err);
            return;
        }
        console.log('Connected to SQLite database');
        createTables();
    });
}

function createTables() {
    db.serialize(() => {
        // Table for timeout history
        db.run(`CREATE TABLE IF NOT EXISTS timeout_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            reason TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Table for spam rules
        db.run(`CREATE TABLE IF NOT EXISTS spam_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pattern TEXT NOT NULL,
            description TEXT NOT NULL,
            created_by TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Table for banned words
        db.run(`CREATE TABLE IF NOT EXISTS banned_words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL UNIQUE,
            added_by TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    });
}

function addTimeoutRecord(userId, guildId, reason) {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO timeout_history (user_id, guild_id, reason) VALUES (?, ?, ?)',
            [userId, guildId, reason],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

function getTimeoutHistory(userId, guildId) {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT * FROM timeout_history WHERE user_id = ? AND guild_id = ? ORDER BY timestamp DESC',
            [userId, guildId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

function addSpamRule(pattern, description, createdBy) {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO spam_rules (pattern, description, created_by) VALUES (?, ?, ?)',
            [pattern, description, createdBy],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

function getSpamRules() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM spam_rules ORDER BY created_at DESC', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function deleteSpamRule(ruleId) {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM spam_rules WHERE id = ?', [ruleId], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

function addBannedWord(word, addedBy) {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO banned_words (word, added_by) VALUES (?, ?)',
            [word.toLowerCase(), addedBy],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

function removeBannedWord(word) {
    return new Promise((resolve, reject) => {
        db.run(
            'DELETE FROM banned_words WHERE word = ?',
            [word.toLowerCase()],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            }
        );
    });
}

function getBannedWords() {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT * FROM banned_words ORDER BY created_at DESC',
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

module.exports = {
    initializeDatabase,
    addTimeoutRecord,
    getTimeoutHistory,
    addSpamRule,
    getSpamRules,
    deleteSpamRule,
    addBannedWord,
    removeBannedWord,
    getBannedWords
}; 