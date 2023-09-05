import { Configuration, OpenAIApi } from "openai";

//const finetuned_model = "curie:ft-personal-2023-08-05-06-28-46";//20230804
const finetuned_model = {setto:"curie:ft-personal-2023-08-05-06-28-46", silva:"curie:ft-personal-2023-09-04-03-05-21"}
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
      prompt: generatePrompt(userInput),
      max_tokens: 80,
      stop: "\n",
      temperature: 0.4,
    });
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

function generatePrompt(input) {
  return `${input} ->`
}
