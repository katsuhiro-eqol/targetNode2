import "regenerator-runtime";
import React, { startTransition } from "react";
import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import Button from '@mui/material/Button';
import MicIcon from '@mui/icons-material/Mic';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import { db } from "../lib/FirebaseConfig";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import styles from "./index.module.css";

const no_sound = "https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/o/setto%2Fno_sound.mp3?alt=media&token=99787bd0-3edc-4f9a-9521-0b73ad65eb0a"
const timestamp = Timestamp.now();
const today = timestamp.toDate();

export default function Index2() {
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
  const [wavReady, setWavReady] = useState(false)
  const [record,setRecord] = useState(false)
  const audioRef = useRef(null)
  const characters = ["silva", "setto"];
  const characterName = {silva: "シルヴァ", setto: "セット"}
  const selfwords = ["貴方", "あなた", "君"]
  const user = "tester" //登録情報より取得
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  async function onSubmit(event) {
    event.preventDefault();
    const start = new Date().getTime()
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
      //応答が早すぎる
      setResult(preparedGreeting["output"])
      setWavUrl(preparedGreeting["url"])
      const convRef = doc(db, "Conversations", user)
      const cdata = {
        character: character,
        input: userInput,
        output: preparedGreeting["output"],
        date: today
      }
      updateDoc(convRef, {conversation: arrayUnion(cdata)})   
      setUserInput("")    
    } else {
      let setting = ""
      let fewShot = ""
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
      try {
        const response = await fetch("/api/generate2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input: userInput, character: character, fewShot: fewShot, pre: pre }),
        });
  
        const data = await response.json();
        if (response.status !== 200) {
          throw data.error || new Error(`Request failed with status ${response.status}`);
        }
        setWavUrl(data.wav);
        setPrompt(data.prompt)
        setResult(data.result)
        setPFewShot(fewShot)

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
            updated_at: today,
            repeat: 1
          }
          const docRef = doc(db, "Speech", id);
          setDoc(docRef, sdata) 
        } else {
          const id = character + "-" + data.hash
          const sdata = {
            repeat: data.repeat
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

  const talkStart = async () => {
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
  }

  const selectCharacter = (e) => {
    setCharacter(e.target.value);
    console.log(e.target.value);
  }

  const originalInfo = async() => {
    const docRef = doc(db, "OriginalInformation", "hamefura");
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
        console.log("greetings:", g);
        setGreetings(g)
        setGInfo(data)
    } else {
    // docSnap.data() will be undefined in this case
    console.log("No such document!");
    }
  }

  const audioPlay = () => {
    audioRef.current.play()
  }

  const sttStart = () => {
    setRecord(true)
    SpeechRecognition.startListening()
  }

  const sttStop = () => {
    setRecord(false)
    SpeechRecognition.stopListening()
    setUserInput(transcript)
    resetTranscript()
  }

  const sttReset = () => {
    resetTranscript()
  }

  useEffect(() => {
    originalInfo()
    greetingInfo()
  },[])

  useEffect(() => {
    greetingInfo()
  },[character])

  useEffect(() => {
    console.log(wavUrl)
    audioPlay()
  }, [wavUrl])

  return (
    <div>
      <Head>
        <title>はめフラトーク</title>
        Feature-Policy: autoplay 'self' https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/
      </Head>
      <main className={styles.main}>
      <div>
      <select className={styles.select1} value={character} label="character" onChange={selectCharacter}>
        {characters.map((name) => {
          return <option key={name} value={name}>{name}</option>;
        })}
      </select>
      </div>    
        <h3>{characterName[character]}とトークしてみよう
        </h3>
        <form onSubmit={onSubmit}>
          <textarea
            type="text"
            name="message"
            placeholder="伝える内容"
            rows="3"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
        </form>
        <div className={styles.result}>{prompt}</div>
        <div className={styles.result}>{result}</div>
        <div className={styles.none}>{pfewShot}</div>
        <br/>
        <audio src={wavUrl} ref={audioRef}/>
        <div className={styles.none}>{wavUrl}</div>
        <div>
          {!record ?(
            <Button className={styles.button} disabled={!wavReady} variant="contained" onClick={sttStart}>
              <MicIcon />
              音声入力
            </Button>
          ):(
            <Button className={styles.button} variant="contained" onClick={sttStop}>
              <StopIcon />
              入力停止
            </Button>)}

          <Button className={styles.button} disabled={!wavReady} variant="contained" onClick={(event) => onSubmit(event)}>
            <SendIcon />
            送信
          </Button>
        </div>
        <br/>
        <div>{transcript}</div>
        {(wavReady) ? (<button className={styles.none} onClick={audioPlay}>speak!!</button>) : (
          <button className={styles.button} disabled={wavReady} onClick={() => {talkStart(); audioPlay()}}>トークを始める</button>
        )}
      </main>
    </div>
  );
}
