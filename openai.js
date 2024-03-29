const { Configuration, OpenAIApi } = require('openai');

function createOpenAIApi(apiKey) {
  const configuration = new Configuration({ apiKey });
  const openai = new OpenAIApi(configuration);

  async function askQuestion(messages) {
    const response = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: messages,
      max_tokens: 4096,
      n: 1,
      stop: null,
      temperature: 0.7,
    });

    return response.data.choices[0].message.content;
  }

  return { askQuestion };
}

module.exports = createOpenAIApi;
