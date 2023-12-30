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
  const initialSlides = new Array(1).fill("Sil_00.jpg")
  const slideOption = ["Sil_00.jpg","Sil_01-A.jpg","Sil_02-I.jpg","Sil_03-U-O.jpg","Sil_04-E.jpg","Sil_03-U-O.jpg"]
  const [userInput, setUserInput] = useState("")
  const [prompt, setPrompt] = useState("")
  const [result, setResult] = useState("")
  const [history, setHistory] = useState([])
  const [wavUrl, setWavUrl] = useState(no_sound);
  const [slides, setSlides] = useState(initialSlides)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [wavReady, setWavReady] = useState(false)
  const [record,setRecord] = useState(false)
  const [canSend, setCanSend] = useState(false)
  const audioRef = useRef(null)
  const intervalRef = useRef(null)

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  async function onSubmit(event) {
    event.preventDefault();
    setWavUrl("")
    setRecord(false)
    setCanSend(false)//同じInputで繰り返し遅れないようにする
    setPrompt(userInput)
    setResult("応答を待ってます・・・")
    const setting = "You are English teacher living in Japan.Answer within 25 words"
    let refer = []
    if (history.length < 6){
        refer = history
    } else {
        refer = history.slice(-6)
    }

    try {
    const response = await fetch("/api/conversation", {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: userInput, setting: setting, history: refer }),
    });

    const data = await response.json();
    if (response.status !== 200) {
        throw data.error || new Error(`Request failed with status ${response.status}`);
    }
    setWavUrl("output.mp3");
    setResult("・・・")
    setPrompt(data.prompt)
    setTimeout(() => {
        setResult(data.result) 
    }, 5000);
    let updates = history
    updates = updates.concat([{"role": "user", "content": data.prompt}, {"role": "assistant", "content": data.result}])
    setHistory(updates)
    //console.log(history)
    } catch(error) {
    console.error(error);
    alert(error.message);
    }
  }

  const prepareSlides = (duration) => {
    const slideCount = Math.round(duration / 0.2)
    const arr0 = new Array(5).fill("Sil_00.jpg")
    let imageList = []
    for (let i=0; i<slideCount; i++){
        const selectedIndex = Math.floor(Math.random() * slideOption.length)
        imageList.push(slideOption[selectedIndex])
    }
    imageList = imageList.concat(arr0)
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
    SpeechRecognition.startListening({ language: 'en-US' })
  }

  const sttStop = () => {
    setRecord(false)
    SpeechRecognition.stopListening()
  }

  useEffect(() => {
    return () => {
        clearInterval(intervalRef.current);
        intervalRef.current = null// コンポーネントがアンマウントされたらタイマーをクリア
        resetTranscript()
    };
  },[])

  useEffect(() => {
    //setCurrentIndex(0)
    audioRef.current.play().then(() => {
        setSlides(prepareSlides(audioRef.current.duration))
        console.log(audioRef.current.duration)
    })
  }, [wavUrl])

  useEffect(() => {
    setCurrentIndex(0)
    if (slides.length !== initialSlides.length){
      if (intervalRef.current !== null) {//タイマーが進んでいる時はstart押せないように//2
        return;
      }
      intervalRef.current = setInterval(() => {
          setCurrentIndex((prevIndex) => (prevIndex + 1) % (slides.length))
      }, 200)
      /*
      audioRef.current.play().then(() => {
        setCurrentIndex(0)
      })
      */
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
      <div>{currentIndex}</div>
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
