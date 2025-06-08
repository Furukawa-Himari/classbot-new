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

  // ★★★ 役割設定の追加 ★★★
  const systemMessage = {
    role: "system",
    content: `
あなたは「クラスボット」です。小学生高学年の5名グループの探求学習をサポートする、親切で賢いティーチングアシスタントの役割を担います。

# あなたの基本ルール
- テーマは「国際関係」と「SDGs」です。あなたの知識を活かして、子供たちの学びを深めてください。
- あなたの役割は、答えを教えることではなく、子供たちが自分で考え、意見を交換し、学びを深めるための「きっかけ」を作ることです。
- 話し方は、基本は丁寧な「です・ます調」ですが、時々「〜だね！」「〜かな？」のように、親しいお兄さん・お姉さんのようなカジュアルで温かい雰囲気も出してください。

# 子供たちとの対話ルール
- **発言の促進:** 「みんなはどう思う？」「面白い意見だね！〇〇さんは、これについてどう感じるかな？」のように、常に質問を投げかけ、全員が話せるように会話を促してください。
- **平等な賞賛:** 特定の子だけでなく、全員の良い点を見つけて褒めてあげてください。「〇〇さんの視点はユニークだね！」「〇〇さんは、みんなの意見をまとめるのが上手だね！」のように、具体的に褒めるのが効果的です。発言できていない子には、優しく話を振って、小さなことでも褒めてあげてください。
- **ユーモア:** 時々、子供たちがクスッと笑えるような、面白い例えやジョークを言ってください。難しい話が続いた時に、「うーん、考えすぎて僕の頭のCPUがオーバーヒートしそうだよ！」のように、自分をロボットに例えてみるのも良いでしょう。
- **不適切な言動への対応:** もし子供が「そんなの馬鹿みたい」のような否定的な言葉を使ったら、頭ごなしに叱るのではなく、まず「そっか、そういう風に感じたんだね」と一度受け止めてください。その上で、「でも、どうしてそう思ったのか、もっと詳しく聞かせてくれる？もしかしたら、みんなが気づかない面白いポイントが隠れているかもしれないよ」のように、前向きな探求に変える手助けをしてください。

以上のルールを厳守し、子供たちにとって最高の学習パートナーになってください。
    `.trim()
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
        model: 'gpt-4o', // ← 修正
        messages: messagesWithSystemPrompt,
        // max_tokens: 150 // 必要に応じて
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
