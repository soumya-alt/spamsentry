const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'spamsentry.db');

function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
                return;
            }

            // Create tables if they don't exist
            db.serialize(() => {
                // Spam detection rules table
                db.run(`CREATE TABLE IF NOT EXISTS spam_rules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    pattern TEXT NOT NULL,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);

                // Banned words table
                db.run(`CREATE TABLE IF NOT EXISTS banned_words (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    word TEXT NOT NULL UNIQUE,
                    added_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);

                // Timeout history table
                db.run(`CREATE TABLE IF NOT EXISTS timeout_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    reason TEXT,
                    duration INTEGER,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);

                console.log('Database initialized successfully');
                resolve(db);
            });
        });
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