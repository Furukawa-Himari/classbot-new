// /api/get-speech-token.js

/**
 * このサーバーレス関数は、Azure Speech Serviceの認証トークンを安全に生成し、
 * フロントエンドに提供します。これにより、メインのAPIキーをクライアントサイドで
 * 露出させることなく、Speech SDKを使用できます。
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end('Method Not Allowed');
    }

    const speechKey = process.env.SPEECH_KEY;
    const speechRegion = process.env.SPEECH_REGION;

    if (!speechKey || !speechRegion) {
        console.error("Token API Error: SPEECH_KEY or SPEECH_REGION is not set in environment variables.");
        return res.status(500).json({ error: 'Server configuration error.' });
    }

    // Azureのトークン発行エンドポイントにPOSTリクエストを送信
    const tokenEndpoint = `https://${speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;

    try {
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': speechKey,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to fetch auth token from Azure. Status: ${response.status}, Details: ${errorText}`);
            return res.status(response.status).json({ error: 'Failed to retrieve authorization token from Azure.' });
        }

        // プレーンテキストで返されるトークンを取得
        const token = await response.text();
        
        // トークンとリージョンをフロントエンドに返す
        res.status(200).json({ token, region: speechRegion });

    } catch (error) {
        console.error("Internal Server Error in token API:", error);
        res.status(500).json({ error: 'Internal server error while fetching the token.' });
    }
}
