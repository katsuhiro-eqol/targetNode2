import axios from 'axios';

const ecs_url = "http://13.113.209.222:80" //esc@aws ElasticIP

export default async function (req, res) {
    const character = req.body.character;
    try {
        const query = ecs_url + "?input=イニシャライズ&hash=initialize&character=" + character
        const response = await axios.get(query);
        res.status(200).json({ result: "", wav: response.data});
    } catch(error) {
        res.status(200).json({ result: "少しお待ちください", wav: ""});
    }
}