const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
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
	  model: "dall-e-3",
      prompt: prompt,
    };

    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      data,
      {
        headers: headers,
        timeout: 90000, // 90 seconds timeout
      }
    );

    if (response.data && response.data.data && response.data.data.length > 0) {
      return response.data.data[0].url;
    } else {
      throw new Error('No images generated');
    }

  } catch (error) {
    // Check if the error response exists and contains the expected structure
    if (error.response && error.response.data && error.response.data.error) {
      const errorResponse = error.response.data;
      console.error(`Error in API response: ${JSON.stringify(errorResponse)}`);

      // Handle the content policy violation error
      if (errorResponse.error.code === "content_policy_violation") {
        throw new Error('Content policy violation');
      } else if (errorResponse.error.message.includes('safety system')) {
        throw new Error('Safety system error');
      } else {
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
    const imageName = path.basename(new URL(imageUrl).pathname);
    const imagePath = path.join(__dirname, imageName);

    // Download the image using node-fetch
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const imageData = await response.buffer();

    // Write the image data to a file
    fs.writeFileSync(imagePath, imageData);

    // After the image has been uploaded, construct the embed to send
    const embed = new EmbedBuilder()
      .setTitle(`Generated Image: ${prompt}`)
      .setImage(`attachment://${imageName}`)
      .setColor('#0099ff')
      .setTimestamp();

    // Reply with the embed and attached image
    await interaction.editReply({ embeds: [embed], files: [{ attachment: imagePath, name: imageName }] });

    // Delete the local image file after sending
    await fs.promises.unlink(imagePath);

  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      // Respond with a timeout message
      await interaction.editReply('Request timed out, wait 60 seconds and try again.');
    } else if (error.message.includes('Content policy violation')) {
      await interaction.editReply('Your request was rejected due to content policy violation.');
    } else if (error.message.includes('Safety system error')) {
      await interaction.editReply('Your request was rejected as a result of our safety system.');
    } else if (error.message.includes('API error')) {
      await interaction.editReply('An error occurred while processing your request. Please try again later.');
    } else {
      console.error(error);
      await interaction.editReply('An unexpected error occurred.');
    }
  }

  queue.shift();
  // Wait for 60 seconds before processing the next item in the queue
  if (queue.length > 0) {
    await wait(60000);
    processQueue();
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


module.exports = {
  addToQueue,
};
