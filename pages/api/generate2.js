import axios from 'axios';
import { Configuration, OpenAIApi } from "openai";

const finetuned_model = "curie:ft-personal-2023-08-05-06-28-46";//20230804

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const url = "http://34.220.143.98:5000/"

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
        message: "Please enter message",
      }
    });
    return;
  }

  try {
    const completion = await openai.createCompletion({
      model: finetuned_model,
      prompt: generatePrompt(userInput),
      max_tokens: 80,
      stop: "\n",
      temperature: 0.4,
    });
    const resultString = completion.data.choices[0].text
    try {
      const query = url + "?input=" + resultString
    // getでデータを取得
    const response = await axios.get(query);
    // 取得したデータが変数usersに格納される
    const speech = response.data;
    console.log(speech)
    res.json(speech)
  } catch (error) {
   // データ取得が失敗した場合
    console.error(error);
  }
    //res.status(200).json({ prompt: userInput, result: completion.data.choices[0].text });
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
