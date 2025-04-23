const { getSpamRules, getBannedWords } = require('../utils/memoryStorage');

// Cache for message history to detect repeated messages
const messageCache = new Map();
// Cache for banned words
const bannedWordsCache = new Set();
let lastBannedWordsFetch = 0;
const BANNED_WORDS_CACHE_TTL = 60000; // 1 minute
const REPEAT_THRESHOLD = 2;
const TIME_WINDOW = 5000; // 5 seconds
const MAX_EMOJI_COUNT = 4;
const MAX_CAPS_PERCENTAGE = 60;
const MIN_MESSAGE_LENGTH_FOR_CAPS = 6;
const MAX_REPEATED_CHARS = 4;

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

// Function to check for character spam
function checkCharacterSpam(content) {
    // Check for repeated characters (e.g., "aaaaa", "!!!!!")
    if (content.match(/(.)\1{3,}/)) {
        console.log('Detected repeated characters');
        return true;
    }

    // Check for keyboard spam (e.g., "asdfgh", "qwerty")
    if (content.match(/[asdfgh]{4,}|[qwerty]{4,}|[zxcvbn]{4,}/i)) {
        console.log('Detected keyboard spam');
        return true;
    }

    // Check for random character spam
    const randomCharPattern = content.replace(/\s+/g, '').length > 0 && 
        content.replace(/[^a-zA-Z0-9\s]/g, '').length === 0;
    if (randomCharPattern) {
        console.log('Detected random character spam');
        return true;
    }

    return false;
}

// Function to check for line spam
function checkLineSpam(content) {
    const lines = content.split('\n');
    const hasExcessiveLines = lines.length > 4; // Reduced from 5 to 4
    const hasEmptyLines = lines.some(line => line.trim() === '');
    return hasExcessiveLines || hasEmptyLines;
}

// Function to check for excessive caps
function checkExcessiveCaps(content) {
    if (content.length < MIN_MESSAGE_LENGTH_FOR_CAPS) return false;
    
    const upperCount = content.split('').filter(char => char === char.toUpperCase() && char.match(/[A-Z]/)).length;
    const percentage = (upperCount / content.length) * 100;
    
    console.log(`Caps percentage: ${percentage}%`);
    return percentage > MAX_CAPS_PERCENTAGE;
}

// Function to check for gibberish/random text
function checkGibberish(content) {
    // Check for lack of vowels
    const vowelRatio = (content.match(/[aeiou]/gi) || []).length / content.length;
    if (vowelRatio < 0.15 && content.length > 5) { // If less than 15% vowels
        console.log('Detected low vowel ratio:', vowelRatio);
        return true;
    }

    // Check for random consonant clusters
    if (content.match(/[bcdfghjklmnpqrstvwxz]{5,}/i)) {
        console.log('Detected consonant cluster');
        return true;
    }

    // Check for repetitive patterns
    if (content.match(/(.{2,})\1{2,}/)) {
        console.log('Detected repetitive pattern');
        return true;
    }

    return false;
}

async function handleSpamDetection(message) {
    const content = message.content;
    const contentLower = content.toLowerCase();
    console.log(`Checking message for spam: "${content}"`);
    
    // Check for repeated messages
    if (await checkRepeatedMessages(message)) {
        console.log('Spam detected: Repeated messages');
        return { isSpam: true, reason: 'Repeated messages detected' };
    }

    // Check for gibberish
    if (checkGibberish(content)) {
        console.log('Spam detected: Gibberish text');
        return { isSpam: true, reason: 'Message appears to be gibberish or random text' };
    }

    // Check for excessive caps
    if (checkExcessiveCaps(content)) {
        console.log('Spam detected: Excessive caps');
        return { isSpam: true, reason: 'Excessive use of capital letters' };
    }

    // Check for character spam
    if (checkCharacterSpam(content)) {
        console.log('Spam detected: Character spam');
        return { isSpam: true, reason: 'Repeated character spam detected' };
    }

    // Check for line spam
    if (checkLineSpam(content)) {
        console.log('Spam detected: Line spam');
        return { isSpam: true, reason: 'Message formatting spam detected' };
    }

    // Check for excessive emojis
    if (checkExcessiveEmojis(content)) {
        console.log('Spam detected: Excessive emojis');
        return { isSpam: true, reason: 'Excessive emojis detected' };
    }

    // Check for URLs
    const urlCheck = checkUrls(contentLower);
    if (urlCheck.isSpam) {
        console.log(`Spam detected: ${urlCheck.reason}`);
        return { isSpam: true, reason: urlCheck.reason };
    }

    // Check for banned words
    console.log('Checking for banned words...');
    const bannedWordCheck = await checkBannedWords(contentLower);
    if (bannedWordCheck.isSpam) {
        console.log(`Spam detected: ${bannedWordCheck.reason}`);
        return { isSpam: true, reason: bannedWordCheck.reason };
    }

    // Check custom spam rules
    const customRule = await checkCustomRules(contentLower);
    if (customRule) {
        console.log(`Spam detected: Custom rule - ${customRule}`);
        return { isSpam: true, reason: customRule };
    }

    console.log('No spam detected');
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
    console.log(`Emoji count: ${emojiCount}`);
    return emojiCount > MAX_EMOJI_COUNT;
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
    // Refresh cache if needed
    const now = Date.now();
    if (now - lastBannedWordsFetch > BANNED_WORDS_CACHE_TTL) {
        const bannedWords = await getBannedWords();
        console.log(`Refreshing banned words cache. Found ${bannedWords.length} words.`);
        bannedWordsCache.clear();
        for (const bannedWord of bannedWords) {
            bannedWordsCache.add(bannedWord.word.toLowerCase());
        }
        lastBannedWordsFetch = now;
    }
    
    const contentLower = content.toLowerCase();
    const words = contentLower.split(/\s+/);
    
    console.log(`Checking banned words in message: "${contentLower}"`);
    console.log(`Banned words cache contains ${bannedWordsCache.size} words`);
    
    for (const bannedWord of bannedWordsCache) {
        // Check for exact word match
        if (words.includes(bannedWord)) {
            console.log(`Found exact match for banned word: "${bannedWord}"`);
            return { 
                isSpam: true, 
                reason: `Message contains banned word: "${bannedWord}"` 
            };
        }
        
        // Check for partial match within words (for compound words)
        if (contentLower.includes(bannedWord)) {
            console.log(`Found partial match for banned word: "${bannedWord}"`);
            return { 
                isSpam: true, 
                reason: `Message contains banned word: "${bannedWord}"` 
            };
        }
    }
    console.log('No banned words found in message');
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