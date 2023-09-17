import Head from "next/head";
import { useState, useEffect } from "react";
import styles from "./index.module.css";
import { db } from "../lib/FirebaseConfig";
import { doc, setDoc, getDoc, updateDoc, arrayUnion,Timestamp } from "firebase/firestore";

export default function CreateSpeech() {
  const [userInput, setUserInput] = useState("");
  const [characterOutput, setCharacterOutput] = useState("");
  const [character, setCharacter] = useState("silva");
  const [items, setItems] = useState([]) //固有名詞リスト
  const [info, setInfo] = useState({}) //固有名詞情報
  const [greetings, setGreetings] = useState([]) //定型QAリスト
  const [gInfo, setGInfo] = useState({}) //定型QA情報
  const characters = ["silva", "setto"];

  const timestamp = Timestamp.now();
  const today = timestamp.toDate();

  async function onSubmit(event) {
    event.preventDefault();

    try {
      const response = await fetch("/api/generate4", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: userInput, character: character, characterOutput:characterOutput}),
      });

      const data = await response.json();
      if (response.status !== 200) {
        throw data.error || new Error(`Request failed with status ${response.status}`);
      }
      const info = {
        output: characterOutput,
        url: data.wav,
        filename: data.filename + ".wav"
      }
      console.log(info)
      const k = userInput
      const speechRef = doc(db,"Greeting", character)
      updateDoc(speechRef, {[k]: arrayUnion(info)})     
      
      const info2 = {
        output: characterOutput,
        url: data.wav,
        filename:  data.filename + ".wav"
      }
      const id = character + "-" + data.filename
      console.log(id)
      const speechRef2 = doc(db,"Speech", id)
      setDoc(speechRef2, info2)          
      setCharacterOutput("")
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
    // docSnap.data() will be undefined in this case
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

  useEffect(() => {
    originalInfo()
    greetingInfo()
  },[])

  useEffect(() => {
    greetingInfo()
  },[character])
  
  return (
    <div>
      <Head>
        <title>target</title>
      </Head>
      <div>
      <select className={styles.select1} value={character} label="character" onChange={selectCharacter}>
        {characters.map((name) => {
          return <option key={name} value={name}>{name}</option>;
        })}
      </select>
      </div>
      <main className={styles.main}>
        <h4>{character}</h4>
        <form onSubmit={onSubmit}>
          <div>ユーザーのインプット</div>
          <input
            type="text"
            name="input"
            placeholder="user input"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
          <div>キャラクターの応答</div>
          <input
            type="text"
            name="output"
            placeholder="character output"
            value={characterOutput}
            onChange={(e) => setCharacterOutput(e.target.value)}
          />          
          <br/>
          <input type="submit" value="音声合成" />
        </form>
      </main>
    </div>
  );
}
