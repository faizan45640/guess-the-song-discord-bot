# Discord Music Quiz Bot

This is a Discord bot that plays a music guessing game. The bot retrieves songs from a Spotify playlist, plays them in a voice channel, and users in the text channel can try to guess the song titles. Points are awarded for correct guesses, and the leaderboard is displayed after each round.

## Features

- Plays random songs from a specified Spotify playlist.
- Users guess the song title in the text channel.
- Awards points for correct guesses.
- Displays the leaderboard after each round.
- Tracks and displays individual user points.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js installed on your machine.
- A Discord bot token.
- A Spotify Developer account to obtain client ID and client secret.
- A `config.json` file with the following structure:

```json
{
    "KEY": "YOUR_DISCORD_BOT_TOKEN",
    "SPOTIFY_CLIENT_ID": "YOUR_SPOTIFY_CLIENT_ID",
    "SPOTIFY_CLIENT_SECRET": "YOUR_SPOTIFY_CLIENT_SECRET"
}
```
