const fs = require('fs');
const path = require('path');
const { initializeStorage, addBannedWord } = require('./utils/memoryStorage');

async function importBannedWords() {
    try {
        // Initialize the storage first
        await initializeStorage();
        
        const filePath = path.join(process.cwd(), 'bannedwords.txt');
        console.log('Reading banned words from:', filePath);
        
        const content = fs.readFileSync(filePath, 'utf8');
        const words = content.split('\n')
            .map(word => word.trim())
            .filter(word => word && word.length > 0);

        console.log(`Found ${words.length} words to import`);

        for (const word of words) {
            try {
                await addBannedWord(word);
                console.log(`✅ Added word: ${word}`);
            } catch (error) {
                console.error(`❌ Error adding word ${word}:`, error);
            }
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