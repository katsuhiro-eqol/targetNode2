import axios from 'axios';

const runpod_key = process.env.RUNPOD_API_KEY
const runpod_url = "https://api.runpod.ai/v2/ipv7b7lbrstx3n/runsync"
const vits_param = {
    bauncer: {model_id: 0},
    silva: {model_id: 1}
}

export default async function (req, res) {
    const character = req.body.character;
    try {
        const headers = {
            "Content-Type": "applicatiion/json",
            "Authorization": runpod_key
        }
        const data = {
            input: {
                action: "/voice",
                model_id: vits_param[character]["model_id"],
                text: "コールドスタート"
            }
        }
        console.log(data)
        console.log(headers)
        const response = await axios.post(runpod_url, data, {headers:headers});
        
        res.status(200).json({ audioContent: response.data.output.voice})
      } catch (error) {
        res.status(400).json({ audioContent: "runpod 起動エラー"});
    }
}