//英会話練習用のapi
import OpenAI from "openai";
import textToSpeech from "@google-cloud/text-to-speech"
import fs from "fs";
import util from "util";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function (req, res) {
    const userInput = req.body.input || ''
    const setting = req.body.setting
    const history = req.body.history
    const user = req.body.user
    console.log(history)
    if (userInput.length === 0) {
      res.status(400).json({
        error: {
          message: "Please enter message",
        }
      });
      return;
    }

    fs.readdir("public/", (err, files) => {
        files.forEach(file => {
            if (file.includes(user)){
                console.log(file)
                fs.unlinkSync("public/" + file)
            }
        });
    });


    try {
      const completion = await openai.chat.completions.create({
        messages: generateMessages(userInput, setting, history),
        model: "gpt-3.5-turbo-1106",
        max_tokens: 50,
        stop: "\n",
        temperature: 0.4,
      });
      const resultText = completion.choices[0].message.content
      try {
        const client = new textToSpeech.TextToSpeechClient();
        const request = {
            input: {text: resultText},
            // Select the language and SSML voice gender (optional)
            voice: {languageCode: 'en-US', ssmlGender: 'NEUTRAL'},
            // select the type of audio encoding
            audioConfig: {audioEncoding: 'MP3'},
        };
        const filename = user + Math.random().toString(32).substring(2) + ".mp3"
        // Performs the text-to-speech request
        const [response] = await client.synthesizeSpeech(request);
        // Write the binary audio content to a local file
        const writeFile = util.promisify(fs.writeFile);
        await writeFile("public/" + filename, response.audioContent, 'binary');
        res.status(200).json({ prompt: userInput, result: resultText, audio: filename});
      } catch(error) {
        console.log(error)
      }
    } catch(error) {
          // Consider adjusting the error handling logic for your use case
          if (error.response) {
            console.error(error.response.status, error.response.data);
            res.status(error.response.status).json(error.response.data);
          } else {
            console.error(`Error with OpenAI API request: ${error.message}`);
            res.status(500).json({
              error: {
                message: 'An error occurred during your request.',
              }
            });
        }
    }

  }
  
  function generateMessages(input, setting, history) {
    let messages = [{"role": "system", "content": setting}]
    messages = messages.concat(history)
    messages = messages.concat([{"role": "user", "content": input}])
    console.log(messages)
    return messages
  }
