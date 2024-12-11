import OpenAI from "openai";
import { db } from "../../lib/FirebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import base64 from 'base64-js';

//openai@4.7.0での記載方法
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const embeddingsModel = {"1":"text-embedding-3-small"}

export default async function (req, res) {
    const input = req.body.input
    const attribute = req.body.attribute
    const modelnumber = req.body.modelnumber
    const model = embeddingsModel[modelnumber]

    try {
        const response = await openai.embeddings.create({
            model: model,
            input: input,
            encoding_format: "float",
        });
        const embedding = response.data[0].embedding
        const buffer = new Float32Array(embedding)
        const vectorBase64 = Buffer.from(buffer.buffer).toString('base64')

        res.status(200).json({prompt: input, embedding:vectorBase64})
    } catch (error) {
        res.status(400).json({embedding:error})
    }
}
