import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import { storage } from "../lib/FirebaseConfig";
import { ref, getDownloadURL } from "firebase/storage";
import useSound from 'use-sound';
import styles from "./index.module.css";

export default function Home() {
  const [character, setCharacter] = useState("setto");
  const [userInput, setUserInput] = useState("");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState();
  //wavUrl：cloud storageのダウンロードurl。初期値は無音ファイル。これを入れることによって次からセッティングされるwavUrlで音がなるようになる。
  const [wavUrl, setWavUrl] = useState("https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/o/setto%2Fno_sound.mp3?alt=media&token=99787bd0-3edc-4f9a-9521-0b73ad65eb0a");
  const [wavReady, setWavReady] = useState(false)
  const [elapsedTime, setElapsedTime] = useState({total:0.0, openai:0.0, Espnet:0.0})
  const characters = ["setto", "silva"];

  async function onSubmit(event) {
    const start = new Date().getTime()
    setPrompt("")
    setResult("")
    event.preventDefault();
    try {
      const response = await fetch("/api/generate2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userInput, character: character }),
      });

      const data = await response.json();
      if (response.status !== 200) {
        throw data.error || new Error(`Request failed with status ${response.status}`);
      }
      setWavUrl(data.wav);
      setPrompt(data.prompt)
      setResult(data.result);
      setUserInput("");
      const totalTime = new Date().getTime() - start
      const espnetTime = data.espnet - data.openai
      const t = {total:totalTime, openai:data.openai, Espnet:espnetTime}
      setElapsedTime(t)
    } catch(error) {
      // Consider implementing your own error handling logic here
      console.error(error);
      alert(error.message);
    }
  }

  const selectCharacter = (e) => {
    setCharacter(e.target.value);
    console.log(e.target.value);
  }

  const [play] = useSound(wavUrl);

  useEffect(() => {
    console.log(wavUrl)
  }, [wavUrl])

  return (
    <div>
      <Head>
        <title>はめふらトーク</title>
      </Head>
      <div>
      <select className={styles.select1} value={character} label="character" onChange={selectCharacter}>
        {characters.map((name) => {
          return <option key={name} value={name}>{name}</option>;
        })}
      </select>
      </div>

      <main className={styles.main}>
        <h3>{character}とトークしてみよう
        </h3>
        <form onSubmit={onSubmit}>
          <input
            type="text"
            name="message"
            placeholder="伝える内容"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
          <input disabled={!wavReady} type="submit" value="伝える" />
        </form>
        <div className={styles.result}>{prompt}</div>
        <div className={styles.result}>{result}</div>
        <br/>
        {(wavReady) ? (<button onClick={() => play()}>speak!!</button>) : (
          <button onClick={() => {setWavReady(true); play()}}>トークを始める</button>
        )}
        
        <br/>
        <div>トータル所要時間: {elapsedTime.total}msec</div>
        <div>openAI所要時間: {elapsedTime.openai}msec</div>
        <div>espnet所要時間: {elapsedTime.Espnet}msec</div>
        <div className={styles.none}>{wavUrl}</div>
      </main>
    </div>
  );
}
