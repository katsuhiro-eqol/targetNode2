import OpenAI from "openai";

//tester.js用
const finetuned_model = {setto:"ft:gpt-3.5-turbo-0613:personal::7zayZD3r", silva:"ft:gpt-3.5-turbo-0613:personal::7yhcFCbA", バウンサー:"ft:gpt-3.5-turbo-1106:personal::8Wg2MJF4"}
//20230904

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function (req, res) {
  const userInput = req.body.input || '';
  const character = req.body.character;
  const fewShot = req.body.fewShot;
  console.log(character)
  console.log(generateMessages(userInput, fewShot))
  console.log(finetuned_model[character])
  if (userInput.length === 0) {
    res.status(400).json({
      error: {
        message: "Please enter message",
      }
    });
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      messages: generateMessages(userInput, fewShot),
      model: finetuned_model[character],
      //model: "gpt-3.5-turbo",
      max_tokens: 80,
      stop: "\n",
      temperature: 0.4,
    });
    //res.status(200).json({ prompt: userInput, result: completion.data.choices[0].message });
    res.status(200).json({ prompt: userInput, result: completion.choices[0].message.content  });
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

function generateMessages(input, fewShot) {
  const messages = [
    /*
    {"role": "system", "content": "設定に基づいて必ず50字以内で回答すること。設定:陀宰は男性,17歳,高校2年生,両親と姉と兄がいる,右目の視力がない,面倒なことに巻き込まれやすいタイプ,正式名はダザイメイ,そっけないけど、一途なところがある,特技はツッコミと危機察知,好きな食べ物は炭酸飲料とグラタン,好きな動物は猫。"},
    {"role": "user", "content": "陀宰のことを教えて"},
    {"role": "assistant", "content":"陀宰は17歳の高校生、猫好きです。"},
    {"role": "user", "content": "陀宰の特技を教えて"},
    {"role": "assistant", "content":"その情報にはアクセスできません。"},
    */
    {"role": "system", "content": fewShot},
    {"role": "user", "content": input}
  ]
  return messages
}
