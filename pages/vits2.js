import "regenerator-runtime";
import React from "react";
import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import Button from '@mui/material/Button';
import MicIcon from '@mui/icons-material/Mic';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import { db, storage } from "../lib/FirebaseConfig";
import { ref, getDownloadURL} from "firebase/storage";
import { collection, query, where, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import { format } from 'data-fns'
import styles from "./index.module.css";

const no_sound = "https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/o/setto%2Fno_sound.mp3?alt=media&token=99787bd0-3edc-4f9a-9521-0b73ad65eb0a"
//const timestamp = Timestamp.now();
//const today = timestamp.toDate();


//20240228 定型挨拶およびアニメーションのないバージョン
export default function VITS2() {
  const initialSlides = new Array(1).fill("Sil_00.jpg")
  const [character, setCharacter] = useState("silva")
  const [userInput, setUserInput] = useState("")
  const [prompt, setPrompt] = useState("")
  const [result, setResult] = useState("")
  const [history, setHistory] = useState([])
  const [items, setItems] = useState([]) //固有名詞リスト
  const [info, setInfo] = useState({}) //固有名詞情報
  const [greetings, setGreetings] = useState([]) //定型QAリスト
  const [gInfo, setGInfo] = useState({}) //定型QA情報
  //wavUrl：cloud storageのダウンロードurl。初期値は無音ファイル。これを入れることによって次からセッティングされるwavUrlで音がなるようになる。
  const [wavUrl, setWavUrl] = useState(no_sound);
  const [slides, setSlides] = useState(initialSlides)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [wavReady, setWavReady] = useState(false)
  const [record,setRecord] = useState(false)
  const [canSend, setCanSend] = useState(false)
  const audioRef = useRef(null)
  const intervalRef = useRef(null)
  const characters = ["silva", "bauncer"]
  const selfwords = ["貴方", "あなた", "君"]
  const user = "user0001" //登録情報より取得
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const characterName = {silva: "シルヴァ", bauncer: "バウンサー"}
  const conversion = {獲端:"獲端",エバナ:"獲端",茅ヶ崎:"茅ヶ崎",茅ケ崎:"茅ヶ崎",チガサキ:"茅ヶ崎",凝部:"凝部",ギョウブ:"凝部",射落:"射落",イオチ:"射落",双巳:"双巳",フタミ:"双巳",陀宰:"陀宰",ダザイ:"陀宰",廃寺:"廃寺",ハイジ:"廃寺",明瀬:"明瀬",アカセ:"明瀬",萬城:"萬城",バンジョウ:"萬城",瀬名:"瀬名",セナ:"瀬名",バウンサー:"バウンサー",監視者:"バウンサー",ディレクター:"ディレクター",プロデューサー:"プロデューサー",
シルヴァ:"シルヴァ", セット:"セット", はめフラ:"はめフラ", 乙女ゲーム:"はめフラ", アラン:"アラン", カタリナ:"カタリナ", キース:"キース", クイード王国:"クイード王国", ジオルド:"ジオルド", ソフィア:"ソフィア", ディルク:"ディルク", ニコル:"ニコル", フレデリク:"フレデリク", メアリ:"メアリ", ライル:"ライル", リリアナ:"リリアナ", ロジー:"ロジー", ロジオン:"ロジー", ヴィンクルム:"ヴィンクルム号", ヴィンクルム号:"ヴィンクルム号"}
  const resetString = ["その情報には、ロックが掛かっています。","ありません。","お答え出来ません。","感情の機能は、備わっていません。","ご質問内容が、エラーです。","その機能は備わっていません。","食事の機能は備わっていません。","必要ありません。"]

  const silvaLists = [["Sil_01-A.jpg", "Sil_00.jpg", "Sil_02-I.jpg", "Sil_04-E.jpg"],["Sil_03-U-O.jpg", "Sil_04-E.jpg", "Sil_00.jpg", "Sil_00.jpg"], ["Sil_02-I.jpg", "Sil_00.jpg", "Sil_03-U-O.jpg","Sil_01-A.jpg"]]

  async function onSubmit(event) {
    event.preventDefault();
    setWavUrl("")
    setRecord(false)
    setCanSend(false)//同じInputで繰り返し送れないようにする
    //const start = new Date().getTime()
    setPrompt(userInput)
    setResult("応答を待ってます・・・")

    let refer = []
    if (history.length < 6){
        refer = history
    } else {
        refer = history.slice(-6)
    }
    //定型QAかどうかの判定のための準備
    let preparedGreeting = ""
    greetings.map((item) => {
      if (userInput.search(item) !==-1){
        const selected = gInfo[item]
        preparedGreeting = selected[Math.floor(Math.random() * selected.length)]
      }
    })
    if (preparedGreeting !== ""){
      loadGreetingData(preparedGreeting)//intervalを0.5sとしてスライド生成
    //ここまで定型応答。以下はopenAIに投げる。
    } else {

      //定型QAのプロセスは20240228では削除
      let setting = "設定に基づいて回答すること。設定:"
      let fewShot = ""
      //登録した固有名詞と一致する語があるか検索
      const convKeys = Object.keys(conversion)
      convKeys.map((item) => {
          if (userInput.search(item) !==-1){
              const cItem = conversion[item]
              const t = item + "は" + info[cItem].join() + "。"
              fewShot += t
          }
      })

      if (fewShot.length == 0){
          fewShot = "あなたは" + info[characterName[character]].join()
      }
      setting += fewShot
      console.log(setting)
    //post
      const startTime = new Date().getTime()
      console.log(startTime)
      try {
        const response = await fetch("/api/generate_vits2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          //body: JSON.stringify({ input: userInput, character: character, fewShot: fewShot, previousData: previousData, sca: scaList[character] }),
          body: JSON.stringify({ input: userInput, setting: setting, history: refer, character: character}),
        });

        const data = await response.json();
        if (response.status !== 200) {
            throw data.error || new Error(`Request failed with status ${response.status}`);
          }

        if (data.wavUrl == ""){
            console.log("new data")
            const bucket_path = "gs://targetproject-394500.appspot.com/" //cloud storage bucket
            const wavPath = bucket_path + data.wav
            const currentRef = ref(storage, wavPath)    
            getDownloadURL(currentRef)
            .then((url) => {
                setWavUrl(url)
                const imageList = createSlides(data.frame)
                setSlides(imageList)
                registrationSpeech(data.wav, data.id, data.pronunciation, data.frame, url, data.audioString, data.result)    
            })
            .catch((error) => {
                console.log(error)
            })
        } else {
            setWavUrl(data.wavUrl)
            const imageList = createSlides(data.frame)
            setSlides(imageList)
            updateSpeech(data.id, data.repeat)
        }
        const responseTime = new Date().getTime()
        console.log(responseTime)
        console.log(responseTime - startTime)

        setResult("・・・")
        setPrompt(data.prompt)
        setTimeout(() => {
          setResult(data.result) 
        }, 3000);

        addConversation(data.prompt, data.result)

        if (resetString.includes(data.result)){
            setHistory([])
        } else {
            const updates = refer.concat([{"role": "user", "content": data.prompt}, {"role": "assistant", "content": data.result}])
            console.log("updates:", updates)
            setHistory(updates)
        }

      } catch(error) {
        console.error(error);
        alert(error.message);
      }
    }
  }

  const registrationSpeech = async(wav, id, pronunciation, frame, url, audioString, resultString) => {
    const fileName = wav.split("/")[2]
    const today = new Date().toISOString()

    const data = {
        output: resultString,
        modified: audioString,
        repeat: 1,
        status: "created by server system",
        updated_at: today,
        filename: fileName,
        url: url,
        frame:frame,
        pronunciation:pronunciation
    }
    const docRef = doc(db, "SpeechVITS", id);
    await setDoc(docRef, data, {merge:true}) 
    }

    const updateSpeech = async(id,repeat) => {
        const today = new Date().toISOString()
        const data = {
            updated_at: today,
            repeat:repeat+1
        }
        const docRef = doc(db, "SpeechVITS", id);
        await setDoc(docRef, data, {merge:true}) 
    }

    const addConversation = async(prompt, result) => {
        const today = new Date()
        const todayISO = today.toISOString()
        const date = todayISO.split("T")[0].replace(/-/g, "")
        const dateNumber = today.getTime()

        const cdata = {
          input: prompt,
          output: result,
          date: date,
          dateNumber: dateNumber
        }
        const convRef = doc(db, "Conversations", user, character,todayISO)
        await setDoc(convRef, cdata)
    }

    /*
    const getEmbedding = async(prompt, result) => {
        const conversation = "user:" + prompt + ",assistant:" + result
        const response = await fetch("/api/embedding", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({conversation:conversation}),
          });
          const data2 = await response.json();
          const embedding = data2.embedding
          return embedding
    }
    */

    const originalInfo = async() => {
        let charactersData = ""
        if (character == "silva"){
        charactersData = "hamefura"
        } else {
        charactersData = "アイデアファクトリー"
        }

        const docRef = doc(db, "OriginalInformation", charactersData);
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
            console.log(g)
            setGreetings(g)
            setGInfo(data)
        } else {
        // docSnap.data() will be undefined in this case
        console.log("No such document!");
        }
    }

    const loadGreetingData = async(text) => {
        const speechRef = collection(db, "SpeechVITS");
        const q = query(speechRef, where("output", "==", text));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const data = doc.data()

            const imageList = createSlides(data.frame)
            setTimeout(() => {
            setWavUrl(data.url)
            setSlides(imageList)
            setResult("・・・")
            }, 400);
            setTimeout(() => {
            setResult(text)
            }, 3400);
        });
    }


    const selectCharacter = (e) => {
        setCharacter(e.target.value);
        console.log(e.target.value);
    }

    const createSlides = (frame) => {

        //bauncerの場合だけ点滅アニメーション。0.5秒で点滅。
        let imageList = []
        if (character == "bauncer"){
        const n = Math.floor(frame/44100)+1 //0.5秒
        for (let i = 0; i<n; i++){
            const s1 = new Array(2).fill("Kanshi-01.jpg")
            const s2 = new Array(2).fill("Kanshi-00.jpg")
            imageList = imageList.concat(s1)
            imageList = imageList.concat(s2)
        }
        const s = new Array(1).fill("Kanshi-00.jpg")
        imageList = imageList.concat(s)
        } else {
        const n = Math.floor(frame/44100)+1 //0.25秒
        for (let i = 0; i<n; i++){
            const m = Math.floor(Math.random()*3)
            imageList = imageList.concat(silvaLists[m])
        }
        const s = new Array(1).fill("Sil_00.jpg")
        imageList = imageList.concat(s)
        }
        return imageList
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
        originalInfo()
        greetingInfo()
        return () => {
            clearInterval(intervalRef.current);
            intervalRef.current = null// コンポーネントがアンマウントされたらタイマーをクリア
            resetTranscript()
        };
    },[])

  useEffect(() => {
    greetingInfo()
    originalInfo()
    if (character == "silva"){
      const s = new Array(1).fill("Sil_00.jpg")
      setSlides(s)
    } else {
      const s = new Array(1).fill("Kanshi-00.jpg")
      setSlides(s)
    }
  },[character])

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

      /*
      audioRef.current.play().then(() => {
        setCurrentIndex(0)
      })
      */
    } else {
    /*
      clearInterval(intervalRef.current);
      intervalRef.current = null
    */
    }   
  }, [wavUrl])

  /*
  useEffect(() => {
    setCurrentIndex(0)
    if (slides.length !== 1){
      if (intervalRef.current !== null) {//タイマーが進んでいる時はstart押せないように//2
        return;
      }
      //intervalはcreateBauncerSlides()に合わせる
      intervalRef.current = setInterval(() => {
          setCurrentIndex((prevIndex) => (prevIndex + 1) % (slides.length))
      }, 500)
      audioRef.current.play().then(() => {
        setCurrentIndex(0)
      })
    } else {
      clearInterval(intervalRef.current);
      intervalRef.current = null
    }
  }, [slides])
  */
  useEffect(() => {
  if (currentIndex === slides.length-2){
    if (character == "silva"){
      const s = new Array(1).fill("Sil_00.jpg")
      setCurrentIndex(0)
      setSlides(s)
      clearInterval(intervalRef.current);
      intervalRef.current = null
      //setWavUrl("")
    } else {
      const s = new Array(1).fill("Kanshi-00.jpg")
      setCurrentIndex(0)
      setSlides(s)
      clearInterval(intervalRef.current);
      intervalRef.current = null
      //setWavUrl("")
    }
    setCurrentIndex(0)
  }
}, [currentIndex]);


  useEffect(() => {
    setUserInput(transcript)
  }, [transcript])

  useEffect(() => {
    if (userInput.length !== 0){
      setCanSend(true)
    }
  }, [userInput])

  useEffect(() => {
    console.log(history)
  }, [history])

  return (
    <div>
      <Head>
        <title>target</title>
        Feature-Policy: autoplay 'self' https://firebasestorage.googleapis.com/v0/b/targetproject-394500.appspot.com/
      </Head>
      <main className={styles.main}>
      {(wavReady) ? (
      <div className={styles.image_container}>
      <img className={styles.anime} src={slides[currentIndex]} alt="Image" />
      <div className={styles.output}>{result}</div>
      <div className={styles.none}>{currentIndex}</div>
      </div>
      ) : (
        <div className={styles.image_container}>
        <select className={styles.select1} value={character} label="character" onChange={selectCharacter}>
        {characters.map((name) => {
          return <option key={name} value={name}>{name}</option>;
        })}
        </select>
        <br/>
        <button className={styles.button3} onClick={() => {audioPlay(); talkStart()}}>トークを始める</button>
        </div>
        )}
        
      {wavReady && (
      <div className={styles.bottom_items}>
       <form onSubmit={onSubmit}>
       <textarea
         type="text"
         name="message"
         placeholder="伝える内容"
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
            伝える
          </Button>
        </div>
     </div>
      )}
        <audio src={wavUrl} ref={audioRef}/>
        <div className={styles.none}>{wavUrl}</div>
      </main>
    </div>
  );
}