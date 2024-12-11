
import "regenerator-runtime";
import React from "react";
import Head from "next/head";
import { useSearchParams } from "next/navigation";
import { useState, useEffect} from "react";
import Button from '@mui/material/Button';
import SendIcon from '@mui/icons-material/Send';
import { db } from "../lib/FirebaseConfig";
import { collection, query, where, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import styles from "./guide.module.css";

export default function GuideTester() {
    const [userInput, setUserInput] = useState("")
    const [prompt, setPrompt] = useState("")
    const [result, setResult] = useState("")
    const [embeddingsData, setEmbeddingsData] = useState([])
    const [selectedAnswer, setSelectedAnswer] = useState({})
    const [selectedAnswer2, setSelectedAnswer2] = useState({})
    const [answers, setAnswers] = useState([])
    const [choosed, setChoosed] = useState("")
    const [flag, setFlag] = useState(false)
    const [comment, setComment] = useState("")

    const searchParams = useSearchParams();
    const attribute = searchParams.get("attribute");
    const modelnumber = searchParams.get("modelnumber");
    const tester = searchParams.get("tester");

    let n = 0
    async function onSubmit(event) {
        event.preventDefault();
        if (attribute){
            if (embeddingsData.length == 0){
                loadEmbeddingData(attribute)
            }
        } else {
            alert("urlが正しくありません")
            return
        }
        setUserInput("")
        setPrompt("")
        setResult("")
        setSelectedAnswer({})
        setSelectedAnswer2({})
        setComment("")

        try {
        const response = await fetch("/api/embedding", {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            //body: JSON.stringify({ input: userInput, character: character, fewShot: fewShot, previousData: previousData, sca: scaList[character] }),
            body: JSON.stringify({ input: userInput, attribute:attribute, modelnumber:modelnumber }),
        });

        const data = await response.json();
        if (response.status !== 200) {
            throw data.error || new Error(`Request failed with status ${response.status}`);
            }
        setPrompt(data.prompt)
        const similarQList = findMostSimilarQ(data.embedding)

        if (similarQList.similarity > 0.5){
            setResult(embeddingsData[similarQList.index].answer)
        }else{
            const badQuestion = embeddingsData.filter((obj) => obj.question == "分類できない質問")
            const n = Math.floor(Math.random() * badQuestion.length)
            setResult(badQuestion[n].answer)     
        }
        const sQ = {answer:embeddingsData[similarQList.index].answer, similarity:similarQList.similarity}
        setSelectedAnswer(sQ)
        const similarQAList = findMostSimilarQA(data.embedding)
        const sQA = {answer:embeddingsData[similarQAList.index].answer, similarity:similarQAList.similarity}
        setSelectedAnswer2(sQA)
        setComment("評価を登録してください")
        } catch(error) {
        console.error(error);
        alert(error.message);
        }
    }

    function cosineSimilarity(vec1, vec2) {
        if (vec1.length !== vec2.length) {
          throw new Error('ベクトルの次元数が一致しません');
        }
        const dotProduct = vec1.reduce((sum, a, i) => sum + a * vec2[i], 0);
        const magnitude1 = Math.sqrt(vec1.reduce((sum, a) => sum + a * a, 0));
        const magnitude2 = Math.sqrt(vec2.reduce((sum, a) => sum + a * a, 0));
        if (magnitude1 === 0 || magnitude2 === 0) {
          return 0;
        }
        return dotProduct / (magnitude1 * magnitude2);
      }
    
    function findMostSimilarQ(base64Data){
        const inputVector = binaryToList(base64Data)
        const similarities = embeddingsData.map((item, index) => ({
            index,
            similarity: cosineSimilarity(inputVector, item.vector1)
          }));
        similarities.sort((a, b) => b.similarity - a.similarity);

        // 最も類似度の高いベクトルの情報を返す
        return similarities[0];
    }

    function findMostSimilarQA(base64Data){
        const inputVector = binaryToList(base64Data)
        const similarities = embeddingsData.map((item, index) => ({
            index,
            similarity: cosineSimilarity(inputVector, item.vector2)
          }));
        similarities.sort((a, b) => b.similarity - a.similarity);

        // 最も類似度の高いベクトルの情報を返す
        return similarities[0];
    }

    function binaryToList(binaryStr){
        const decodedBuffer = Buffer.from(binaryStr, 'base64')
        const embeddingsArray = new Float32Array(
            decodedBuffer.buffer, 
            decodedBuffer.byteOffset, 
            decodedBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT
          )
          const embeddingsList = Array.from(embeddingsArray)
    
          return embeddingsList
        }

    async function loadEmbeddingData(attr){
        try {
            const q = query(collection(db, "VectorDB"), where("attribute", "==", attr))
            const querySnapshot = await getDocs(q);
            const embeddings = querySnapshot.docs.map((doc) => {
                const data = doc.data();
                const embeddingsArray1 = binaryToList(data.vector1)
                const embeddingsArray2 = binaryToList(data.vector2)
                const embeddingsData = {
                    vector1: embeddingsArray1,
                    vector2: embeddingsArray2,
                    question:data.question,
                    answer:data.answer,
                    url:data.url,
                    duration:data.duration
                }
                return embeddingsData
                })
            setEmbeddingsData(embeddings)
        } catch {
            return []
        }
    }

    const saveAnsewer = async (evaluation) => {
        const date = new Date()
        const now = date.getFullYear() + ('0' + (date.getMonth() + 1)).slice(-2) +('0' + date.getDate()).slice(-2) +  ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2)
        const data = 
            {
            tester: tester,
            attribute: attribute,
            prompt: prompt,
            answer: result,
            properAnswer: choosed,
            selected1: selectedAnswer,
            selected2: selectedAnswer2,
            evaluation: evaluation
            }
        
          const evaluationRef = doc(db,"Instruction", tester+"-"+now)
          await setDoc(evaluationRef, data)
          setPrompt("")
          setResult("")
          setChoosed("")
      }

    function getAnswers(){
        const list = embeddingsData.map((obj) => obj.answer)
        let list2 = Array.from(new Set(list))
        list2.unshift("")
        setAnswers(list2)
    }


    const selectAnswer = (e) => {
        setChoosed(e.target.value);
        console.log(e.target.value);
    }
    useEffect(() => {
        console.log(attribute)
        /*
        if (embeddingsData.length == 0 && attribute != ""){
            loadEmbeddingData(attribute)
        }
        */
    },[])

    
    useEffect(() => {
        console.log(embeddingsData)
        getAnswers()
    }, [embeddingsData])

    useEffect(() => {
        console.log(answers)
    }, [answers])

  return (
    <div>
      <Head>
        <title>target</title>
      </Head>
      <main className={styles.main}>
        {flag ? (
 <div>
 <form onSubmit={onSubmit}>
  <textarea className={styles.textarea}
    type="text"
    name="message"
    placeholder="質問内容"
    rows="2"
    value={userInput}
    onChange={(e) => setUserInput(e.target.value)}
  />
</form>
<div className={styles.button_container}>
<Button className={styles.button} variant="contained" onClick={(event) => onSubmit(event)}>
<SendIcon />
質問する
</Button>
</div>
<div>質問</div>
 <div className={styles.prompt}>{prompt}</div>
 <div>回答</div>
 <div className={styles.result}>{result}</div>
   <br/>
 <div className={styles.modify}>望ましくない回答だった場合は、下の選択肢から好ましい回答を選択してください</div>
 <br/>
 <select className={styles.select} value={choosed} label="character" onChange={selectAnswer}>
   {answers.map((answer) => {
     return <option key={answer} value={answer}>{answer}</option>;
   })}
   </select>
 </div>
    ):(
        <div className={styles.image_container}>
        <button className={styles.button3} onClick={() => {loadEmbeddingData(attribute); setFlag(true)}}>AIガイドtester</button>
        </div>
    )}
    </main>
    {flag && (
    <div className={styles.bottom_items}>
    <div className={styles.button_container}>
    <Button className={styles.button} variant="outlined" onClick={() => saveAnsewer("good")}>
        適切な回答です
    </Button>
    <Button className={styles.button} color="secondary" variant="contained" onClick={() => saveAnsewer("bad")}>
        修正回答を登録
    </Button>    
    <div className={styles.none}>{selectedAnswer.answer} {selectedAnswer2.answer}</div>
    </div>
    </div>
    )}
    </div>
  );
}