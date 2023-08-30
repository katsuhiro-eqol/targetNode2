import Head from "next/head";
import { useState } from "react";
import useSound from 'use-sound';
import styles from "./index.module.css";

export default function Home() {
  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState();

  const wavfile = "gs://targetproject-394500.appspot.com/development/gen_file_2.wav"
  const [play] = useSound(wavfile);

  async function onSubmit(event) {
    event.preventDefault();
    try {
      const response = await fetch("/api/generate2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userInput }),
      });

      const data = await response.json();
      if (response.status !== 200) {
        throw data.error || new Error(`Request failed with status ${response.status}`);
      }

      setResult(data.speech);
      setUserInput("");
    } catch(error) {
      // Consider implementing your own error handling logic here
      console.error(error);
      alert(error.message);
    }
  }

  return (
    <div>
      <Head>
        <title>OpenAI Quickstart</title>
        <link rel="icon" href="/dog.png" />
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
          <input type="submit" value="伝える" />
        </form>
        <div className={styles.result}>{result}</div>
        <button onClick={play}>speak!!</button>
      </main>
    </div>
  );
}
