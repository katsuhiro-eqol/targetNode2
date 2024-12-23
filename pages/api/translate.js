
export default async function (req, res) {
    const input = req.body.input
    const targetLanguage = req.body.targetLanguage
    console.log(input, targetLanguage)
    const url = `https://translation.googleapis.com/language/translate/v2?key=${process.env.GCP_API_KEY}`;
  
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: input,
          target: targetLanguage,
        }),
      });
        const data = await response.json();
        console.log(data)
        return res.status(200).json({prompt: input, forign:data.data.translations[0].translatedText})
      } catch (error) {
        res.status(400).json({forign:error})
      }
}

/*
    const url = `https://translation.googleapis.com/language/translate/v2`
    try {
        const headers = {
            "Content-Type": "applicatiion/json",
            'X-Goog-Api-Key': process.env.GCP_API_KEY
        }
        const d = {
            q:input,
            target:targetLanguage
        }
        const response = await axios.post(url,d,{headers:headers})
    
*/