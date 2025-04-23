const fs = require('fs');
const path = require('path');
const { initializeDatabase, addBannedWord } = require('./database');

async function importBannedWords() {
    try {
        // Initialize the database first
        initializeDatabase();
        
        // Wait a moment for the database to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const filePath = path.join(process.cwd(), 'bannedwords.txt');
        console.log('Reading banned words from:', filePath);
        
        const content = fs.readFileSync(filePath, 'utf8');
        const words = content.split('\n')
            .map(word => word.trim())
            .filter(word => word && word.length > 0);

        console.log(`Found ${words.length} words to import`);

        for (const word of words) {
            try {
                await addBannedWord(word, 'SYSTEM');
                console.log(`✅ Added word: ${word}`);
            } catch (error) {
                if (error.code === 'SQLITE_CONSTRAINT') {
                    console.log(`⚠️ Word already exists: ${word}`);
                } else {
                    console.error(`❌ Error adding word ${word}:`, error);
                }
            }
            // Add a small delay between insertions
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('Import completed!');
        
        // Exit the process after import is done
        process.exit(0);
    } catch (error) {
        console.error('Error importing banned words:', error);
        process.exit(1);
    }
}

// Run the import
importBannedWords(); 