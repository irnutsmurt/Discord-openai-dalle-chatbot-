const { Configuration, OpenAIApi } = require('openai');
const configData = require('./config.json');
const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const queue = [];

const configuration = new Configuration({
  apiKey: configData.openai.api_key,
});

const openai = new OpenAIApi(configuration);

async function generateImage(prompt) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${configData.openai.api_key}`,
    };

    const data = {
      prompt: prompt,
      n: 2,
      size: '512x512',
    };

    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      data,
      {
        headers: headers,
        timeout: 10000, // 10 seconds timeout
      }
    );

    // Check if the API returned any images
    if (response.data && response.data.data && response.data.data.length > 0) {
      // Return the first generated image's URL
      return response.data.data[0].url;
    } else if (response.data && response.data.error && response.data.error.message.includes('your request was rejected as a result of our safety system.')) {
      throw new Error('Safety system error');
    } else {
      throw new Error('No images generated');
    }

  } catch (error) {
    if (error.response && error.response.status === 400) {
      const errorResponse = error.response.data;
      if (errorResponse && errorResponse.error && errorResponse.error.message) {
        if (errorResponse.error.message.includes('safety system')) {
          throw new Error('Safety system error');
        } else {
          console.error(`Error in API response: ${JSON.stringify(errorResponse)}`);
          throw new Error('API error');
        }
      } else {
        console.error(`Error in API response: ${JSON.stringify(errorResponse)}`);
        throw new Error('API error');
      }
    } else {
      console.error('Error generating image:', error);
      throw error;
    }
  }
}


function addToQueue(prompt, interaction, callback) {
  // Add the request to the queue, including the prompt, interaction, and callback
  queue.push({ prompt, interaction, callback });

  if (queue.length === 1) {
    processQueue();
  }
}


async function processQueue() {
  if (queue.length === 0) {
    return;
  }

  const { prompt, interaction } = queue[0];

  try {
    const imageUrl = await generateImage(prompt);

    const embed = new EmbedBuilder()
      .setTitle(`Generated Image: ${prompt}`) // Updated title to include the user's prompt
      .setImage(imageUrl)
      .setColor('#0099ff')
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    if (error.message.includes('Safety system error')) {
      await interaction.editReply('Your request was rejected as a result of our safety system.');
    } else if (error.code === 'ECONNABORTED') {
      await interaction.editReply('The request took too long. Please try again later.');
    } else if (error.message.includes('API error')) {
      await interaction.editReply('An error occurred while processing your request. Please try again later.');
    } else {
      console.error(error);
    }
  }

  // Remove the current request from the queue and process the next one
  queue.shift();
  processQueue();
}


module.exports = {
  addToQueue,
};
