import axios from 'axios';

//const ecs_url = "http://13.113.209.222:80" //esc@aws ElasticIP
const ec2_url = "http://54.70.243.84:5000" //espnet@aws

export default async function (req, res) {
    const character = req.body.character;
    try {
        const query = ec2_url + "?input=イニシャライズ&hash=initialize&character=" + character
        const response = await axios.get(query);
        res.status(200).json({ result: "", wav: response.data});
    } catch(error) {
        //res.status(200).json({ result: "少しお待ちください", wav: ""});
        console.log(error)
    }
}