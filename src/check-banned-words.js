const { initializeStorage, getBannedWords } = require('./utils/memoryStorage');

async function checkBannedWords() {
    try {
        // Initialize the storage first
        await initializeStorage();
        
        const words = await getBannedWords();
        console.log(`Found ${words.length} banned words in the storage:`);
        
        if (words.length === 0) {
            console.log('No banned words found in the storage.');
        } else {
            words.forEach(word => {
                console.log(`- ${word.word}`);
            });
        }
    } catch (error) {
        console.error('Error checking banned words:', error);
    }
}

// Run the check
checkBannedWords(); 