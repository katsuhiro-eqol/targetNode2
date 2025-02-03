//api/conversation.js

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
const ttsApiKey = process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY

export default function Index2() {
  const initialSlides = new Array(1).fill("Kanshi-00.jpg")
  //const slideOption = ["Sil_00.jpg","Sil_01-A.jpg","Sil_02-I.jpg","Sil_03-U-O.jpg","Sil_04-E.jpg","Sil_03-U-O.jpg"]
  const [user, setUser] = useState("user1")
  const [userInput, setUserInput] = useState("")
  const [prompt, setPrompt] = useState("")
  const [result, setResult] = useState("")
  const [history, setHistory] = useState([])
  const [wavUrl, setWavUrl] = useState(no_sound);
  const [slides, setSlides] = useState(initialSlides)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [wavReady, setWavReady] = useState(false)
  const [record,setRecord] = useState(false)
  const [canSend, setCanSend] = useState(false)
  const [yourLanguage, setYourLanguage] = useState("en-US")
  const audioRef = useRef(null)
  const intervalRef = useRef(null)
  const yourLanguages = ["en-US", "ja-JP"]

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
    setResult("waiting....")
    let setting = ""
    if (yourLanguage == 'ja-JP'){
        setting = "You understand but never use Japanese.Answer in English within 25 words"
    } else {
        setting = "You are English teacher living in Japan.Answer within 25 words"
    }
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
        body: JSON.stringify({ input: userInput, setting: setting, history: refer, user: user }),
    });

    const data = await response.json();
    if (response.status !== 200) {
        throw data.error || new Error(`Request failed with status ${response.status}`);
    }

    //setWavUrl(data.audio);
    googleTTS(data.result)
    setResult("・・・")
    setPrompt(data.prompt)
    setTimeout(() => {
        setResult(data.result) 
    }, 5000);

    const updates = refer.concat([{"role": "user", "content": data.prompt}, {"role": "assistant", "content": data.result}])
    setHistory(updates)
    //console.log(history)
    } catch(error) {
    console.error(error);
    alert(error.message);
    }
  }

  const googleTTS = async (result) => {
    const audio = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key='+ ttsApiKey, {  // ご自身のAPI-Keyを入れてください。
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        input: {
            text: result,
        },
        voice: {
            languageCode: 'en-US',
            ssmlGender: 'NEUTRAL',
        },
        audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: '1.25',
        },
        }),
    })
    const audio_data = await audio.json();

    if (audio_data.audioContent) {
      console.log(typeof(audio_data.audioContent))
      console.log(audio_data.audioContent)
      const audioBlob = base64ToBlob(audio_data.audioContent, 'audio/mp3');
      const audioUrl = URL.createObjectURL(audioBlob);
      setWavUrl(audioUrl);
    }
  }

  function base64ToBlob(base64Data, contentType) {
    const byteCharacters = atob(base64Data);
    const byteArrays = [];
  
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
  
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
  
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
      console.log(byteArrays.length)
    }
  
    const blob = new Blob(byteArrays, { type: contentType });
    return blob;
  }
  
  const createSlides = (duration) => {
    let imageList = []
    const n = Math.floor(duration*2)+1
    for (let i = 0; i<n; i++){
        const s1 = new Array(1).fill("Kanshi-01.jpg")
        const s2 = new Array(1).fill("Kanshi-00.jpg")
        imageList = imageList.concat(s1)
        imageList = imageList.concat(s2)
    }
    const s = new Array(1).fill("Kanshi.jpg")
    imageList = imageList.concat(s)

    return imageList
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

const selectYourLanguage = (e) => {
    setYourLanguage(e.target.value);
    console.log(e.target.value);
  }

  const audioPlay = () => {
    audioRef.current.play()
    setCurrentIndex(0)
  }

  const audioAndSlidePlay = () => {
    audioRef.current.play().then(() => {
        setSlides(createSlides(audioRef.current.duration))
        console.log(audioRef.current.duration)
    })
  }

  const sttStart = () => {
    setUserInput("")
    setRecord(true)
    SpeechRecognition.startListening({ language: yourLanguage })
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
    console.log("wav:", wavUrl)
    audioAndSlidePlay()
  }, [wavUrl])

  useEffect(() => {
    setCurrentIndex(0)
    if (slides.length !== initialSlides.length){
      if (intervalRef.current !== null) {//タイマーが進んでいる時はstart押せないように//2
        return;
      }
      intervalRef.current = setInterval(() => {
          setCurrentIndex((prevIndex) => (prevIndex + 1) % (slides.length))
      }, 250)
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
        //setWavUrl("")
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
        <title>e-friends</title>
        Feature-Policy: autoplay 'self' https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/
      </Head>
      <main className={styles.main}>
      {(wavReady) ? (
      <div className={styles.image_container}>
      <img className={styles.anime} src={slides[currentIndex]} alt="Image" />
      <div className={styles.output} onClick={() => {audioAndSlidePlay()}}>{result}</div>
      <div className={styles.output}>{currentIndex}</div>
      </div>
      ) : (
        <div className={styles.image_container}>
        <h3>e-Friends</h3>
        <div>
        あなたが使用する言語
        <select className={styles.select3} value={yourLanguage} label="character" onChange={selectYourLanguage}>
        {yourLanguages.map((name) => {
          return <option key={name} value={name}>{name}</option>;
        })}
        </select>
        <br/>
        </div>
          <button className={styles.button} onClick={() => {audioPlay(); talkStart()}}>start</button>
        </div>
        )}
      {wavReady && (
      <div className={styles.bottom_items}>
       <form onSubmit={onSubmit}>
       <textarea
         type="text"
         name="message"
         placeholder="your message"
         rows="2"
         value={userInput}
         onChange={(e) => setUserInput(e.target.value)}
       />
     </form>
     <div className={styles.button_container}>
          {!record ?(
            <Button className={styles.button} disabled={!wavReady} variant="outlined" onClick={sttStart}>
              <MicIcon />
              vioce
            </Button>
          ):(
            <Button color="secondary" className={styles.button} variant="outlined" onClick={sttStop}>
              <StopIcon />
              stop
            </Button>)}

          <Button className={styles.button} disabled={!canSend||record} variant="contained" onClick={(event) => onSubmit(event)}>
            <SendIcon />
            send
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
