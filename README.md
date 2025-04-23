# SpamSentry Discord Bot

A powerful Discord moderation bot designed to detect and prevent spam messages in your server. SpamSentry automatically monitors channels for spam patterns and takes appropriate action to maintain server cleanliness.

## Features

- Automatic spam detection based on multiple criteria:
  - Repeated messages
  - Excessive emojis
  - Unauthorized URLs
  - Custom spam patterns
  - Banned words
- 24-hour timeout for spam offenders
- Detailed moderation logs
- Admin commands for managing spam rules
- SQLite database for persistent storage
- Easy deployment to Render.com

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   DISCORD_TOKEN=your_discord_bot_token_here
   LOG_CHANNEL_ID=your_log_channel_id_here
   CLIENT_ID=your_client_id_here
   ```
4. Create a `data` directory in the root folder:
   ```bash
   mkdir data
   ```

## Deployment to Render.com

1. Create a new Web Service on Render.com
2. Connect your GitHub repository
3. Configure the following settings:
   - Build Command: `npm install`
   - Start Command: `node src/index.js`
   - Add your environment variables (DISCORD_TOKEN, LOG_CHANNEL_ID, CLIENT_ID)
4. Deploy the service

## Admin Commands

- `/timeout-history [user]` - View timeout history for a user
- `/unmute [user]` - Remove timeout from a user
- `/add-rule [pattern] [description]` - Add a new spam detection rule
- `/list-rules` - List all spam detection rules
- `/delete-rule [rule_id]` - Delete a spam detection rule
- `/add-banned-word [word]` - Add a word to the banned words list
- `/remove-banned-word [word]` - Remove a word from the banned words list
- `/list-banned-words` - List all banned words

## Required Bot Permissions

- Manage Messages
- Moderate Members
- Send Messages
- Embed Links
- Read Message History
- View Channels

## Contributing

Feel free to submit issues and enhancement requests! 