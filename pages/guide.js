
import "regenerator-runtime";
import React from "react";
import Head from "next/head";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import Button from '@mui/material/Button';
import MicIcon from '@mui/icons-material/Mic';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import { db } from "../lib/FirebaseConfig";
import { collection, query, where, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import styles from "./guide.module.css";

const no_sound = "https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/o/setto%2Fno_sound.mp3?alt=media&token=99787bd0-3edc-4f9a-9521-0b73ad65eb0a"

export default function Guide() {
    const initialSlides = new Array(1).fill("00_base.jpg")
    const [userInput, setUserInput] = useState("")
    const [prompt, setPrompt] = useState("")
    const [result, setResult] = useState("")
    const [embeddingsData, setEmbeddingsData] = useState([])
    //wavUrl：cloud storageのダウンロードurl。初期値は無音ファイル。これを入れることによって次からセッティングされるwavUrlで音がなるようになる。
    const [wavUrl, setWavUrl] = useState(no_sound);
    const [slides, setSlides] = useState(initialSlides)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [wavReady, setWavReady] = useState(false)
    const [record,setRecord] = useState(false)
    const [canSend, setCanSend] = useState(false)
    const [histories, setHistories] = useState([{id:"1", content:"質問をどうぞ", role:"ai"}])
    const audioRef = useRef(null)
    const intervalRef = useRef(null)
    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition();

    const searchParams = useSearchParams();
    const attribute = searchParams.get("attribute");
    const modelnumber = searchParams.get("modelnumber");
    const user = searchParams.get("user");

    const contractedUsers = [{name:"target", limit:"no"}, {name:"abcdefg", limit:"2024/12/15"}]
    let n = 0
    async function onSubmit(event) {
        event.preventDefault();
        setWavUrl("")
        setRecord(false)
        setCanSend(false)//同じInputで繰り返し送れないようにする
        setUserInput("")
        const s1 = new Array(1).fill("00_talk01.jpg")
        setSlides(s1)
        n = histories.length
        updateHistories({id:String(n), content:userInput, role:"user"})
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
        const similarityList = findMostSimilarQuestion(data.embedding)

        if (similarityList.similarity > 0.5){
            setWavUrl(embeddingsData[similarityList.index].url)
            setResult(embeddingsData[similarityList.index].answer)
            const sl = createSlides(embeddingsData[similarityList.index].duration)
            setSlides(sl)
        }else{
            const badQuestion = embeddingsData.filter((obj) => obj.question == "分類できない質問")
            const n = Math.floor(Math.random() * badQuestion.length)
            setWavUrl(badQuestion[n].url)
            setResult(badQuestion[n].answer)
            const sl = createSlides(badQuestion[n].duration)
            setSlides(sl)           
        }


        console.log(similarityList.similarity)
        console.log(embeddingsData[similarityList.index])

        } catch(error) {
        console.error(error);
        alert(error.message);
        }
    }

    const updateHistories = (item) => {
        const currentHistories = histories
        currentHistories.push(item)
        setHistories(currentHistories)
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
    
    function findMostSimilarQuestion(base64Data){
        const inputVector = binaryToList(base64Data)
        const similarities = embeddingsData.map((item, index) => ({
            index,
            similarity: cosineSimilarity(inputVector, item.vector1)
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
                const embeddingsArray = binaryToList(data.vector1)
                const embeddingsData = {
                    vector1: embeddingsArray,
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

    const createSlides = (duration) => {
        let imageList = []
        const n = Math.floor(duration*2)+1
        for (let i = 0; i<n; i++){
            const s1 = new Array(1).fill("00_talk01.jpg")
            const s2 = new Array(1).fill("00_base.jpg")
            imageList = imageList.concat(s1)
            imageList = imageList.concat(s2)
        }
        const s = new Array(1).fill("00_base.jpg")
        imageList = imageList.concat(s)

        return imageList
    }

    const userConformation = () => {
        const currentUser = contractedUsers.filter((item) => item.name == user)
        if (currentUser.length != 0) {
            const limit = currentUser[0].limit
            if (limit == "no"){
                talkStart()
                audioPlay()
                loadEmbeddingData(attribute)
            } else {
                const today = new Date()
                const limitDate = limit.split("/")
                if (limitDate[0]==today.getFullYear()&&limitDate[1]==(today.getMonth()+1)&&limitDate[2]==today.getDate()){
                    talkStart()
                    audioPlay()
                    loadEmbeddingData(attribute)                    
                } else {
                    alert("アプリの使用権限がありません")
                }
            }
        } else {
            alert("アプリの使用権限がありません")
        }
        /*
        if (user == "target"){
            talkStart()
            audioPlay()
            loadEmbeddingData(attribute)
        } else if (user == "abcdefg") {
            alert("現在アプリを利用できません")
        } else {
            alert("アプリの使用権限がありません")
        }
        */
    }

    const talkStart = async () => {
    //暫定的にESPnetが立ち上がってなくても使えるようにする
    setWavReady(true)
    sttStart()
    setTimeout(() => {
        sttStop()
        resetTranscript()
    }, 1000);
    }

    const audioPlay = () => {
        audioRef.current.play()
        setCurrentIndex(0)
    }

    const sttStart = () => {
        setUserInput("")
        setRecord(true)
        SpeechRecognition.startListening()
    }

    const sttStop = () => {
        setRecord(false)
        SpeechRecognition.stopListening()
    }

    useEffect(() => {

        return () => {
            clearInterval(intervalRef.current);
            intervalRef.current = null// コンポーネントがアンマウントされたらタイマーをクリア
            resetTranscript()
        };
    },[])

    
    useEffect(() => {
        if (embeddingsData.length != 0){
            console.log(embeddingsData)
        }
    }, [embeddingsData])
    


    //20240228ヴァージョンはアニメーション省略なのでwavUrlが更新されたらaudioPlayする
    useEffect(() => {
        audioPlay()
        setCurrentIndex(0)
        if (slides.length !== 1){
        if (intervalRef.current !== null) {//タイマーが進んでいる時はstart押せないように//2
            return;
        }
        //intervalはcreateBauncerSlides()に合わせる
        intervalRef.current = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % (slides.length))
        }, 250)

        } else {

        }   
    }, [wavUrl])

    useEffect(() => {
        console.log(slides)
    }, [slides])

    useEffect(() => {
        if (currentIndex === slides.length-2){
            const s = initialSlides
            setCurrentIndex(0)
            setSlides(s)
            clearInterval(intervalRef.current);
            intervalRef.current = null
        }
    }, [currentIndex]);


    useEffect(() => {
        setUserInput(transcript)
    }, [transcript])

    useEffect(() => {
        if (userInput.length !== 0){
            setCanSend(true)
        } else {
            setCanSend(false)
        }
    }, [userInput])

  return (
    <div>
      <Head>
        <title>target</title>
        Feature-Policy: autoplay 'self' https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/
      </Head>
      <main className={styles.main}>
      {(wavReady) ? (
      <div>
      <img className={styles.img} src={slides[currentIndex]} alt="Image" />
      <div className={styles.prompt}>{prompt}</div>
      <div className={styles.result}>{result}</div>
      <div className={styles.none}>{currentIndex}</div>
      </div>
      ) : (
        <div className={styles.image_container}>
        <button className={styles.button3} onClick={() => userConformation()}>AIガイドを始める</button>
        </div>
        )}
    </main>
      {wavReady && (
      <div className={styles.bottom_items}>
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
          {!record ?(
            <Button className={styles.button} disabled={!wavReady} variant="outlined" onClick={sttStart}>
              <MicIcon />
              音声入力
            </Button>
          ):(
            <Button color="secondary" className={styles.button} variant="outlined" onClick={sttStop}>
              <StopIcon />
              入力停止
            </Button>)}
          <Button className={styles.button} disabled={!canSend||record} variant="contained" onClick={(event) => onSubmit(event)}>
            <SendIcon />
            質問する
          </Button>
        </div>
     </div>
      )}
        <audio src={wavUrl} ref={audioRef}/>
        <div className={styles.none}>{wavUrl}</div>
    </div>
  );
}

/*


        <div className={styles.messageContainer}>
            <div className={styles.userMessage}>
                {prompt}
            </div>
            <div className={styles.aiMessage}>
                {result}
            </div>
        </div>
*/