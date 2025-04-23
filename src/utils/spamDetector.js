const { getSpamRules, getBannedWords } = require('../database');

// Cache for message history to detect repeated messages
const messageCache = new Map();
const REPEAT_THRESHOLD = 3;
const TIME_WINDOW = 5000; // 5 seconds

// Emoji detection regex
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F100}-\u{1F1FF}]|[\u{1F200}-\u{1F2FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;

// Allowed URL patterns
const ALLOWED_URL_PATTERNS = [
    /youtube\.com/i,
    /youtu\.be/i,
    /drive\.google\.com/i,
    /docs\.google\.com/i,
    /sheets\.google\.com/i,
    /slides\.google\.com/i,
    /forms\.google\.com/i,
    /maps\.google\.com/i,
    /mail\.google\.com/i,
    /gmail\.com/i,
    /google\.com/i,
    /google\.co/i,
    /google\.(com|co)\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+/i
];

// Suspicious URL patterns
const SUSPICIOUS_URL_PATTERNS = [
    /discord\.gift/i,
    /free.*nitro/i,
    /steam.*community/i,
    /steam.*gift/i,
    /giveaway/i,
    /hack.*tool/i,
    /crack.*key/i,
    /free.*robux/i,
    /free.*vbucks/i,
    /free.*money/i,
    /bit\.ly/i,
    /tinyurl\.com/i,
    /goo\.gl/i,
    /t\.co/i,
    /discord.*nitro/i,
    /discord.*gift/i,
    /discord.*free/i,
    /discord.*giveaway/i,
    /discord.*hack/i,
    /discord.*crack/i,
    /discord.*key/i,
    /discord.*robux/i,
    /discord.*vbucks/i,
    /discord.*money/i,
    /discord.*bit\.ly/i,
    /discord.*tinyurl\.com/i,
    /discord.*goo\.gl/i,
    /discord.*t\.co/i
];

async function handleSpamDetection(message) {
    const content = message.content.toLowerCase();
    
    // Check for repeated messages
    if (await checkRepeatedMessages(message)) {
        return { isSpam: true, reason: 'Repeated messages detected' };
    }

    // Check for excessive emojis (only if there are more than 5 emojis)
    if (checkExcessiveEmojis(content)) {
        return { isSpam: true, reason: 'Excessive emojis detected' };
    }

    // Check for URLs
    const urlCheck = checkUrls(content);
    if (urlCheck.isSpam) {
        return { isSpam: true, reason: urlCheck.reason };
    }

    // Check for banned words
    const bannedWordCheck = await checkBannedWords(content);
    if (bannedWordCheck.isSpam) {
        return { isSpam: true, reason: bannedWordCheck.reason };
    }

    // Check custom spam rules
    const customRule = await checkCustomRules(content);
    if (customRule) {
        return { isSpam: true, reason: customRule };
    }

    return { isSpam: false };
}

async function checkRepeatedMessages(message) {
    const userId = message.author.id;
    const content = message.content;
    const now = Date.now();

    if (!messageCache.has(userId)) {
        messageCache.set(userId, []);
    }

    const userMessages = messageCache.get(userId);
    
    // Clean old messages
    const recentMessages = userMessages.filter(msg => now - msg.timestamp < TIME_WINDOW);
    
    // Add current message
    recentMessages.push({ content, timestamp: now });
    messageCache.set(userId, recentMessages);

    // Check for repeated messages
    const repeatedCount = recentMessages.filter(msg => msg.content === content).length;
    return repeatedCount >= REPEAT_THRESHOLD;
}

function checkExcessiveEmojis(content) {
    const emojiCount = (content.match(EMOJI_REGEX) || []).length;
    return emojiCount > 5;
}

function checkUrls(content) {
    // First check if it's an allowed URL
    for (const pattern of ALLOWED_URL_PATTERNS) {
        if (pattern.test(content)) {
            return { isSpam: false };
        }
    }

    // Then check for suspicious URLs
    for (const pattern of SUSPICIOUS_URL_PATTERNS) {
        if (pattern.test(content)) {
            return { isSpam: true, reason: `Suspicious URL detected: ${pattern.source}` };
        }
    }

    // If it's a URL but not in either list, allow it
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    if (urlRegex.test(content)) {
        return { isSpam: false };
    }

    return { isSpam: false };
}

async function checkBannedWords(content) {
    const bannedWords = await getBannedWords();
    const contentLower = content.toLowerCase();
    
    for (const bannedWord of bannedWords) {
        // Check for exact word match
        if (contentLower.includes(bannedWord.word.toLowerCase())) {
            return { 
                isSpam: true, 
                reason: `Message contains banned word: "${bannedWord.word}"` 
            };
        }
        
        // Check for word with spaces around it
        const wordWithSpaces = ` ${bannedWord.word.toLowerCase()} `;
        if (contentLower.includes(wordWithSpaces)) {
            return { 
                isSpam: true, 
                reason: `Message contains banned word: "${bannedWord.word}"` 
            };
        }
        
        // Check for word at start of message
        if (contentLower.startsWith(bannedWord.word.toLowerCase() + ' ')) {
            return { 
                isSpam: true, 
                reason: `Message contains banned word: "${bannedWord.word}"` 
            };
        }
        
        // Check for word at end of message
        if (contentLower.endsWith(' ' + bannedWord.word.toLowerCase())) {
            return { 
                isSpam: true, 
                reason: `Message contains banned word: "${bannedWord.word}"` 
            };
        }
    }
    return { isSpam: false };
}

async function checkCustomRules(content) {
    const rules = await getSpamRules();
    for (const rule of rules) {
        try {
            const regex = new RegExp(rule.pattern, 'i');
            if (regex.test(content)) {
                return rule.description;
            }
        } catch (error) {
            console.error(`Error checking rule ${rule.id}:`, error);
        }
    }
    return null;
}

module.exports = {
    handleSpamDetection
}; 