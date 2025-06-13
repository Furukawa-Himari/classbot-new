// /api/speaker-profiles.js

// NOTE: 'node-fetch' is not needed in modern Vercel runtimes; the global fetch API is used.

/**
 * サーバーレス関数のメインハンドラー
 * @param {object} req - リクエストオブジェクト
 * @param {object} res - レスポンスオブジェクト
 */
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
            // GET is unused and removed for simplicity
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
 * Azureに新しいスピーカープロファイルを作成（デバッグログ付き）
 */
async function handleCreateProfile(req, res) {
    // --- DEBUGGING START ---
    console.log("==> handleCreateProfile: 開始");
    console.log(`Region from env: ${process.env.SPEECH_REGION}`);
    console.log(`Is SPEECH_KEY set: ${!!process.env.SPEECH_KEY}`); // Log true/false, not the key itself
    // --- DEBUGGING END ---

    try {
        const speechKey = process.env.SPEECH_KEY;
        const speechRegion = process.env.SPEECH_REGION;

        if (!speechKey || !speechRegion) {
            const errorMessage = "サーバー設定エラー: SPEECH_KEYまたはSPEECH_REGION環境変数がVercelに設定されていません。";
            console.error(`==> handleCreateProfile: ${errorMessage}`);
            return res.status(500).json({ error: errorMessage });
        }

        const endpoint = `https://${speechRegion}.api.cognitive.microsoft.com/speaker/identification/v2.0/profiles`;
        
        // --- DEBUGGING START ---
        console.log(`==> handleCreateProfile: 構築されたAzureエンドポイント: ${endpoint}`);
        // --- DEBUGGING END ---

        const { name } = req.body;
        if (!name) {
            console.error("==> handleCreateProfile: エラー - リクエストボディに'name'がありません。");
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

        // --- DEBUGGING START ---
        console.log(`==> handleCreateProfile: Azureからのレスポンスステータス: ${response.status}`);
        console.log("==> handleCreateProfile: Azureからのレスポンスデータ:", JSON.stringify(responseData, null, 2));
        // --- DEBUGGING END ---

        if (!response.ok) {
            throw new Error(responseData.error.message);
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
    const speechKey = process.env.SPEECH_KEY;
    const speechRegion = process.env.SPEECH_REGION;

    try {
        if (!speechKey || !speechRegion) {
            throw new Error("サーバー設定エラー: SPEECH_KEYまたはSPEECH_REGIONがありません。");
        }
        const endpointBase = `https://${speechRegion}.api.cognitive.microsoft.com/speaker/identification/v2.0`;
        const profileId = req.headers['x-profile-id'];
        
        if (!profileId) {
            return res.status(400).json({ error: 'Profile ID is required in X-Profile-Id header' });
        }

        const response = await fetch(`${endpointBase}/profiles/${profileId}/enrollments`, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': speechKey,
                'Content-Type': 'application/octet-stream'
            },
            body: req
        });
        
        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error.message);
        }
        
        res.status(200).json(responseData);

    } catch (error) {
        console.error("音声登録エラー:", error.message);
        res.status(500).json({ error: `Failed to enroll voice: ${error.message}` });
    }
}
