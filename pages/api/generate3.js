import OpenAI from "openai";

//tester.js用
const finetuned_model = {setto:"ft:gpt-3.5-turbo-0613:personal::7zayZD3r", silva:"ft:gpt-3.5-turbo-0613:personal::7yhcFCbA"}
//20230904

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function (req, res) {
  const userInput = req.body.input || '';
  const character = req.body.character;
  const fewShot = req.body.fewShot;
  console.log(generateMessages(userInput, fewShot))
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
      messages: generateMessages(userInput, fewShot),
      model: finetuned_model[character],
      max_tokens: 80,
      stop: "\n",
      temperature: 0.4,
    });
    //res.status(200).json({ prompt: userInput, result: completion.data.choices[0].message });
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

function generateMessages(input, fewShot) {
  const messages = [
    {"role": "system", "content": fewShot},
    {"role": "user", "content": input}
  ]
  return messages
}
