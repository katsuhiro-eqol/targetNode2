import axios from 'axios';
import { storage, db } from "../../lib/FirebaseConfig";
import { ref, getDownloadURL} from "firebase/storage";
import { doc, getDoc } from "firebase/firestore";
import md5 from 'md5';
import OpenAI from "openai";

//index.js用generate.js
const finetuned_model = {setto:"ft:gpt-3.5-turbo-0613:personal::7zayZD3r", 
silva:"ft:gpt-3.5-turbo-0613:personal::7yhcFCbA"}

//openai@4.7.0での記載方法
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ec2_url = "http://54.70.243.84:5000" //espnet@aws
const ecs_url = "http://13.113.209.222:80" //esc@aws ElasticIP
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
  const fewShot = req.body.fewShot;
  const pre = req.body.pre;

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
      messages: generateMessages(userInput, fewShot, pre),
      model: finetuned_model[character],
      max_tokens: 80,
      stop: "\n",
      temperature: 0.4,
    });
    const resultString = completion.choices[0].message.content.trim()
    //resultStringをsha512でハッシュ化
    const hashString = md5(resultString)
    const id = character + "-" + hashString

    //音声ファイルが存在するかどうか確認
    const docRef = doc(db, "Speech", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const url = docSnap.data().url
      const repeat = docSnap.data().repeat + 1
      //existingがtrueなのでindexでの保存処理なし
      res.status(200).json({ prompt: userInput, result: resultString, wav: url, hash: hashString, repeat: repeat});
    } else {
      //音声ファイルが存在しないときのみespnet(aws)に送信
      try {
        const query = ecs_url + "?input=" + resultString + "&hash=" + hashString + "&character=" + character
        const response = await axios.get(query);
        //ここ修正必要　生成したwavファイルのurlを取得してsetWavFile
        console.log(response.data)
        const currentWavPath = bucket_path + response.data;//urlを返すようにaws flask側を変更
        const currentRef = ref(storage, currentWavPath)
        getDownloadURL(currentRef)
        .then((url) => {
          console.log("wavUrl", url)
          //existingがfalseなのでindexでの保存処理あり
          res.status(200).json({ prompt: userInput, result: resultString, wav: url, hash: hashString, repeat: 1});
        })
        .catch((error) => {
          res.status(200).json({ prompt: userInput, result: resultString, wav: error});
        })
      } catch (error) {
        res.status(400).json({ prompt: userInput, result: "espnet serverが起動していません", wav: error});
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

const generateMessages = (input, fewShot, pre) => {
  let messages = []
  if (pre.output != "") {
    messages = [
      //preのfewShotは使わない。systemひとつに対してuserとassistantの会話が続く
      {"role": "system", "content": fewShot},
      {"role": "user", "content": pre.input},
      {"role": "assistant", "content": pre.output},
      {"role": "user", "content": input}     
    ]
  } else {
    messages = [
      {"role": "system", "content": fewShot},
      {"role": "user", "content": input}   
    ]   
  }
  console.log(messages)
  return messages
}
