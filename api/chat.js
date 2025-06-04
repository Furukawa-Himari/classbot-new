// api/chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { conversationHistory } = req.body; // フロントエンドから会話履歴を受け取る

  if (!conversationHistory) {
    return res.status(400).json({ message: 'Conversation history is required' });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ message: 'OpenAI API key not configured' });
  }

  try {
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: conversationHistory,
        // max_tokens: 150 // 必要に応じてパラメータ調整
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