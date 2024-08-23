// Add this line at the top of your file
require('dotenv').config()
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const yts = require('yt-search');
const SpotifyWebApi = require('spotify-web-api-node');
const stringSimilarity = require('string-similarity');
const config = require("./config.json");

let OpusEncoder;
try {
    OpusEncoder = require('@discordjs/opus');
} catch (err) {
    try {
        OpusEncoder = require('opusscript');
    } catch (e) {
        console.error('Neither @discordjs/opus nor opusscript are installed. Please install one of them to play audio.');
        process.exit(1);
    }
}

// Create a new Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates] });
function cleanSongTitle(title) {
    // Regular expression to remove content within parentheses, square brackets, and "feat." clauses
    return title.replace(/\s*\(.*?\)|\s*.∗?.*?|\s*feat\..*/gi, '').trim();
}
// Spotify API setup
const spotifyApi = new SpotifyWebApi({
    clientId: config.SPOTIFY_CLIENT_ID,
    clientSecret: config.SPOTIFY_CLIENT_SECRET,
});

// Get Spotify access token
spotifyApi.clientCredentialsGrant().then(
    data => spotifyApi.setAccessToken(data.body['access_token']),
    err => console.log('Something went wrong when retrieving an access token', err)
);

// Points system
let points = {};
let roundWinners = [];
function displayLeaderboard(message) {
    const sortedPoints = Object.entries(points).sort(([, a], [, b]) => b - a);
    let leaderboardMessage = 'Leaderboard:\n';

    sortedPoints.forEach(([userId, score]) => {
        const user = client.users.cache.get(userId);
        leaderboardMessage += `${user ? user.tag : 'Unknown User'}: ${score} point(s)\n`;
    });

    message.channel.send(leaderboardMessage);
}

function displayRoundResults(message) {
    const sortedPoints = Object.entries(points).sort(([, a], [, b]) => b - a);
    if (sortedPoints.length === 0) {
        message.channel.send('No one won this round.');
        return;
    }


    const [topPlayerId, topPlayerPoints] = sortedPoints[0];
    const topPlayer = client.users.cache.get(topPlayerId);

    if (topPlayer) {
        message.channel.send(`${topPlayer.tag} has the highest points with ${topPlayerPoints} point(s)!`);
    } else {
        message.channel.send('Could not find the top player.');
    }
   
}
// On bot ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!play')) {
        const args = message.content.split(' ');

        if (args.length < 3) {
            return message.reply('Usage: !play <spotify-playlist-link> <numofsongs>');
        }

        const playlistUrl = args[1];
        const numOfSongs = parseInt(args[2], 10);
        if (isNaN(numOfSongs) || numOfSongs <= 0) {
            return message.reply('Please provide a valid number of songs to play.');
        }
       
        const playlistIdMatch = playlistUrl.match(/playlist\/(.*)\?/);
        if (!playlistIdMatch) {
            return message.reply('Invalid Spotify playlist link.');
        }
        const playlistId = playlistIdMatch[1];
      //  const playlistId = '3LgcZPSgVs9dJgEvyZVVdg'; // Replace with your Spotify playlist ID

        // Fetch playlist tracks
        const playlist = await spotifyApi.getPlaylistTracks(playlistId);
       // Number of songs to play

        if (message.member.voice.channel) {
            const connection = joinVoiceChannel({
                channelId: message.member.voice.channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            let totalSongs=numOfSongs;

            for (let i = 0; i < totalSongs; i++) {
                let random = Math.floor(Math.random() * 50) + 1;
                const trackNumber = random;
                const track = playlist.body.items[trackNumber].track;

                // Search for the song on YouTube
                const searchResult = await yts(`${track.name} ${track.artists[0].name}`);
                const songInfo = searchResult.videos[0];
                console.log(songInfo);

                if (!songInfo) {
                    message.reply(`Couldn't find ${track.name} on YouTube.`);
                    continue;
                }

                const videoLengthSeconds = songInfo.seconds; 
                const startTime = Math.max(0, Math.floor(Math.random() * (videoLengthSeconds - 30)));

                const resource = createAudioResource(await ytdl(songInfo.url, {
                    begin: `${startTime}s`,
                    filter: 'audioonly',
                    quality: 'highestaudio',
                }));
                
                const player = createAudioPlayer();
                player.play(resource);
                connection.subscribe(player);

                // Stop the player after 50 seconds if the song isn't guessed
                const timeout = setTimeout(() => {
                    player.stop();
                }, 50000); // 50 seconds
                
               // const filter = response => response.content.toLowerCase() === track.name.toLowerCase();

                const filter = response => {
                    const cleanedTitle = cleanSongTitle(track.name.toLowerCase());
                     const similarity = stringSimilarity.compareTwoStrings(response.content.toLowerCase(), cleanedTitle);
                     return similarity > 0.7; 
                 };
                try {
                    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 50000, errors: ['time'] });
                    const winner = collected.first().author;
                    points[winner.id] = (points[winner.id] || 0) + 1;
                    roundWinners.push(winner);
                    message.channel.send(`${winner} guessed it right! The song was ${track.name}. They now have ${points[winner.id]} point(s).`);
                    clearTimeout(timeout);
                    player.stop();

                } catch (err) {
                    console.log(err);
                    message.channel.send(`Time's up! The song was ${track.name}.`);
                }

                await new Promise(resolve => player.on(AudioPlayerStatus.Idle, resolve)); // Wait for the player to stop before moving to the next song
                displayLeaderboard(message);
            }

            connection.destroy();
            message.channel.send('Game over! Thanks for playing.');
            displayRoundResults(message);
            points={};
        } else {
            message.reply('You need to join a voice channel first!');
        }
    }

    // Check points command
    if (message.content.startsWith('!points')) {
        const userPoints = points[message.author.id] || 0;
        message.reply(`You have ${userPoints} point(s).`);
    }
});

client.login(config.KEY);//DISCORD API KEY

