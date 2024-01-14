import "regenerator-runtime";
import React from "react";
import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import styles from "./index.module.css";

//音声ファイルチェックおよびアニメーションテスト
export default function CheckSpeech() {
const no_sound = "https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/o/setto%2Fno_sound.mp3?alt=media&token=99787bd0-3edc-4f9a-9521-0b73ad65eb0a"
const initialSlides = new Array(1).fill("Kanshi-00.jpg")
  const [character, setCharacter] = useState("bauncer");
  const [userInput, setUserInput] = useState("");
  const [wavUrl, setWavUrl] = useState(no_sound);
  const [wavReady, setWavReady] = useState(false)
  const [comment, setComment] = useState("")
  const [slides, setSlides] = useState(initialSlides)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioRef = useRef(null)
  //const intervalRef = useRef(null)
  //const characters = ["silva", "setto", "bauncer"];
  const scaList = {silva: "1.0", setto: "1.2", bauncer: "1.0"}

  async function onSubmit(event) {
    setWavUrl("")
    setCurrentIndex(0)
    event.preventDefault();
    try {
    const response = await fetch("/api/checkspeechfile", {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: userInput, character: character, sca: scaList[character]}),
    });

    const data = await response.json();
    if (response.status !== 200) {
        throw data.error || new Error(`Request failed with status ${response.status}`);
    }
    setWavUrl(data.wav);
    setIsSpeaking(true)
    setComment(data.comment)

    /*   
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
    console.log(data.id, sdata)
    const docRef = doc(db, "Speech", data.id);
    setDoc(docRef, sdata) 


    let newS = []
    data.slides.filter((value, index) => {
        if (index%3 === 0){
            newS.push(value)
        }
    })
    setSlides(newS)
    */
    } catch(error) {
    console.error(error);
    alert(error.message);
    }
}

const selectCharacter = (e) => {
setCharacter(e.target.value);
console.log(e.target.value);
}

const talkStart = async () => {
  setWavReady(true)
}

const audioPlay = () => {
    audioRef.current.play()
    setCurrentIndex(0)
}

/*
const animeStart = () => {
    //audioPlay()
    if (intervalRef.current !== null) {//タイマーが進んでいる時はstart押せないように//2
        return;
    }
    intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % (slides.length))
    }, 35)
}
*/

useEffect(() => {
    if (isSpeaking && currentIndex === slides.length-2){
        setSlides(initialSlides)
        setCurrentIndex(0)
        setIsSpeaking(false)
        setWavUrl("")
    } else if (!isSpeaking && currentIndex === slides.length-1){
        setCurrentIndex(0)
    }
}, [currentIndex]);

  useEffect(() => {
    audioPlay()
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
        <title>target</title>
        Feature-Policy: autoplay 'self' https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/
      </Head>
      <main className={styles.main}> 
      <h3>音声合成および保存されたファイルの確認</h3>
        <form onSubmit={onSubmit}>
          <textarea
            type="text"
            name="message"
            placeholder="音声合成するテキストを入力してください"
            rows="3"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
          <input disabled={!wavReady} type="submit" value="音声を確認" />
        </form>
        {(wavReady) ? (<img className={styles.anime} src={slides[currentIndex]} alt="Image" />) : (
          <button className={styles.button} onClick={() => {audioPlay(); talkStart()}}>一番最初にタップして開始</button>
        )}
        <br/>
        <audio src={wavUrl} ref={audioRef}/>
        <div>{comment}</div>
        <div className={styles.none} >{wavUrl}</div>
      </main>
    </div>
  );
}
