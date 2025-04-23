const { initializeDatabase, getBannedWords } = require('./database');

async function checkBannedWords() {
    try {
        // Initialize the database first
        initializeDatabase();
        
        // Wait a moment for the database to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const words = await getBannedWords();
        console.log(`Found ${words.length} banned words in the database:`);
        
        if (words.length === 0) {
            console.log('No banned words found in the database.');
        } else {
            words.forEach(word => {
                console.log(`- ${word.word} (added by: ${word.added_by}, at: ${new Date(word.created_at).toLocaleString()})`);
            });
        }
    } catch (error) {
        console.error('Error checking banned words:', error);
    }
}

// Run the check
checkBannedWords(); 