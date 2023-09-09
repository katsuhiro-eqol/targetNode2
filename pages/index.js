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
  const [wavUrl, setWavUrl] = useState("");
  const [wavReady, setwavReady] = useState(false)
  const wavRef = useRef("")

  async function onSubmit(event) {
    setwavReady(false)
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
      setwavReady(true)
      setWavUrl(data.wav);
      wavRef.current = data.wav
      setPrompt(data.prompt)
      setResult(data.result);
      setUserInput("");

    } catch(error) {
      // Consider implementing your own error handling logic here
      console.error(error);
      alert(error.message);
    }
  }

  const [play] = useSound(wavRef.current);

  useEffect(() => {
    console.log(wavRef.current)
    //play(wavRef.current)
  }, [wavUrl])

  return (
    <div>
      <Head>
        <title>はめふらトーク</title>
      </Head>

      <main className={styles.main}>
        <h3>セット・ノーディンに話しかけてみよう</h3>
        <form onSubmit={onSubmit}>
          <input
            type="text"
            name="message"
            placeholder="伝える内容"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
          <input disabled={true} type="submit" value="伝える" />
        </form>
        <div className={styles.result}>{prompt}</div>
        <div className={styles.result}>{result}</div>
        <p>このページは現在使用できません</p>
        <br/>
        <button onClick={play}>speak!!</button>
        <button onClick={() => {play(wavRef.current)}}>speak</button>
        <br/>
        <div className={styles.url}>{wavRef.current}</div>
      </main>
    </div>
  );
}
