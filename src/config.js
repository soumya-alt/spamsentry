require('dotenv').config();

module.exports = {
    token: process.env.DISCORD_TOKEN,
    prefix: process.env.PREFIX || '!',
    port: process.env.PORT || 3000
}; 