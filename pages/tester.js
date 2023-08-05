import Head from "next/head";
import { useState } from "react";
import styles from "./index.module.css";
import { db } from "../lib/FirebaseConfig";
import { doc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";

export default function Tester() {
  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState();
  const [history, setHistory] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [conversation, setConversation] = useState("");

  async function onSubmit(event) {
    event.preventDefault();
    try {
      const response = await fetch("/api/generate", {
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

      setPrompt(data.prompt)
      setResult(data.result);
      const updates = history
      updates.push(userInput + "\n" + data.result + "\n")
      setHistory(updates);
      console.log(history);
      setUserInput("");
      setEvaluation("");
    } catch(error) {
      // Consider implementing your own error handling logic here
      console.error(error);
      alert(error.message);
    }
  }

  const goodButton = () => {
    const data = 
        {prompt: prompt,
        completion: result,
        evaluation: "good"}
    
    const testRef = doc(db,"Instruction", "taget_tester")
    updateDoc(testRef, {test: arrayUnion(data)})
    setEvaluation("Good");
  }
  const badButton = () => {
    const data = 
        {prompt: prompt,
        completion: result,
        evaluation: "bad"}
    
    const testRef = doc(db,"Instruction", "taget_tester")
    updateDoc(testRef, {test: arrayUnion(data)})
    setEvaluation("Bad");
  }

  return (
    <div>
      <Head>
        <title>target</title>
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
        <div className={styles.result}>{prompt}</div>
        <div className={styles.result}>{result}</div>
      </main>
      <div>
      <br/>
      <br/>
        <button className={styles.button1} onClick={goodButton}>good</button>
        <button className={styles.button2} onClick={badButton}>bad</button>
      </div>
      <main className={styles.main}>
        <div className={styles.evaluation}>{evaluation}</div>
        </main>
    </div>
  );
}
