import axios from 'axios';
import { storage } from "../../lib/FirebaseConfig";
import { ref, getDownloadURL } from "firebase/storage";
import { db } from "../../lib/FirebaseConfig";
import { doc, getDoc, updateDoc, arrayUnion,Timestamp } from "firebase/firestore";
import md5 from 'md5';

const url = "http://54.70.243.84:5000" //espnet@aws
const bucket_path = "gs://targetproject-394500.appspot.com/" //cloud storage bucket

export default async function (req, res) {

  const userInput = req.body.input || '';
  const character = req.body.character;
  const characterOutput = req.body.characterOutput;

    //resultStringをsha512でハッシュ化
    const hashString = md5(characterOutput)
    const wavfile = hashString
    try {
      const query = url + "?input=" + characterOutput + "&hash=" + hashString + "&character=" + character
      //responseは、CloudStorageの音声ファイル認証urlにする
      const response = await axios.get(query);
      //ここ修正必要　生成したwavファイルのurlを取得してsetWavFile
      const currentWavPath = bucket_path + response.data;//urlを返すようにaws flask側を変更
      console.log(currentWavPath)
      const currentRef = ref(storage, currentWavPath)
      getDownloadURL(currentRef)
      .then((url) => {
        console.log("wavUrl", url)
        res.status(200).json({ wav: url, filename: hashString });
      })
      .catch((error) => {
        res.status(200).json({ wav: error});
      })
      //res.status(200).json({ prompt: userInput, result: resultString, wav: wavDir});
    } catch (error) {
     // データ取得が失敗した場合
      console.error(error);
    }
}


const generatePrompt = (input) => {
  return `${input} ->`
}

