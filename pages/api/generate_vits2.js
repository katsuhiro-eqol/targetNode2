//sttsに対応。句読点を除去し、スペースで置き換えた文章を音声合成する

import axios from 'axios';
import { db } from "../../lib/FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import md5 from 'md5';
import OpenAI from "openai";

//index.js用generate.js
const finetuned_model = {silva:"ft:gpt-3.5-turbo-0613:personal::7yhcFCbA", bauncer:"ft:gpt-3.5-turbo-1106:personal::8Wg2MJF4"}

//openai@4.7.0での記載方法
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const local_server = "http://192.168.2.192:3001"
const ecs_url = "http://13.114.75.20:80" //espnetNLBのEIP ecs@aws ElasticIP
const bucket_path = "gs://targetproject-394500.appspot.com/" //cloud storage bucket
//ここ重要。必ずサーバーで直接model_idを確認すること
const modelId = {bauncer:"0", silva:"1"}
const vits_param = {bauncer: "", silva: "&sdp_ratio=0.3&style_weight=0.1"}
export default async function (req, res) {
  if (!openai.apiKey) {
    res.status(500).json({
      error: {
        message: "OpenAI API key not configured, please follow instructions in README.md",
      }
    });
    return;
  }
  const userInput = req.body.input || '';
  const character = req.body.character;
  const setting = req.body.setting;
  const history = req.body.history;

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
      messages: generateMessages(userInput, setting, history),//直前3会話を参照する
      model: finetuned_model[character],
      max_tokens: 120,
      stop: "\n",
      temperature: 0.4,
    });
    const resultString = completion.choices[0].message.content.trim()
    const audioString = processedString(resultString)
    //resultStringをsha512でハッシュ化
    const hashString = md5(audioString)
    const id = character + "-" + hashString

    //音声ファイルが存在するかどうか確認
    const docRef = doc(db, "SpeechVITS", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data()
      const keys = Object.keys(data)
      const url = data.url
      const repeat = data.repeat
      res.status(200).json({ prompt: userInput, result: resultString, wavUrl: url, repeat: repeat, id: id});
    } else {
      //音声ファイルが存在しないときのみespnet(aws)に送信
      try {
        //ec2とecsの切り替えはここ
        
        console.log(audioString)
        console.log(modelId[character])
        const query = ecs_url  + "/voice?text=" + audioString + "&hash=" + hashString + "&model_id=" + modelId[character] + vits_param[character]
        const response = await axios.get(query);
        //ここ修正必要　生成したwavファイルのurlを取得してsetWavFile
        console.log(response.data.wav)
        res.status(200).json({ prompt: userInput, result: resultString, wav: response.data.wav, wavUrl: "", audioString: audioString, hash: hashString, repeat: 1, pronunciation: response.data.pronunciation, frame: response.data.frame, id: id})
      } catch (error) {
        res.status(400).json({ prompt: userInput, result: "vits2 serverが起動していません"});
      }
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

const generateMessages = (input, setting, history)  => {
  let messages = [{"role": "system", "content": setting}]
  messages = messages.concat(history)
  messages = messages.concat([{"role": "user", "content": input}])
  console.log(messages)
  return messages
}

const processedString = (text) => {
    let newText = text
    newText = newText.trim()
    newText = newText.replace(/。/g, "、")
    let processed = ""
    if (newText.slice(-1) == "、"){
        processed = newText.replace(/.$/, '')
    } else {
        processed = newText
    }
    return processed
  }