const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { SlashCommandBuilder } = require('@discordjs/builders');
const configData = require('./config.json');

// Define the '/chat' command
const chatCommand = new SlashCommandBuilder()
  .setName('chat')
  .setDescription('Ask a question to the OpenAI API')
  .addStringOption(option =>
    option.setName('question').setDescription('The question to ask').setRequired(true),
  );

const dalleCommand = new SlashCommandBuilder()
  .setName('dalle')
  .setDescription('Generate an image using DALL-E')
  .addStringOption(option =>
    option
      .setName('prompt')
      .setDescription('The prompt to generate the image')
      .setRequired(true),
  );

// Define the '/clearchathistory' command
const clearChatHistoryCommand = new SlashCommandBuilder()
  .setName('clearchathistory')
  .setDescription('Clear your conversation history with the bot');

// Collect all command definitions into an array
const commands = [chatCommand, dalleCommand, clearChatHistoryCommand].map(command => command.toJSON());


const rest = new REST({ version: '10' }).setToken(configData.discord.token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    // Register commands for a single guild
    await rest.put(
      Routes.applicationGuildCommands(configData.discord.application_id, 'guildid here'), //get your guildid from your discord server id to register the commands
      { body: commands },
    );

    // If you want to register commands globally, comment out the above and use the below line instead
    // Note that global registration can take up to an hour to propagate
    /*
    await rest.put(
      Routes.applicationCommands(configData.discord.application_id),
      { body: commands },
    );
    */

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
