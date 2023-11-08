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
  const [comment, setComment] = useState("");
  const [ideal, setIdeal] = useState("");
  const [canRegistration, setCanRegistration] = useState(false);
  const [character, setCharacter] = useState("silva");
  const [tester, setTester] = useState("tester1@target")
  const [items, setItems] = useState([]) //固有名詞リスト
  const [info, setInfo] = useState({}) //固有名詞情報
  const [greetings, setGreetings] = useState([]) //定型QAリスト
  const [gInfo, setGInfo] = useState({}) //定型QA情報
  const characters = ["silva", "setto"];
  const characterName = {silva: "シルヴァ", setto: "セット"}
  const testers = ["tester1@target", "tester2@target", "tester3@target"]
  const selfwords = ["貴方", "あなた", "君"]

  async function onSubmit(event) {
    event.preventDefault();
    const now = new Date()
    const time = now.getTime()

    //定型QAかどうかの判定のための準備
    let preparedGreeting = {}
    greetings.map((item) => {
      if (userInput.search(item) !==-1){
        const selected = gInfo[item]
        preparedGreeting = selected[Math.floor(Math.random() * selected.length)]
      }
    })
    
    if (Object.keys(preparedGreeting).length !== 0){
        //応答が早すぎる
        setResult(preparedGreeting["output"])
        setPrompt(userInput)
        setUserInput("")
      } else {
        
        let setting = ""
        let fewShot = ""
        items.map((item) => {
            if (userInput.search(item) !==-1){
                const t = item + "は" + info[item].join() + "。"
                setting += t
            }
        })
        selfwords.map((word) => {
            if (userInput.search(word) !==-1){
                const name = characterName[character]
                const t = "あなたは" + info[name].join() + "。"
                setting += t
            }
        })
        if (setting !== ""){
          //settingない場合はfewShotを入れない（文字数を減らす）
          fewShot = "以下の設定に矛盾しないよう回答すること。設定：" + setting
        }
        console.log(fewShot)
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
          setComment("good, bad or incorrect?");
          setCanRegistration(false)
        } catch(error) {
          // Consider implementing your own error handling logic here
          console.error(error);
          alert(error.message);
        }
      }
  }

  const goodButton = () => {
    setEvaluation("good")
    setComment("Good。別の模範回答も入力可能。空欄のままでも登録可能");
    setCanRegistration(true)
  }

  const badButton = () => {
    setEvaluation("bad")
    setComment("模範解答例を入力して登録してください");
    setCanRegistration(true)
  }

  const incorrectButton = () => {
    setEvaluation("incorrect")
    setComment("嘘つき。Incorrect。正しい回答を入力して登録してください");
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
        evaluation: evaluation}
    
      const evaluationRef = doc(db,"Instruction", "taget_tester")
      updateDoc(evaluationRef, {evaluation2: arrayUnion(data)})
      setCanRegistration(false)
      setEvaluation("")
      setComment("評価および模範回答登録済み  -> next")
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
      <main className={styles.main}>
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
        <div className={styles.none}>{evaluation}</div>
      <div>
      <br/>
      <br/>
        <button className={styles.button1} onClick={goodButton}>good</button>
        <button className={styles.button2} onClick={badButton}>bad</button>
        <button className={styles.button2} onClick={incorrectButton}>incorrect</button>
      </div>
      <div>{comment}</div>
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
