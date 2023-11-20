import "regenerator-runtime";
import React from "react";
import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import { db } from "../lib/FirebaseConfig";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import styles from "./index.module.css";

const no_sound = "https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/o/setto%2Fno_sound.mp3?alt=media&token=99787bd0-3edc-4f9a-9521-0b73ad65eb0a"
const timestamp = Timestamp.now();
const today = timestamp.toDate();


export default function Animation() {
const initialSlides = new Array(300).fill("Sil_00.jpg")
  const [character, setCharacter] = useState("silva");
  const [userInput, setUserInput] = useState("");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [pfewShot, setPFewShot] = useState(""); //ひとつ前のfewShot
  const [items, setItems] = useState([]) //固有名詞リスト
  const [info, setInfo] = useState({}) //固有名詞情報
  const [greetings, setGreetings] = useState([]) //定型QAリスト
  const [gInfo, setGInfo] = useState({}) //定型QA情報
  //wavUrl：cloud storageのダウンロードurl。初期値は無音ファイル。これを入れることによって次からセッティングされるwavUrlで音がなるようになる。
  const [wavUrl, setWavUrl] = useState(no_sound);
  const [slides, setSlides] = useState(initialSlides)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [wavReady, setWavReady] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [started, setStarted] = useState(false)
  const audioRef = useRef(null)
  const intervalRef = useRef(null)
  const characters = ["silva", "setto"];
  const characterName = {silva: "シルヴァ", setto: "セット"}
  const scaList = {silva: "1.0", setto: "1.2"}
  const selfwords = ["貴方", "あなた", "君"]
  const user = "tester" //登録情報より取得

  async function onSubmit(event) {
    event.preventDefault();
    setWavUrl("")
    setIsSpeaking(true)
    //const start = new Date().getTime()
    setPrompt(userInput)
    setResult("応答を待ってます・・・")

    //定型QAかどうかの判定のための準備
    let preparedGreeting = {}
    greetings.map((item) => {
      if (userInput.search(item) !==-1){
        const selected = gInfo[item]
        preparedGreeting = selected[Math.floor(Math.random() * selected.length)]
      }
    })

    if (Object.keys(preparedGreeting).length !== 0){
      const imageList = durationResolve(preparedGreeting["duration"])
      let newS = []
      imageList.filter((value, index) => {
          if (index%3 === 0){
              newS.push(value)
          }
      })      
      setTimeout(() => {
        setWavUrl(preparedGreeting["url"])
        setSlides(newS)
        setResult("・・・")
      }, 700);
      setTimeout(() => {
        setResult(preparedGreeting["output"])
      }, 3700);
      const convRef = doc(db, "Conversations", user)
      const cdata = {
        character: character,
        input: userInput,
        output: preparedGreeting["output"],
        date: today
      }
      updateDoc(convRef, {conversation: arrayUnion(cdata)})   
      setUserInput("")    
      //ここまで定型応答。以下はopenAIに投げる。
    } else {
      let setting = ""
      let fewShot = ""
      //固有情報をプロンプトに加えるための処理
      items.map((item) => {
          if (userInput.search(item) !==-1){
              const t = item + "は" + info[item].join() + "。"
              setting += t
          }
      })
      selfwords.map((word) => {
          if (userInput.search(word) !==-1){
              const name = characterName[character]
              const t = "あなたは" + info[name].join() + "。"
              setting += t
          }
      })
      if (setting !== ""){
        //settingない場合はfewShotを入れない（文字数を減らす）
        fewShot = "以下の設定に矛盾しないよう回答すること。設定：" + setting
      }
      const pre = {input: prompt, output: result, fewShot: pfewShot}
      //post
      try {
        const response = await fetch("/api/generate2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input: userInput, character: character, fewShot: fewShot, pre: pre, sca: scaList[character] }),
        });
  
        const data = await response.json();
        if (response.status !== 200) {
          throw data.error || new Error(`Request failed with status ${response.status}`);
        }
        setWavUrl(data.wav);
        setResult("・・・")
        setPrompt(data.prompt)
        setTimeout(() => {
          setResult(data.result) 
        }, 3000);
        setPFewShot(fewShot)
        let newS = []
        data.slides.filter((value, index) => {
            if (index%3 === 0){
                newS.push(value)
            }
        })
        if (newS.length >0){
            setSlides(newS)
        }
        const convRef = doc(db, "Conversations", user)
        const cdata = {
          character: character,
          input: data.prompt,
          output: data.result,
          date: today
        }
        updateDoc(convRef, {conversation: arrayUnion(cdata)}) 
        if (data.repeat == 1){
          const id = character + "-" + data.hash
          const filename = data.hash + ".wav"
          const sdata = {
            filename: filename,
            output: data.result,
            url: data.wav,
            duration: data.duration,
            updated_at: today,
            repeat: 1,
            status: "created by web system. non revised"
          }
          const docRef = doc(db, "Speech", id);
          setDoc(docRef, sdata) 
        } else {
          const id = character + "-" + data.hash
          const sdata = {
            repeat: data.repeat,
            updated_at: today
          }
          const docRef = doc(db, "Speech", id);
          setDoc(docRef, sdata, {merge:true}) 
        }
        setUserInput("");
      } catch(error) {
        console.error(error);
        alert(error.message);
      }
    }
  }

  const durationResolve = (text) => {
    const durationList = text.split("&")
    let imageList = new Array(9).fill("Sil_00.jpg")
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

  const talkStart = async () => {
    setWavReady(true)
    /*
    setResult("キャラクターと接続中です")
    try {
      const response = await fetch("/api/dockerInit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ character: character }),
      });
      const data = await response.json();
      if (data.wav.length !== 0) {
        setWavReady(true)
        setResult("")
      } else {
        setResult(data.result)
      }
    } catch(error) {
      console.log(error)
    }
    */
  }

  useEffect(() => {
    if (currentIndex === slides.length-2){
        setSlides(initialSlides)
        setCurrentIndex(0)
        setWavUrl("")
    }
  }, [currentIndex]);

  const selectCharacter = (e) => {
    setCharacter(e.target.value);
    console.log(e.target.value);
  }

  const originalInfo = async() => {
    const docRef = doc(db, "OriginalInformation", "hamefura");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data()
        const items = Object.keys(data)
        setItems(items)
        setInfo(data)
    } else {
    console.log("No such document!");
    }
  }

  const greetingInfo = async() => {
    const docRef = doc(db, "Greeting", character);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data()
        const g = Object.keys(data)
        setGreetings(g)
        setGInfo(data)
    } else {
    // docSnap.data() will be undefined in this case
    console.log("No such document!");
    }
  }

  const audioPlay = () => {
    audioRef.current.play()
    setCurrentIndex(0)
  }

  useEffect(() => {
    originalInfo()
    greetingInfo()
    if (intervalRef.current !== null) {//タイマーが進んでいる時はstart押せないように//2
        return;
      }
      intervalRef.current = setInterval(() => {
          setCurrentIndex((prevIndex) => (prevIndex + 1) % (slides.length))
      }, 35)

    return () => {
        clearInterval(intervalRef.current);
        intervalRef.current = null// コンポーネントがアンマウントされたらタイマーをクリア
    };
  },[])

  useEffect(() => {
    greetingInfo()
  },[character])

  useEffect(() => {
    //audioPlay()
  }, [wavUrl])

  useEffect(() => {
    setCurrentIndex(0)
    if (slides !== initialSlides){
      audioRef.current.play().then(() => {
        setCurrentIndex(0)
      })
    }
  }, [slides])

  return (
    <div>
      <Head>
        <title>はめフラトーク</title>
        Feature-Policy: autoplay 'self' https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/
      </Head>
      <main className={styles.main}>
      <div>
      {(wavReady) ? (<img className={styles.anime} src={slides[currentIndex]} alt="Image" />) : (
          <button className={styles.button} onClick={() => {audioPlay(); talkStart()}}>トークを始める</button>
        )}
      </div>    
      {wavReady && (
        <div className={styles.bottom_items}>
        <div className={styles.result}>{prompt}</div>
        <div className={styles.result}>{result}</div>        
       <form onSubmit={onSubmit}>
       <textarea
         type="text"
         name="message"
         placeholder="伝える内容"
         rows="2"
         value={userInput}
         onChange={(e) => setUserInput(e.target.value)}
       />
       <input disabled={!wavReady} type="submit" value="伝える" />
     </form>
     </div>
      )}
        <div className={styles.none}>{pfewShot}</div>
        <audio src={wavUrl} ref={audioRef}/>
        <div className={styles.none}>{wavUrl}</div>
      </main>
    </div>
  );
}
