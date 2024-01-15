//以前の会話をembeddingで参照できるようにする
//直前の会話を参照するための関数を導入する func prompt(n)のような形

import "regenerator-runtime";
import React from "react";
import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import Button from '@mui/material/Button';
import MicIcon from '@mui/icons-material/Mic';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import { db } from "../lib/FirebaseConfig";
import { collection, query, where, doc, getDoc, getDocs, setDoc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import styles from "./index.module.css";

const no_sound = "https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/o/setto%2Fno_sound.mp3?alt=media&token=99787bd0-3edc-4f9a-9521-0b73ad65eb0a"
const timestamp = Timestamp.now();
const today = timestamp.toDate();

export default function Bauncer() {
  const initialSlides = new Array(1).fill("Kanshi-00.jpg")
  const [character, setCharacter] = useState("bauncer")
  const [userInput, setUserInput] = useState("")
  const [prompt, setPrompt] = useState("")
  const [result, setResult] = useState("")
  const [history, setHistory] = useState([])
  const [items, setItems] = useState([]) //固有名詞リスト
  const [info, setInfo] = useState({}) //固有名詞情報
  const [greetings, setGreetings] = useState([]) //定型QAリスト
  const [gInfo, setGInfo] = useState({}) //定型QA情報
  //wavUrl：cloud storageのダウンロードurl。初期値は無音ファイル。これを入れることによって次からセッティングされるwavUrlで音がなるようになる。
  const [wavUrl, setWavUrl] = useState(no_sound);
  const [slides, setSlides] = useState(initialSlides)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [wavReady, setWavReady] = useState(false)
  const [record,setRecord] = useState(false)
  const [canSend, setCanSend] = useState(false)
  const audioRef = useRef(null)
  const intervalRef = useRef(null)
  const characters = ["bauncer"]
  const characterName = "バウンサー"
  const scaList = {silva: "1.0", setto: "1.2", bauncer: "1.0"}
  const selfwords = ["貴方", "あなた", "君"]
  const user = "tester" //登録情報より取得
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const conversion = {獲端:"獲端",エバナ:"獲端",茅ヶ崎:"茅ヶ崎",茅ケ崎:"茅ヶ崎",チガサキ:"茅ヶ崎",凝部:"凝部",ギョウブ:"凝部",射落:"射落",イオチ:"射落",双巳:"双巳",フタミ:"双巳",陀宰:"陀宰",ダザイ:"陀宰",廃寺:"廃寺",ハイジ:"廃寺",明瀬:"明瀬",アカセ:"明瀬",萬城:"萬城",バンジョウ:"萬城",瀬名:"瀬名",セナ:"瀬名",バウンサー:"バウンサー",監視者:"バウンサー",ディレクター:"ディレクター",プロデューサー:"プロデューサー"}
  const resetString = ["その情報には、ロックが掛かっています。","ありません。","お答え出来ません。","感情の機能は、備わっていません。","ご質問内容が、エラーです。","その機能は備わっていません。","食事の機能は備わっていません。","必要ありません。"]
  async function onSubmit(event) {
    event.preventDefault();
    setWavUrl("")
    setRecord(false)
    setCanSend(false)//同じInputで繰り返し送れないようにする
    //const start = new Date().getTime()
    setPrompt(userInput)
    setResult("応答を待ってます・・・")

    let refer = []
    if (history.length < 6){
        refer = history
    } else {
        refer = history.slice(-6)
    }
    //定型QAかどうかの判定のための準備
    let preparedGreeting = ""
    greetings.map((item) => {
      if (userInput.search(item) !==-1){
        const selected = gInfo[item]
        preparedGreeting = selected[Math.floor(Math.random() * selected.length)]
      }
    })

    if (preparedGreeting !== ""){
        loadGreetingData(preparedGreeting, 0.5)//intervalを0.5sとしてスライド生成
      //ここまで定型応答。以下はopenAIに投げる。
    } else {
        let setting = "設定に基づいて50字以内で回答すること。設定:"
        let fewShot = ""
        //登録した固有名詞と一致する語があるか検索
        const convKeys = Object.keys(conversion)
        convKeys.map((item) => {
            if (userInput.search(item) !==-1){
                const cItem = conversion[item]
                const t = "設定にないことは回答しない。設定:" + item + "は" + info[cItem].join() + "。"
                fewShot += t
            }
        })

        if (fewShot.length == 0){
            fewShot = "あなたは" + info[characterName].join() + "。知らないことは回答しないでもよい"
        }
        setting += fewShot
        console.log(setting)
      //post
      try {
        const response = await fetch("/api/generate2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          //body: JSON.stringify({ input: userInput, character: character, fewShot: fewShot, previousData: previousData, sca: scaList[character] }),
          body: JSON.stringify({ input: userInput, setting: setting, history: refer, character: character, sca: scaList[character]}),
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

        const imageList = createBauncerSlides(data.duration, 0.5)
        setSlides(imageList)

        if (data.repeat == 1){
          const id = character + "-" + data.hash
          const filename = data.hash + ".wav"
          const sdata = {
            filename: filename,
            output: data.audioString,
            url: data.wav,
            duration: data.duration,
            updated_at: today,
            repeat: 1,
            status: "created by web system. non revised"
          }
          console.log(id, sdata)
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
        //resultがresetStringだったらhistoryを初期化する
        if (resetString.includes(data.result)){
            setHistory([])
        } else {
            const updates = refer.concat([{"role": "user", "content": data.prompt}, {"role": "assistant", "content": data.result}])
            console.log("updates:", updates)
            setHistory(updates)
        }

      } catch(error) {
        console.error(error);
        alert(error.message);
      }
    }
  }

  const originalInfo = async() => {
    const docRef = doc(db, "OriginalInformation", "アイデアファクトリー");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data()
        console.log("Document data:", data);
        const items = Object.keys(data)
        console.log("items:", items);
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
        console.log("Document data:", data);
        const g = Object.keys(data)
        console.log(g)
        setGreetings(g)
        setGInfo(data)
    } else {
    // docSnap.data() will be undefined in this case
    console.log("No such document!");
    }
  }

  const loadGreetingData = async(text, interval) => {
    const speechRef = collection(db, "Speech");
    const q = query(speechRef, where("output", "==", text));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
        const data = doc.data()
        const imageList = createBauncerSlides(data.duration, interval)
        setTimeout(() => {
          setWavUrl(data.url)
          setSlides(imageList)
          setResult("・・・")
        }, 400);
        setTimeout(() => {
          setResult(text)
        }, 3400);
    });
  }

//bauncerのスライドを生成。1countは512frame 512/44100 = 0.0116秒
//トーク中一定間隔で点滅するスライド。点滅感覚をtimeとしてアニメーションインターバルもtimeに合わせる
  const createBauncerSlides = (duration, time) => {
    const durationList = duration.split("&")
    let totalSlides = 0
    durationList.forEach((item) => {
        const itemList = item.split("-")
        const count = parseInt(itemList[3])
        totalSlides += count
    })
    //timeに相当するcount数は
    console.log(totalSlides)
    const intervalCount = Math.floor(time * 44100/512)
    const n = Math.floor(totalSlides/intervalCount) + 4
    console.log(n)
    let imageList = []
    for (let i = 0; i<n; i++){
        if (i%2==0){
            imageList.push("Kanshi-01.jpg")
        } else {
            imageList.push("Kanshi-00.jpg")
        }
    }
    return imageList
  }



    const talkStart = async () => {
    //暫定的にESPnetが立ち上がってなくても使えるようにする
    setWavReady(true)
    sttStart()
    setTimeout(() => {
        sttStop()
        resetTranscript()
    }, 1000);
    }

  const audioPlay = () => {
    audioRef.current.play()
    setCurrentIndex(0)
  }

  const sttStart = () => {
    setUserInput("")
    setRecord(true)
    SpeechRecognition.startListening()
  }

  const sttStop = () => {
    setRecord(false)
    SpeechRecognition.stopListening()
  }

  useEffect(() => {
    originalInfo()
    greetingInfo()
    return () => {
        clearInterval(intervalRef.current);
        intervalRef.current = null// コンポーネントがアンマウントされたらタイマーをクリア
        resetTranscript()
    };
  },[])

  useEffect(() => {
    greetingInfo()
  },[character])

  useEffect(() => {
    setCurrentIndex(0)
  }, [wavUrl])

  useEffect(() => {
    setCurrentIndex(0)
    if (slides.length !== initialSlides.length){
      if (intervalRef.current !== null) {//タイマーが進んでいる時はstart押せないように//2
        return;
      }
      //intervalはcreateBauncerSlides()に合わせる
      intervalRef.current = setInterval(() => {
          setCurrentIndex((prevIndex) => (prevIndex + 1) % (slides.length))
      }, 500)
      audioRef.current.play().then(() => {
        setCurrentIndex(0)
      })
    } else {
      clearInterval(intervalRef.current);
      intervalRef.current = null
    }
  }, [slides])

  useEffect(() => {
    setUserInput(transcript)
  }, [transcript])

  useEffect(() => {
    if (currentIndex === slides.length-2){
        setSlides(initialSlides)
        setCurrentIndex(0)
        setWavUrl("")
    }
  }, [currentIndex]);

  useEffect(() => {
    if (userInput.length !== 0){
      setCanSend(true)
    }
  }, [userInput])

  useEffect(() => {
    console.log(history)
  }, [history])

  return (
    <div>
      <Head>
        <title>はめフラトーク</title>
        Feature-Policy: autoplay 'self' https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/
      </Head>
      <main className={styles.main}>
      {(wavReady) ? (
      <div className={styles.image_container}>
      <img className={styles.anime} src={slides[currentIndex]} alt="Image" />
      <div className={styles.output}>{result}</div>
      <div className={styles.none}>{currentIndex}</div>
      </div>
      ) : (
          <button className={styles.button} onClick={() => {audioPlay(); talkStart()}}>トークを始める</button>
        )}
      {wavReady && (
      <div className={styles.bottom_items}>
       <form onSubmit={onSubmit}>
       <textarea
         type="text"
         name="message"
         placeholder="伝える内容"
         rows="2"
         value={userInput}
         onChange={(e) => setUserInput(e.target.value)}
       />
     </form>
     <div className={styles.button_container}>
          {!record ?(
            <Button className={styles.button} disabled={!wavReady} variant="outlined" onClick={sttStart}>
              <MicIcon />
              音声入力
            </Button>
          ):(
            <Button color="secondary" className={styles.button} variant="outlined" onClick={sttStop}>
              <StopIcon />
              入力停止
            </Button>)}

          <Button className={styles.button} disabled={!canSend||record} variant="contained" onClick={(event) => onSubmit(event)}>
            <SendIcon />
            伝える
          </Button>
        </div>
     </div>
      )}
        <audio src={wavUrl} ref={audioRef}/>
        <div className={styles.none}>{wavUrl}</div>
      </main>
    </div>
  );
}