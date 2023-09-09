import axios from 'axios';
import { storage } from "../../lib/FirebaseConfig";
import { ref, getDownloadURL } from "firebase/storage";
import md5 from 'md5';
import { Configuration, OpenAIApi } from "openai";

const finetuned_model = "curie:ft-personal-2023-08-05-06-28-46";//20230804

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const url = "http://54.70.243.84:5000" //espnet@aws
const bucket_path = "gs://targetproject-394500.appspot.com/" //cloud storage bucket

export default async function (req, res) {
    const time1 = new Date().getTime()

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
      model: finetuned_model,
      prompt: generatePrompt(userInput),
      max_tokens: 80,
      stop: "\n",
      temperature: 0.4,
    });
    //completion
    const resultString = completion.data.choices[0].text.trim()
    const time2 = new Date().getTime() - time1
    //res.status(200).json({ prompt: userInput, result: resultString, wav: "", start_time: time1, openai_response: time2 });

    //resultStringをsha512でハッシュ化
    const hashString = md5(resultString)
    const wavfile = hashString

    try {
    const time3 = new Date().getTime() - time1
      const query = url + "?input=" + resultString + "&hash=" + hashString + "&character=" + character
      //responseは、CloudStorageの音声ファイル認証urlにする
      const response = await axios.get(query);
      res.status(200).json({ prompt: userInput, result: resultString, wav: response.data});
    } catch (error) {
      console.error(error);
    }
    
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

const timeMeasurement = () => {
    const now = new Date()
    const time = now.getTime()
    return time
  }

const generatePrompt = (input) => {
  return `${input} ->`
}

