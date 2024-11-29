
import "regenerator-runtime";
import React from "react";
import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import Button from '@mui/material/Button';
import MicIcon from '@mui/icons-material/Mic';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import { db, storage } from "../lib/FirebaseConfig";
import { ref, getDownloadURL} from "firebase/storage";
import { collection, query, where, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import { format } from 'data-fns'
import styles from "./index.module.css";

const no_sound = "https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/o/setto%2Fno_sound.mp3?alt=media&token=99787bd0-3edc-4f9a-9521-0b73ad65eb0a"
//const timestamp = Timestamp.now();
//const today = timestamp.toDate();


//20240228 定型挨拶およびアニメーションのないバージョン
export default function Guide() {
  const initialSlides = new Array(1).fill("Sil_00.jpg")
  const [character, setCharacter] = useState("silva")
  const [userInput, setUserInput] = useState("")
  const [prompt, setPrompt] = useState("")
  const [result, setResult] = useState("")

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
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();


  const silvaLists = [["Sil_01-A.jpg", "Sil_00.jpg", "Sil_02-I.jpg", "Sil_04-E.jpg"],["Sil_03-U-O.jpg", "Sil_04-E.jpg", "Sil_00.jpg", "Sil_00.jpg"], ["Sil_02-I.jpg", "Sil_00.jpg", "Sil_03-U-O.jpg","Sil_01-A.jpg"]]

  async function onSubmit(event) {
    event.preventDefault();
    setWavUrl("")
    setRecord(false)
    setCanSend(false)//同じInputで繰り返し送れないようにする
    //const start = new Date().getTime()
    setPrompt(userInput)
    setResult("応答を待ってます・・・")

    try {
    const response = await fetch("/api/generate_vits2", {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        },
        //body: JSON.stringify({ input: userInput, character: character, fewShot: fewShot, previousData: previousData, sca: scaList[character] }),
        body: JSON.stringify({ input: userInput, setting: setting, history: refer, character: character}),
    });

    const data = await response.json();
    if (response.status !== 200) {
        throw data.error || new Error(`Request failed with status ${response.status}`);
        }

    if (data.wavUrl == ""){

    } else {
        setWavUrl(data.wavUrl)
        const imageList = createSlides(data.frame)
        setSlides(imageList)
        updateSpeech(data.id, data.repeat)
    }
    const responseTime = new Date().getTime()
    console.log(responseTime)
    console.log(responseTime - startTime)

    setResult("・・・")
    setPrompt(data.prompt)
    setTimeout(() => {
        setResult(data.result) 
    }, 3000);

    } catch(error) {
    console.error(error);
    alert(error.message);
    }

  }

  const registrationSpeech = async(wav, id, pronunciation, frame, url, audioString, resultString) => {
    const fileName = wav.split("/")[2]
    const today = new Date().toISOString()

    const data = {
        output: resultString,
        modified: audioString,
        repeat: 1,
        status: "created by server system",
        updated_at: today,
        filename: fileName,
        url: url,
        frame:frame,
        pronunciation:pronunciation
    }
    const docRef = doc(db, "SpeechVITS", id);
    await setDoc(docRef, data, {merge:true}) 
    }

    /*
    const getEmbedding = async(prompt, result) => {
        const conversation = "user:" + prompt + ",assistant:" + result
        const response = await fetch("/api/embedding", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({conversation:conversation}),
          });
          const data2 = await response.json();
          const embedding = data2.embedding
          return embedding
    }
    */

    const originalInfo = async() => {
        let charactersData = ""
        if (character == "silva"){
        charactersData = "hamefura"
        } else {
        charactersData = "アイデアファクトリー"
        }
    }

    const loadGreetingData = async(text) => {
        const speechRef = collection(db, "SpeechVITS");
        const q = query(speechRef, where("output", "==", text));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const data = doc.data()

            const imageList = createSlides(data.frame)
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


    const selectCharacter = (e) => {
        setCharacter(e.target.value);
        console.log(e.target.value);
    }

    const createSlides = (frame) => {

        //bauncerの場合だけ点滅アニメーション。0.5秒で点滅。
        let imageList = []
        if (character == "bauncer"){
        const n = Math.floor(frame/44100)+1 //0.5秒
        for (let i = 0; i<n; i++){
            const s1 = new Array(2).fill("Kanshi-01.jpg")
            const s2 = new Array(2).fill("Kanshi-00.jpg")
            imageList = imageList.concat(s1)
            imageList = imageList.concat(s2)
        }
        const s = new Array(1).fill("Kanshi-00.jpg")
        imageList = imageList.concat(s)
        } else {
        const n = Math.floor(frame/44100)+1 //0.25秒
        for (let i = 0; i<n; i++){
            const m = Math.floor(Math.random()*3)
            imageList = imageList.concat(silvaLists[m])
        }
        const s = new Array(1).fill("Sil_00.jpg")
        imageList = imageList.concat(s)
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

        return () => {
            clearInterval(intervalRef.current);
            intervalRef.current = null// コンポーネントがアンマウントされたらタイマーをクリア
            resetTranscript()
        };
    },[])

  useEffect(() => {
    if (character == "silva"){
      const s = new Array(1).fill("Sil_00.jpg")
      setSlides(s)
    } else {
      const s = new Array(1).fill("Kanshi-00.jpg")
      setSlides(s)
    }
  },[character])

  //20240228ヴァージョンはアニメーション省略なのでwavUrlが更新されたらaudioPlayする
  useEffect(() => {
    audioPlay()
    setCurrentIndex(0)
    if (slides.length !== 1){
      if (intervalRef.current !== null) {//タイマーが進んでいる時はstart押せないように//2
        return;
      }
      //intervalはcreateBauncerSlides()に合わせる
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % (slides.length))
      }, 250)

      /*
      audioRef.current.play().then(() => {
        setCurrentIndex(0)
      })
      */
    } else {
    /*
      clearInterval(intervalRef.current);
      intervalRef.current = null
    */
    }   
  }, [wavUrl])

  useEffect(() => {
  if (currentIndex === slides.length-2){
    if (character == "silva"){
      const s = new Array(1).fill("Sil_00.jpg")
      setCurrentIndex(0)
      setSlides(s)
      clearInterval(intervalRef.current);
      intervalRef.current = null
      //setWavUrl("")
    } else {
      const s = new Array(1).fill("Kanshi-00.jpg")
      setCurrentIndex(0)
      setSlides(s)
      clearInterval(intervalRef.current);
      intervalRef.current = null
      //setWavUrl("")
    }
    setCurrentIndex(0)
  }
}, [currentIndex]);


  useEffect(() => {
    setUserInput(transcript)
  }, [transcript])

  useEffect(() => {
    if (userInput.length !== 0){
      setCanSend(true)
    }
  }, [userInput])

  return (
    <div>
      <Head>
        <title>target</title>
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
        <div className={styles.image_container}>
        <button className={styles.button3} onClick={() => {audioPlay(); talkStart()}}>AIガイドを始める</button>
        </div>
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