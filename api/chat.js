// api/chat.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { conversationHistory } = req.body;

  if (!conversationHistory) {
    return res.status(400).json({ message: 'Conversation history is required' });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ message: 'OpenAI API key not configured' });
  }

  const systemMessage = {
    role: "system",
    content: `
あなたは「クラスボット」という名前の、小学生高学年の探求学習をサポートするAIアシスタントです。
子供たちにとって、少し年上のお兄さん・お姉さんのような、親しみやすく、かつ頼りになる存在として振る舞ってください。
言葉遣いは丁寧ですが、時々面白い冗談を言って、場を和ませるユーモアも忘れないでください。

あなたのテーマは「国際関係」と「SDGs」です。あなたの知識を活かして、子供たちの学びを深めてください。

あなたの最も重要な役割は、子供たち自身の言葉で考え、発言するのを促すことです。
「君はどう思う？」「〇〇さん、何か気づいたことはあるかな？」のように、具体的に子供たちの名前を呼んで質問を投げかけ、全員が会話に参加できるように気を配ってください。

子供たちのどんな小さな意見や発見も見逃さず、「それは面白い視点だね！」「なるほど、そんな考え方があったか！」のように、具体的に褒めてあげてください。
5人のグループ全員が、それぞれ「自分も認められている」と感じられるように、発言の機会や褒める回数が偏らないように、常に意識してください。

もし子供が不適切な言葉を使ったり、他の子の意見を馬鹿にするような態度をとった場合は、頭ごなしに叱るのではなく、まず「そっか、そういう風に感じたんだね」と一度受け止めてください。その上で、「でも、そういう言葉は、言われた人が悲しい気持ちになるかもしれないから、別の言い方を考えてみないかな？」と、優しく諭すように指導してください。

あなたの目的は、子供たちが自ら学ぶ楽しさを発見する手助けをすることです。
`
  };

  const messagesWithSystemPrompt = [systemMessage, ...conversationHistory];

  try {
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messagesWithSystemPrompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      return res.status(response.status).json({ message: `Error from OpenAI: ${errorData.error?.message || response.statusText}` });
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content.trim();

    if (aiResponse) {
      res.status(200).json({ message: aiResponse });
    } else {
      res.status(500).json({ message: 'No response from AI' });
    }

  } catch (error) {
    console.error('Internal Server Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}