import OpenAI from "openai";

//openai@4.7.0での記載方法
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function (req, res) {
    const conversation = req.body.conversation
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: conversation,
            encoding_format: "float",
        });
        const embedding = response.data[0].embedding
        console.log(embedding)
        res.status(200).json({embedding:"success"})
    } catch (error) {
        //res.status(400).json({embedding:error})
        console.log(error)
    }
}