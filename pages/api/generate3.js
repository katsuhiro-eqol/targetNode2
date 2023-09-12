import { Configuration, OpenAIApi } from "openai";

//tester.js用
const finetuned_model = {setto:"curie:ft-personal-2023-09-11-02-32-38", silva:"curie:ft-personal-2023-09-11-03-00-50"}
//20230904

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export default async function (req, res) {
  if (!configuration.apiKey) {
    res.status(500).json({
      error: {
        message: "OpenAI API key not configured, please follow instructions in README.md",
      }
    });
    return;
  }

  const userInput = req.body.message || '';
  const character = req.body.character;
  const fewShot = req.body.fewShot;
  console.log("fewshot", fewShot)

  if (userInput.length === 0) {
    res.status(400).json({
      error: {
        message: "Please enter message",
      }
    });
    return;
  }

  try {
    const completion = await openai.createCompletion({
      model: finetuned_model[character],
      prompt: generatePrompt(userInput, fewShot, character),
      max_tokens: 80,
      stop: "\n",
      temperature: 0.4,
    });
    console.log(generatePrompt(userInput, fewShot))
    res.status(200).json({ prompt: userInput, result: completion.data.choices[0].text });
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

function generatePrompt(input, fewShot, character) {
  return `${fewShot}${character}として事実に基づいて回答すること。${input} ->`
}
