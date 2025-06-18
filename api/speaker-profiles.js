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
        // ★ 修正: SPEECH_ENDPOINT の代わりに SPEECH_REGION を使用し、設定を統一します。
        const speechRegion = process.env.SPEECH_REGION; 

        if (!speechKey || !speechRegion) {
            const errorMessage = "サーバー設定エラー: SPEECH_KEYまたはSPEECH_REGION環境変数がVercelに設定されていません。";
            console.error(`==> handleCreateProfile: ${errorMessage}`);
            return res.status(500).json({ error: errorMessage });
        }

        // ★ 修正: SPEECH_REGION からエンドポイントURLを動的に構築します。
        const endpoint = `https://${speechRegion}.api.cognitive.microsoft.com/speaker/identification/v2.0/profiles`;
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
            throw new Error(responseData.error?.message || `Unknown error from Azure (Status: ${response.status})`);
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
        // ★ 修正: こちらの関数でも SPEECH_REGION を使用します。
        const speechRegion = process.env.SPEECH_REGION;

        if (!speechKey || !speechRegion) {
            throw new Error("サーバー設定エラー: SPEECH_KEYまたはSPEECH_REGIONがありません。");
        }

        const profileId = req.headers['x-profile-id'];
        if (!profileId) {
            return res.status(400).json({ error: 'Profile ID is required in X-Profile-Id header' });
        }

        // ★ 修正: 登録用のエンドポイントも SPEECH_REGION から構築します。
        const endpoint = `https://${speechRegion}.api.cognitive.microsoft.com/speaker/identification/v2.0/profiles/${profileId}/enrollments`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': speechKey,
                'Content-Type': 'application/octet-stream'
            },
            body: req.body 
        });
        
        if (response.status === 200 || response.status === 202) {
             const responseData = await response.json();
             res.status(response.status).json(responseData);
        } else {
             const errorData = await response.json();
             throw new Error(errorData.error?.message || `Unknown enrollment error (Status: ${response.status})`);
        }

    } catch (error) {
        console.error("音声登録エラー:", error.message);
        res.status(500).json({ error: `Failed to enroll voice: ${error.message}` });
    }
}