import Head from "next/head";
import { useState, useEffect } from "react";
import styles from "./index.module.css";
import { db } from "../lib/FirebaseConfig";
import { doc, getDoc, updateDoc, arrayUnion,Timestamp } from "firebase/firestore";

export default function Tester2() {
  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState("");
  const [history, setHistory] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [ideal, setIdeal] = useState("");
  const [canRegistration, setCanRegistration] = useState(false);
  const [character, setCharacter] = useState("silva");
  const [tester, setTester] = useState("tester1@target")
  const [start, setStart] = useState()
  const [items, setItems] = useState([])
  const [info, setInfo] = useState({})
  const characters = ["silva", "setto"];
  const characterName = {silva: "シルヴァ", setto: "セット"}
  const testers = ["tester1@target", "tester2@target", "tester3@target"]
  const selfwords = ["貴方", "あなた", "君"]

  const timestamp = Timestamp.now();
  const today = timestamp.toDate();

  async function onSubmit(event) {
    event.preventDefault();
    const now = new Date()
    const time = now.getTime()
    let fewShot = "以下の設定に矛盾しないよう回答すること。設定："
    items.map((item) => {
        if (userInput.search(item) !==-1){
            const t = item + "は" + info[item].join() + "。"
            fewShot += t
        }
    })
    selfwords.map((word) => {
        if (userInput.search(word) !==-1){
            const name = characterName[character]
            const t = "あなたは" + info[name].join() + "。"
            fewShot += t
        }
    })
    console.log("fewShot:", fewShot)

    try {
      const response = await fetch("/api/generate3", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: userInput, character: character, fewShot: fewShot }),
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
      setEvaluation("good, bad or incorrect ?");
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
    updateDoc(evaluationRef, {evaluation2: arrayUnion(data)})
    setEvaluation("Goodとして登録ずみ   -> next");
  }

  const badButton = () => {
      setEvaluation("模範解答例を入力して登録してください");
      setCanRegistration(true)
    }

    const incorrectButton = () => {
        const data = 
        {character: character,
        date: today,
        tester: tester,
        prompt: prompt,
        completion: result,
        idealResponse: "",
        evaluation: "incorrect"}
        setEvaluation("嘘つき。Incorrect");
        const evaluationRef = doc(db,"Instruction", "taget_tester")
        updateDoc(evaluationRef, {evaluation2: arrayUnion(data)})
        setEvaluation("Incorrectとして登録ずみ   -> next");
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
      updateDoc(evaluationRef, {evaluation2: arrayUnion(data)})
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
    }
  }

  useEffect(() => {
    originalInfo()
  },[])
  
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
            name="input"
            placeholder="伝える内容"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
          <input type="submit" value="伝える" />
        </form>
        <div className={styles.result}>{prompt}</div>
        <div className={styles.result}>{result}</div>
      <div>
      <br/>
      <br/>
        <button className={styles.button1} onClick={goodButton}>good</button>
        <button className={styles.button2} onClick={badButton}>bad</button>
        <button className={styles.button2} onClick={incorrectButton}>incorrect</button>
      </div>
      <div>{evaluation}</div>
        <input className={styles.iinput}
            type="text"
            name="idealResponse"
            placeholder="（オプション）模範解答例を入力"
            value={ideal}
            onChange={(e) => setIdeal(e.target.value)}
          />
          <button className={styles.button1} disabled={!canRegistration} onClick={idealResponseRegistration}>登録</button>
      </main>
    </div>
  );
}
