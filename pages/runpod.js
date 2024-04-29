import "regenerator-runtime";
import React from "react";
import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import Button from '@mui/material/Button';
import styles from "./index.module.css";

export default function RUNPOD() {
    const [ready, setReady] = useState(false)
    const [isConfirming, setIsConfirming] = useState(false)
    const [elapsed, setElapsed] = useState(0.0)

    const runpod_initialize = async(event) => {   
        event.preventDefault();
        const today = new Date()
        const startTime = today.getTime()
        setReady(false)
        setIsConfirming(true)
        setElapsed(0.0)
        try {
            const response = await fetch("/api/runpod_initialize", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              //body: JSON.stringify({ input: userInput, character: character, fewShot: fewShot, previousData: previousData, sca: scaList[character] }),
              body: JSON.stringify({ character: "silva"}),
            });
    
            const data = await response.json();
            if (data.audioContent != undefined){
                console.log("runpod ready")
                setReady(true)
                setIsConfirming(false)
                const today = new Date()
                const endTime = today.getTime()
                const elapsedTime = (endTime -startTime)/1000
                setElapsed(elapsedTime)
            }
        } catch(error) {
            console.log(error)
            setIsConfirming(false)
        }
    }

    useEffect(() => {

      }, [ready])

    return (
        <div>
            <main className={styles.main}>
            <Button disabled={isConfirming} className={styles.button} variant="contained" onClick={(event) => runpod_initialize(event)}>
            VITS2確認
            </Button>
            {(ready? (
                <div>
                <p>VITS2サーバーはスタンバイしています</p>
                <p>応答までの時間：{elapsed}秒</p>
                </div>
            ):(
                <p></p>
            ))}
            </main>
        </div>
    )
}

