import Head from "next/head";
import { useState, useEffect } from "react";
import styles from "./index.module.css";
import { db } from "../lib/FirebaseConfig";
import { doc, getDoc, updateDoc, arrayUnion,Timestamp } from "firebase/firestore";

export default function Tester3() {
  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState("");
  const [history, setHistory] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [comment, setComment] = useState("");
  const [ideal, setIdeal] = useState("");
  const [canRegistration, setCanRegistration] = useState(false);
  const [character, setCharacter] = useState("バウンサー");
  const [tester, setTester] = useState("tester1@target")
  const [items, setItems] = useState([]) //固有名詞リスト
  const [info, setInfo] = useState({}) //固有名詞情報
  const [greetings, setGreetings] = useState([]) //定型QAリスト
  const [gInfo, setGInfo] = useState({}) //定型QA情報
  const characterName = "バウンサー"
  const testers = ["tester1@target", "tester2@target", "tester3@target"]
  const selfwords = ["貴方", "あなた", "君"]

  const timestamp = Timestamp.now();
  const today = timestamp.toDate()

  const conversion = {獲端:"獲端",エバナ:"獲端",茅ヶ崎:"茅ヶ崎",茅ケ崎:"茅ヶ崎",チガサキ:"茅ヶ崎",凝部:"凝部",ギョウブ:"凝部",射落:"射落",イオチ:"射落",双巳:"双巳",フタミ:"双巳",陀宰:"陀宰",ダザイ:"陀宰",廃寺:"廃寺",ハイジ:"廃寺",明瀬:"明瀬",アカセ:"明瀬",萬城:"萬城",バンジョウ:"萬城",瀬名:"瀬名",セナ:"瀬名",バウンサー:"バウンサー",監視者:"バウンサー",ディレクター:"ディレクター",プロデューサー:"プロデューサー"}

  async function onSubmit(event) {
    event.preventDefault();
    const now = new Date()
    const time = now.getTime()
    let refer = []
    if (history.length < 6){
        refer = history
    } else {
        refer = history.slice(-6)
    }
    setHistory(refer)
    //定型QAかどうかの判定のための準備
    let preparedGreeting = ""
    greetings.map((item) => {
      if (userInput.search(item) !==-1){
        const selected = gInfo[item]
        preparedGreeting = selected[Math.floor(Math.random() * selected.length)]
      }
    })
    if (preparedGreeting !== ""){
        setResult(preparedGreeting)
        setPrompt(userInput)
      //ここまで定型応答。以下はopenAIに投げる。
    } else {
        let setting = "設定に基づいて50字以内で回答すること。"
        let fewShot = ""
        //登録した固有名詞と一致する語があるか検索
        const convKeys = Object.keys(conversion)
        convKeys.map((item) => {
            if (userInput.search(item) !==-1){
                const cItem = conversion[item]
                const t = "設定にないことは回答しない。設定:" + item + "は" + info[cItem].join() + "。"
                fewShot += t
            }
        })
        /*
        selfwords.map((word) => {
            if (userInput.search(word) !==-1){
                const t = "あなたは" + info[characterName].join() + "。"
                fewShot += t
            }
        })
        */
        if (fewShot.length == 0){
            fewShot = "あなたは" + info[characterName].join() + "。知らないことは回答しないでもよい"
        }
        setting += fewShot
        console.log(setting)

        try {
          const response = await fetch("/api/generate3", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ input: userInput, character: character, setting: setting, history:refer }),
          });

          const data = await response.json();
          if (response.status !== 200) {
            throw data.error || new Error(`Request failed with status ${response.status}`);
          }
    
          setPrompt(data.prompt)
          setResult(data.result);
          const updates = refer.concat([{"role": "user", "content": data.prompt}, {"role": "assistant", "content": data.result}])
          console.log("updates:", updates)
          setHistory(updates)
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
      updateDoc(evaluationRef, {evaluation3: arrayUnion(data)})
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
    const docRef = doc(db, "OriginalInformation", "アイデアファクトリー");
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
