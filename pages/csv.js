import Head from "next/head";
import { useState } from "react";
import { db } from "../lib/FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { storage } from "../lib/FirebaseConfig";
import { ref, uploadString } from "firebase/storage";
import styles from "./index.module.css";

export default function Csv() {
  const [csvFile, setCsvFile] = useState("")
  const [character, setCharacter] = useState("")
  const [systemContent, setSystemContent] = useState("")
   
  const csvdownload = async() => {
    const testRef = doc(db,"Instruction", "taget_tester")
    const testSnap = await getDoc(testRef);

    if (testSnap.exists()) {
        const data = testSnap.data()
        const evaluation = data.evaluation1
        let text = ""
        evaluation.map((item) => {
            const j = item.character + "," + item.prompt + "," + item.completion + "," + item.evaluation + "," + item.idealResponse + "," + item.tester + "," + item.date + "\n"
            text += j
        })
        const storageRef = ref(storage, "development/evaluationDL20230911.csv")
        uploadString(storageRef, text).then((snapshot) => {
        console.log('Uploaded a raw string!');
        });
    } else {
      // docSnap.data() will be undefined in this case
      console.log("No such document!");
    }
  }

    return (
        <>
        <Head>
            <title>target</title>
        </Head>
        <main className={styles.main}>
        <h5>evaluationをcsvでダウンロード（csv.jsで詳細を指定すること）</h5>
        <button onClick={csvdownload}>csv download</button>
        </main>
        </>
    )
}