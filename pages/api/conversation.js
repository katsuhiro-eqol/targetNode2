//英会話練習用のapi
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function (req, res) {
    const userInput = req.body.input || '';

    if (userInput.length === 0) {
      res.status(400).json({
        error: {
          message: "Please enter message",
        }
      });
      return;
    }
  
    try {
      const completion = await openai.chat.completions.create({
        messages: generateMessages(userInput),
        model: "gpt-3.5-turbo-1106",
        max_tokens: 80,
        stop: "\n",
        temperature: 0.4,
      });
      res.status(200).json({ prompt: userInput, result: completion.choices[0].message.content  });
    } catch(error) {
          // Consider adjusting the error handling logic for your use case
          if (error.response) {
            console.error(error.response.status, error.response.data);
            res.status(error.response.status).json(error.response.data);
          } else {
            console.error(`Error with OpenAI API request: ${error.message}`);
            res.status(500).json({
              error: {
                message: 'An error occurred during your request.',
              }
            });
    }
  }
  }
  
  function generateMessages(input) {
    const messages = [
      {"role": "system", "content": "You are English teacher living in Japan"},
      {"role": "user", "content": input}
    ]
    return messages
  }
