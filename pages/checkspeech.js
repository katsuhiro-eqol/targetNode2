import "regenerator-runtime";
import React from "react";
import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import styles from "./index.module.css";

const no_sound = "https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/o/setto%2Fno_sound.mp3?alt=media&token=99787bd0-3edc-4f9a-9521-0b73ad65eb0a"

export default function CheckSpeech() {
  const [character, setCharacter] = useState("silva");
  const [userInput, setUserInput] = useState("");
  const [wavUrl, setWavUrl] = useState(no_sound);
  const [wavReady, setWavReady] = useState(false)
  const [comment, setComment] = useState("")
  const audioRef = useRef(null)
  const characters = ["silva", "setto"];

  async function onSubmit(event) {
    setWavUrl("")
    event.preventDefault();
    try {
    const response = await fetch("/api/checkspeechfile", {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: userInput, character: character　}),
    });

    const data = await response.json();
    if (response.status !== 200) {
        throw data.error || new Error(`Request failed with status ${response.status}`);
    }
    setWavUrl(data.wav);
    setComment(data.comment)
    } catch(error) {
    console.error(error);
    alert(error.message);
    }
}

  const selectCharacter = (e) => {
    setCharacter(e.target.value);
    console.log(e.target.value);
  }

  const audioPlay = () => {
    audioRef.current.play()
  }

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
        <h3>保存された音声ファイルの確認
        </h3>
        <form onSubmit={onSubmit}>
          <textarea
            type="text"
            name="message"
            placeholder="確認するテキストを入力してください"
            rows="3"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
          <input disabled={!wavReady} type="submit" value="音声を確認" />
        </form>
        {(wavReady) ? (<button className={styles.none} onClick={audioPlay}>speak!!</button>) : (
          <button className={styles.button} onClick={() => {audioPlay(); setWavReady(true)}}>一番最初にタップして開始</button>
        )}
        <br/>
        <audio src={wavUrl} ref={audioRef}/>
        <div>{comment}</div>
        <div className={styles.none} >{wavUrl}</div>
      </main>
    </div>
  );
}
