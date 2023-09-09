import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import { storage } from "../lib/FirebaseConfig";
import { ref, getDownloadURL, listAll } from "firebase/storage";
import useSound from 'use-sound';
import styles from "./index.module.css";

export default function Measure() {
  const [character, setCharacter] = useState("setto");
  const [userInput, setUserInput] = useState("");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState();
  const [wavUrl, setWavUrl] = useState("");
  const [wavReady, setwavReady] = useState(false)
  const [wavFiles, setWavFiles] = useState([])
  const wavRef = useRef()

  const bucket_path = "gs://targetproject-394500.appspot.com/" //cloud storage bucket
  const silent = "https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/o/setto%2Fno_sound.mp3?alt=media&token=99787bd0-3edc-4f9a-9521-0b73ad65eb0a"
  const speech = "https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/o/setto%2F85602777dc2cbb2c4806cc5c5070b422.wav?alt=media&token=cce161c5-c0dd-468f-96a9-7fbf1660e434"

  const listFiles = () => {
    const path = bucket_path + "setto"
    const listRef = ref(storage, path);
    let files = []
    listAll(listRef)
    .then((res) => {
      res.items.forEach((itemRef) => {
        files.push(itemRef.name)
      });
      setWavFiles(files)
    }).catch((error) => {
      console.log(error)
    });
  }

  listFiles()

  const selectFile = () => {
    const file = wavFiles[Math.floor(Math.random() * wavFiles.length)]
    return file
  }

  const [play] = useSound(wavRef.current)

  const speak = () => {
    console.log("speak")
    wavRef.current = speech
    play()
  }

  const dlFile = () => {
    const selected = selectFile()
    console.log("selected:",selected)
    const path = bucket_path + "setto/" + selected
    const pathRef = ref(storage, path);
    getDownloadURL(pathRef)
      .then((url) => {
        wavRef.current = url
        console.log("wavRef:", wavRef.current)
        play(wavRef.current)
      })
      .catch((error) => {
        //エラー処理
      })
      //play(wavRef.current)
  }

  async function onSubmit(event) {
    const now = new Date()
    const start = now.getTime()
    setwavReady(false)
    setPrompt("")
    setResult("")
    event.preventDefault();
    try {
      const response = await fetch("/api/generate3", {
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
      setPrompt(data.prompt)
      setResult(data.result);
      setUserInput("");
      //ここにwav処理
      const currentWavPath = bucket_path + data.wav;//urlを返すようにaws flask側を変更
      const currentRef = ref(storage, currentWavPath)
      getDownloadURL(currentRef)
      .then((url) => {
        //wavRef.current = url
        //console.log("wavUrl", wavRef.current)
        setWavUrl(url);
        //const [play] = useSound(wavRef.current);
        //play()
        async function resolveSample() {
            //wavRef.current = url
            wavRef.current = url
            return wavRef;
        }
        resolveSample().then(value => {
            console.log("wavUrl", value.current)
            play(value.current); // => resolve!!
        });
      })
      .catch((error) => {
        //エラー処理
      })

      const response_time = timeMeasurement(start)
      console.log(response_time)
      console.log(data.openai_time)

    } catch(error) {
      // Consider implementing your own error handling logic here
      console.error(error);
      alert(error.message);
    }
  }

  const timeMeasurement = (start) => {
    const now = new Date()
    const time = now.getTime()
    const elapsed = time -start
    return elapsed
  }

  function myPromise(url) {
    return new Promise(function(resolve) {
      resolve(wavRef.current = url)
    })
  }
  async function myAsync() {
    await myPromise(wavRef.current);
    play(wavRef.current)
  }



  //const [play] = useSound(wavRef.current);
  //const [play] = useSound(wavUrl);

  /*
  useEffect(() => {
    //console.log(wavFiles)
  }, [wavFiles])
  */

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
          <input disabled={false} type="submit" value="伝える" />
        </form>
        <div className={styles.result}>{prompt}</div>
        <div className={styles.result}>{result}</div>
        <br/>
        <button onClick={() => speak()}>speak!!</button>
        <button onClick={dlFile}>dlFile!!</button>
        <br/>
        <div className={styles.url}>{wavUrl}</div>
      </main>
    </div>
  );
}