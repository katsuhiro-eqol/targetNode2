import { db } from "../../lib/FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import md5 from 'md5';

export default async function (req, res) {
  const userInput = req.body.input || '';
  const character = req.body.character;

  if (userInput.length === 0) {
    res.status(400).json({
      error: {
        message: "Please enter message",
      }
    });
    return;
  }

//音声ファイルが存在するかどうか確認
const hashString = md5(userInput)
const id = character + "-" + hashString
const docRef = doc(db, "Speech", id);
const docSnap = await getDoc(docRef);
if (docSnap.exists()) {
    const url = docSnap.data().url
    res.status(200).json({ comment: "", wav: url });
} else {
    res.status(200).json({ comment: "ファイルが存在しません", wav: "" });
    }
}

