const { Configuration, OpenAIApi } = require('openai');

function createOpenAIApi(apiKey) {
  const configuration = new Configuration({ apiKey });
  const openai = new OpenAIApi(configuration);

  async function askQuestion(question) {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: question },
      ],
      max_tokens: 1024,
      n: 1,
      stop: null,
      temperature: 0.3,
    });

    return response.data.choices[0].message.content;
  }

  return { askQuestion };
}

module.exports = createOpenAIApi;
