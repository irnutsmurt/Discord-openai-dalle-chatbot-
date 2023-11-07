const { Client, GatewayIntentBits, Partials, Collection, ActivityType, EmbedBuilder, AttachmentBuilder } = require('discord.js')
const { Database } = require('./database');
const { askQuestion } = require('./openai');
const { generateImage, addToQueue } = require('./dalle');
const { searchImage } = require('./imgur');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const configData = require('./config.json');
const createOpenAIApi = require('./openai');
const openai = createOpenAIApi(configData.openai.api_key);
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createLogger, transports, format } = require('winston');
const { combine, timestamp, printf } = format;
const validator = require('validator');


// Create the log folder if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create a custom logger that outputs to a daily rotating file in the logs folder
const logger = createLogger({
  level: 'debug',
  format: combine(
    timestamp(),
    printf(({ level, message, timestamp }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new transports.File({
      filename: path.join(logsDir, `${new Date().toISOString().slice(0, 10)}.log`),
      maxFiles: 7, // Keep only 7 days worth of logs
      maxsize: 1024 * 1024, // Rotate logs at 1 MB
    }),
  ],
});

// Export the logger so it can be used in other files
module.exports.logger = logger;

// Log a message with the custom logger
logger.info('Starting bot');

// Create a new Discord client
const client = new Client({
  intents: 56064
})

// Create a new SQLite database connection
const db = new Database();

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

// Define the '/clearchathistory' command
const clearChatHistoryCommand = new SlashCommandBuilder()
  .setName('clearchathistory')
  .setDescription('Clear your conversation history with the bot');

// In the part of your code where commands are registered, add the new command
commands.push(clearChatHistoryCommand.toJSON());

const rest = new REST({ version: '10' }).setToken(configData.discord.token);

// Event handler for the 'ready' event
client.once('ready', () => {
  console.log('Bot is ready!');
});

function validateInput(input) {
  if (
    validator.contains(input, '<script>') ||
    validator.contains(input, '/../') ||
    validator.contains(input, 'SELECT') ||
    validator.contains(input, 'INSERT') ||
    validator.contains(input, 'UPDATE') ||
    validator.contains(input, 'DELETE')
  ) {
    return false;
  }
  return true;
}

async function handleChatCommand(interaction) {
  logger.info('Handling chat command');
  const questionContent = interaction.options.getString('question');
  const messageId = interaction.id; // Discord's interaction ID can be used as a unique identifier
  const userId = interaction.user.id;

  if (!validateInput(questionContent)) {
    await interaction.reply('Invalid input detected. Please try a different question.');
    return;
  }

  logger.info(`Question: ${questionContent}`);
  
  // Defer the reply to indicate that the interaction is being handled
  await interaction.deferReply();

  // Retrieve the conversation history to build the context for OpenAI
  let messages = await db.getConversationHistory(userId);
  
  // Truncate the conversation history if it exceeds the token limit
  // Token counting and trimming logic should be implemented here
  // For now, we'll just use the last response and the current question for simplicity
  
  if (messages.length > 0) {
    const lastResponse = messages[messages.length - 1].ResponseContent || 'You are a helpful assistant.';
    messages = [{ role: 'assistant', content: lastResponse }, { role: 'user', content: questionContent }];
  } else {
    messages = [{ role: 'system', content: 'You are a helpful assistant.' }, { role: 'user', content: questionContent }];
  }
  
  // Call the OpenAI API to generate a response
  const aiResponse = await openai.askQuestion(messages);

  // Save the user's question and the AI's response to the database
  await db.saveQuestion(messageId, userId, questionContent);
  await db.saveResponse(messageId, aiResponse);
  
  logger.info(`AI Response: ${aiResponse}`);
  
  // Send the response to the user
  const embed = new EmbedBuilder()
    .setTitle('OpenAI Response')
    .setDescription(`**Question:** ${questionContent}\n\n**Answer:** ${aiResponse}`);

  await interaction.editReply({ embeds: [embed] });
}

async function sendGeneratedImage(interaction, imageBuffer, prompt) {
  const attachment = new AttachmentBuilder(imageBuffer, 'generated-image.png');
  const embed = new EmbedBuilder()
    .setTitle(`DALL-E Generated Image: ${prompt}`) // Updated title to include the user's prompt
    .setColor('#0099ff')
    .setTimestamp()
    .setImage(`attachment://generated-image.png`)
    .setFooter(`Prompt: ${prompt}`);

  await interaction.editReply({ embeds: [embed], files: [attachment] });
}


async function handleGenImageCommand(interaction) {
  console.log('Handling genimage command');
  const prompt = interaction.options.getString('prompt');

  if (!validateInput(prompt)) {
    await interaction.reply('Invalid input detected. Please try a different prompt.');
    return;
  }

  // Defer the reply to indicate that the interaction is being handled
  await interaction.deferReply();

  // Add the request to the image generation queue
  addToQueue(prompt, interaction, (imageBuffer) => {
    sendGeneratedImage(interaction, imageBuffer, prompt);
  });
}

async function handleClearChatHistoryCommand(interaction) {
  const userId = interaction.user.id;

  // Defer the reply to indicate that the interaction is being handled
  await interaction.deferReply();

  try {
    // Archive and clear the user's conversation history
    await db.archiveHistory(userId);
    await db.clearHistory(userId);
    
    logger.info(`Cleared chat history for user ${userId}`);
    
    // Reply to the user
    await interaction.editReply('Your conversation history has been cleared.');
  } catch (error) {
    logger.error(`Error clearing chat history for user ${userId}: ${error}`);
    await interaction.editReply('There was an error clearing your conversation history. Please try again later.');
  }
}


// Event handler for the 'ready' event
client.once('ready', () => {
  logger.info('Bot is ready!');
});

// Event handler for the 'interactionCreate' event
client.on('interactionCreate', async (interaction) => {
  if (interaction.isCommand()) {
    logger.info(`Received command: ${interaction.commandName}`);
    if (interaction.commandName === 'chat') {
      await handleChatCommand(interaction);
    } else if (interaction.commandName === 'dalle') {
      // Ensure this call appears only once
      await handleGenImageCommand(interaction);
    } else if (interaction.commandName === 'clearchathistory') {
  await handleClearChatHistoryCommand(interaction);
}
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return; // Ignore messages from bots

  if (message.content.startsWith('!chat')) {
    message.reply('Please use /chat instead.');
  } else if (message.content.startsWith('!image')) {
    message.reply('Please use /dalle instead.');
  }
});

// Event handler for the 'error' event
client.on('error', (error) => {
  logger.error(error);
});

// Log out from the Discord API
client.on('shardDisconnect', () => {
  logger.info('Disconnected from Discord API');
});

// Log in to the Discord API
client.login(configData.discord.token);
