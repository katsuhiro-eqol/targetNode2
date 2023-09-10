import axios from 'axios';
import { storage } from "../../lib/FirebaseConfig";
import { ref, getDownloadURL } from "firebase/storage";

export default async function (req, res) {
  const bucket_path = "gs://targetproject-394500.appspot.com/" //cloud storage bucket
  const silent = "https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/o/setto%2Fno_sound.mp3?alt=media&token=99787bd0-3edc-4f9a-9521-0b73ad65eb0a"
  const speech = "https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/o/setto%2F85602777dc2cbb2c4806cc5c5070b422.wav?alt=media&token=cce161c5-c0dd-468f-96a9-7fbf1660e434"

  const onsei = ["https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/o/setto%2F85602777dc2cbb2c4806cc5c5070b422.wav?alt=media&token=cce161c5-c0dd-468f-96a9-7fbf1660e434",
"https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/o/setto%2F683ebfeeee44051468a6afebb817b652.wav?alt=media&token=060dddf7-46b5-401c-bc25-02ce0d5efca9",
"https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/o/setto%2F59cee8e548b7fb968316be3f271b2d52.wav?alt=media&token=fb5ffb1f-cb71-49be-aad8-e841c4345642"]

const userInput = req.body.message || '';
const character = req.body.character;
console.log(userInput)
  const file = onsei[Math.floor(Math.random() * onsei.length)]
  console.log(file)
  res.status(200).json({ wav: file });
}

const listFiles = () => {
  let files = []
  const path = bucket_path + "setto"
  const listRef = ref(storage, path);
  listAll(listRef)
  .then((res) => {
    res.items.forEach((itemRef) => {
      files.push(itemRef.name)
    });
    setWavFiles(files)
  }).catch((error) => {
    console.log(error)
  });
}