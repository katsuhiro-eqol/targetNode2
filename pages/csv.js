import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import { db } from "../lib/FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { storage } from "../lib/FirebaseConfig";
import { ref, uploadString } from "firebase/storage";
import styles from "./index.module.css";

export default function Csv() {
   
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
        <p>csvをダウンロード</p>
        <button onClick={csvdownload}>csv download</button>
        </main>
        </>
    )
}