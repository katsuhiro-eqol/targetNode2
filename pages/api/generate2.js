//sttsに対応。句読点を除去し、スペースで置き換えた文章を音声合成する

import axios from 'axios';
import { storage, db } from "../../lib/FirebaseConfig";
import { ref, getDownloadURL} from "firebase/storage";
import { doc, getDoc } from "firebase/firestore";
import md5 from 'md5';
import OpenAI from "openai";

//index.js用generate.js
const finetuned_model = {setto:"ft:gpt-3.5-turbo-0613:personal::7zayZD3r", 
silva:"ft:gpt-3.5-turbo-0613:personal::7yhcFCbA", bauncer:"ft:gpt-3.5-turbo-1106:personal::8Wg2MJF4"}

//openai@4.7.0での記載方法
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ec2_url = "http://54.70.243.84:5000" //espnet@aws
const ecs_url = "http://13.113.209.222:80" //ecs@aws ElasticIP
const bucket_path = "gs://targetproject-394500.appspot.com/" //cloud storage bucket

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
  const sca = req.body.sca;

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
      max_tokens: 80,
      stop: "\n",
      temperature: 0.4,
    });
    const resultString = completion.choices[0].message.content.trim()
    //句読点、？、！、・などをスペースに変換
    const audioString = processedString(resultString)
    console.log("audioString: ", audioString)
    //resultStringをsha512でハッシュ化
    const hashString = md5(audioString)
    const id = character + "-" + hashString

    //音声ファイルが存在するかどうか確認
    const docRef = doc(db, "Speech", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data()
      const keys = Object.keys(data)
      const url = data.url
      const repeat = docSnap.data().repeat + 1
      if (keys.includes("duration")){
        const duration = data.duration
        //const imageList = durationResolve(duration)
        res.status(200).json({ prompt: userInput, result: resultString, wav: url, hash: hashString, repeat: repeat, duration: duration});
      }else{
        res.status(200).json({ prompt: userInput, result: resultString, wav: url, hash: hashString, repeat: repeat, duration: "no duration data"});
      }  
    } else {
      //音声ファイルが存在しないときのみespnet(aws)に送信
      try {
        //ec2とecsの切り替えはここ
        const query = ecs_url + "?input=" + resultString + "&hash=" + hashString + "&character=" + character+ "&sca=" + sca
        const response = await axios.get(query);
        //ここ修正必要　生成したwavファイルのurlを取得してsetWavFile
        console.log(response.data.wav)
        const currentWavPath = bucket_path + response.data.wav;//urlを返すようにaws flask側を変更
        const currentRef = ref(storage, currentWavPath)
        getDownloadURL(currentRef)
        .then((url) => {
          console.log("wavUrl", url)
          //existingがfalseなのでindexでの保存処理あり
          res.status(200).json({ prompt: userInput, result: resultString, wav: url, hash: hashString, repeat: 1, duration:response.data.duration});
        })
        .catch((error) => {
          res.status(200).json({ prompt: userInput, result: resultString, wav: error, duration: ""});
        })
      } catch (error) {
        res.status(400).json({ prompt: userInput, result: "espnet serverが起動していません", wav: error, duration: ""});
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
  return messages
}

const processedString = (text) => {
  let newText = text
  const targetCharacter = ["。", "、", "？", "?", "！","!", "・", "＜", "<", "＞", ">"]
  targetCharacter.map((item) => {
    newText = newText.replace(item, " ")
  })
  newText = newText.trim()
  return newText
}

