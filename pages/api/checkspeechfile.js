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
    const data = docSnap.data()
    const keys = Object.keys(data)
    const url = data.url
    if (keys.includes("duration")){
        const duration = data.duration
        const imageList = durationResolve(duration)
        res.status(200).json({ comment: "", wav: url, slides: imageList });
    }else{
        res.status(200).json({ comment: "アニメーションデータがありません", wav: url, slides: [] });
    }
} else {
    res.status(200).json({ comment: "ファイルが存在しません", wav: "", slides: [] });
    }
}

const durationResolve = (text) => {
    const durationList = text.split("&")
    let imageList = new Array(3).fill("Sil_00.jpg")
    durationList.forEach((item) => {
        const itemList = item.split("-")
        const child = itemList[1]
        const mother = itemList[2]
        const count = parseInt(itemList[3])

        switch(mother){
            case "9":
                const arr1 = new Array(count).fill("Sil_01-A.jpg")
                imageList = imageList.concat(arr1)
                break
            case "12":
                const arr2 = new Array(count).fill("Sil_02-I.jpg")
                imageList = imageList.concat(arr2)
                break
            case "14":
                const arr3 = new Array(count).fill("Sil_03-U-O.jpg")
                imageList = imageList.concat(arr3)                   
                break
            case "15":
                const arr4 = new Array(count).fill("Sil_04-E.jpg")
                imageList = imageList.concat(arr4)
                break
            case "10":
                const arr5 = new Array(count).fill("Sil_03-U-O.jpg")
                imageList = imageList.concat(arr5)
                break
            case "23":
            case "25":
            case "35":
                const arr_n = new Array(count).fill("Sil_00.jpg")
                imageList = imageList.concat(arr_n)
                break
            default:
                const arr_n2 = new Array(1).fill("Sil_00.jpg")
                imageList = imageList.concat(arr_n2)
                break
        }
    })
    const lastImage = imageList.slice(-1)[0]
    const arr_6 = new Array(12).fill(lastImage)
    const arr_n3 = new Array(48).fill("Sil_00.jpg")
    imageList = imageList.concat(arr_6)
    imageList = imageList.concat(arr_n3)
    return imageList
}