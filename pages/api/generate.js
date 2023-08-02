import { Configuration, OpenAIApi } from "openai";

const finetuned_model = "curie:ft-personal-2023-07-22-05-09-15";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

let history = [];

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
  if (userInput.length === 0) {
    res.status(400).json({
      error: {
        message: "Please enter a valid animal",
      }
    });
    return;
  }

  try {
    const completion = await openai.createCompletion({
      model: finetuned_model,
      prompt: generatePrompt(userInput),
      max_tokens: 50,
      stop: "\n",
      temperature: 0.5,
    });
    history.push(userInput + "\n" + completion.data.choices[0].text + "\n")
    console.log(history)
    res.status(200).json({ result: completion.data.choices[0].text });
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
  let previous = "";
  if (history.length > 3) {
    previous = history.slice(-3).join("")
  } else {
    previous = history.join("")
  }
  return `${previous} + ${input} ->`
}
