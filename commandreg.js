const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const configData = require('./config.json');

// Define the '/chat' command
const chatCommand = new SlashCommandBuilder()
  .setName('chat')
  .setDescription('Ask a question to the OpenAI API')
  .addStringOption((option) =>
    option.setName('question').setDescription('The question to ask').setRequired(true)
  );

const dalleCommand = new SlashCommandBuilder()
  .setName('dalle')
  .setDescription('Generate an image using DALL-E')
  .addStringOption((option) =>
    option
      .setName('prompt')
      .setDescription('The prompt to generate the image')
      .setRequired(true)
  );

// Register the commands with the Discord API
const commands = [chatCommand, dalleCommand].map((command) =>
  command.toJSON()
);

const rest = new REST({ version: '10' }).setToken(configData.discord.token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(configData.discord.clientId, configData.discord.guildId),
      { body: commands }
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
