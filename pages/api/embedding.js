import OpenAI from "openai";

//openai@4.7.0での記載方法
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function (req, res) {
    const conversation = req.body.conversation
    try {
        const embedding = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: conversation,
            encoding_format: "float",
        });
        const embeddings = embedding.data.embedding
        res.status(200).json({embedding:embeddings})
    } catch (error) {
        console.log("embedding error")
    }
}