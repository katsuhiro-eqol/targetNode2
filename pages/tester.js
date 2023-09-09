import Head from "next/head";
import { useState } from "react";
import styles from "./index.module.css";
import { db } from "../lib/FirebaseConfig";
import { doc, setDoc, updateDoc, arrayUnion,Timestamp } from "firebase/firestore";

export default function Tester() {
  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState("");
  const [history, setHistory] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [ideal, setIdeal] = useState("");
  const [canRegistration, setCanRegistration] = useState(false);
  const [character, setCharacter] = useState("setto");
  const [tester, setTester] = useState("tester1@target")
  const [start, setStart] = useState()
  const characters = ["setto", "silva"];
  const testers = ["tester1@target", "tester2@target", "tester3@target"]

  const timestamp = Timestamp.now();
  const today = timestamp.toDate();
  
  async function onSubmit(event) {
    const now = new Date()
    const time = now.getTime()
    setStart(time)
    event.preventDefault();
    try {

      const response = await fetch("/api/generate", {
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

      timeMeasurement()
      setPrompt(data.prompt)
      setResult(data.result);
      const updates = history
      updates.push(userInput + "\n" + data.result + "\n")
      setHistory(updates);
      console.log(history);
      setUserInput("");
      setEvaluation("good or bad ?");
      setCanRegistration(false)
    } catch(error) {
      // Consider implementing your own error handling logic here
      console.error(error);
      alert(error.message);
    }
  }

  const goodButton = () => {
    const data = 
        {character: character,
        date: today,
        tester: tester,
        prompt: prompt,
        completion: result,
        idealResponse: "",
        evaluation: "good"}
    
    const evaluationRef = doc(db,"Instruction", "taget_tester")
    updateDoc(evaluationRef, {evaluation1: arrayUnion(data)})
    setEvaluation("Goodとして登録ずみ   -> next");
  }

  const badButton = () => {
      setEvaluation("模範解答例を入力して登録してください");
      setCanRegistration(true)
    }

  const idealResponseRegistration = () => {
    const data = 
        {character: character,
        date: today,
        tester: tester,
        prompt: prompt,
        completion: result,
        idealResponse: ideal,
        evaluation: "bad"}
    
      const evaluationRef = doc(db,"Instruction", "taget_tester")
      updateDoc(evaluationRef, {evaluation1: arrayUnion(data)})
      setCanRegistration(false)
      setEvaluation("模範解答例登録済み  -> next")
      setIdeal("")
  }

  const selectCharacter = (e) => {
    setCharacter(e.target.value);
    console.log(e.target.value);
  }

  const selectTester = (e) => {
    setTester(e.target.value);
    console.log(e.target.value);
  }

  const timeMeasurement = () => {
    const now = new Date()
    const time = now.getTime()
    const elapsed = time -start
    console.log(start)
    console.log(time)
    console.log(elapsed)
  }

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
      <select className={styles.select2} value={tester} label="tester" onChange={selectTester}>
        {testers.map((name) => {
          return <option key={name} value={name}>{name}</option>;
        })}
      </select>
      </div>
      <main className={styles.main}>
        <h4>{character} / {tester}</h4>
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
        <div className={styles.result}>{prompt}</div>
        <div className={styles.result}>{result}</div>
      </main>
      <div>
      <br/>
      <br/>
        <button className={styles.button1} onClick={goodButton}>good</button>
        <button className={styles.button2} onClick={badButton}>bad</button>
      </div>
      <main className={styles.ex}>
        <div className={styles.evaluation}>{evaluation}</div>
        <input
            type="text"
            name="idealResponse"
            placeholder="模範解答例を入力"
            value={ideal}
            onChange={(e) => setIdeal(e.target.value)}
          />
          <button disabled={!canRegistration} onClick={idealResponseRegistration}>登録</button>
      </main>
    </div>
  );
}
