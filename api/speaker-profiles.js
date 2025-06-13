export default async function handler(req, res) {
    const { method } = req;
    try {
        switch (method) {
            case 'POST':
                await handleCreateProfile(req, res);
                break;
            case 'PUT':
                await handleCreateEnrollment(req, res);
                break;
            default:
                res.setHeader('Allow', ['POST', 'PUT']);
                res.status(405).end(`Method ${method} Not Allowed`);
        }
    } catch (error) {
        console.error("トップレベルハンドラーでエラー発生:", error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

/**
 * Azureに新しいスピーカープロファイルを作成
 */
async function handleCreateProfile(req, res) {
    console.log("==> handleCreateProfile: 開始");
    try {
        const speechKey = process.env.SPEECH_KEY;
        // ★修正点1: 新しい環境変数 `SPEECH_ENDPOINT` を使用する
        const speechEndpoint = process.env.SPEECH_ENDPOINT; 

        if (!speechKey || !speechEndpoint) {
            const errorMessage = "サーバー設定エラー: SPEECH_KEYまたはSPEECH_ENDPOINT環境変数がVercelに設定されていません。";
            console.error(`==> handleCreateProfile: ${errorMessage}`);
            return res.status(500).json({ error: errorMessage });
        }

        // ★修正点2: エンドポイントURLを正しく構築する
        // `speechEndpoint` は 'https://<your-resource-name>.cognitiveservices.azure.com/' のような形式であるべきです
        const endpoint = `${speechEndpoint}speaker/identification/v2.0/profiles`;
        console.log(`==> handleCreateProfile: 構築されたAzureエンドポイント: ${endpoint}`);

        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required in request body' });
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': speechKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 'locale': 'ja-JP' })
        });

        const responseData = await response.json();
        console.log(`==> handleCreateProfile: Azureからのレスポンスステータス: ${response.status}`);
        console.log("==> handleCreateProfile: Azureからのレスポンスデータ:", JSON.stringify(responseData, null, 2));

        if (!response.ok) {
            // Azureからのエラーメッセージを直接利用する
            throw new Error(responseData.error?.message || 'Unknown error from Azure');
        }
        
        console.log("==> handleCreateProfile: プロファイル作成成功");
        res.status(201).json({ profileId: responseData.profileId });

    } catch (error) {
        console.error("==> handleCreateProfile: catchブロックでエラー発生:", error.message);
        res.status(500).json({ error: `Failed to create profile: ${error.message}` });
    }
}

/**
 * 既存プロファイルに対して音声登録を作成
 */
async function handleCreateEnrollment(req, res) {
    try {
        const speechKey = process.env.SPEECH_KEY;
        // ★修正点3: こちらの関数でも新しい環境変数を使う
        const speechEndpoint = process.env.SPEECH_ENDPOINT;

        if (!speechKey || !speechEndpoint) {
            throw new Error("サーバー設定エラー: SPEECH_KEYまたはSPEECH_ENDPOINTがありません。");
        }

        const profileId = req.headers['x-profile-id'];
        if (!profileId) {
            return res.status(400).json({ error: 'Profile ID is required in X-Profile-Id header' });
        }

        // ★修正点4: 登録用のエンドポイントも正しく構築する
        const endpoint = `${speechEndpoint}speaker/identification/v2.0/profiles/${profileId}/enrollments`;

        // VercelのBody-Parserはデフォルトで有効なので、リクエストボディを直接ストリームできます
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': speechKey,
                'Content-Type': 'application/octet-stream'
            },
            body: req.body // Vercelでは `req` ではなく `req.body` を使います
        });
        
        // 音声登録APIは成功時に202 (Accepted) を返すことがある
        if (response.status === 200 || response.status === 202) {
             const responseData = await response.json();
             res.status(response.status).json(responseData);
        } else {
             const errorData = await response.json();
             throw new Error(errorData.error?.message || 'Unknown enrollment error');
        }

    } catch (error) {
        console.error("音声登録エラー:", error.message);
        res.status(500).json({ error: `Failed to enroll voice: ${error.message}` });
    }
}
