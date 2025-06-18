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

async function handleCreateProfile(req, res) {
    console.log("==> handleCreateProfile: 開始");
    try {
        const speechKey = process.env.SPEECH_KEY;
        // ★ 元に戻す: Azureポータルから取得した完全なエンドポイントURLを使用するため、SPEECH_ENDPOINT を再度使用します。
        const speechEndpoint = process.env.SPEECH_ENDPOINT; 

        if (!speechKey || !speechEndpoint) {
            const errorMessage = "サーバー設定エラー: SPEECH_KEYまたはSPEECH_ENDPOINT環境変数がVercelに設定されていません。";
            console.error(`==> handleCreateProfile: ${errorMessage}`);
            return res.status(500).json({ error: errorMessage });
        }

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
        if (!response.ok) {
            throw new Error(responseData.error?.message || 'Unknown error from Azure');
        }
        res.status(201).json({ profileId: responseData.profileId });

    } catch (error) {
        console.error("==> handleCreateProfile: catchブロックでエラー発生:", error.message);
        res.status(500).json({ error: `Failed to create profile: ${error.message}` });
    }
}

async function handleCreateEnrollment(req, res) {
    try {
        const speechKey = process.env.SPEECH_KEY;
        const speechEndpoint = process.env.SPEECH_ENDPOINT;

        if (!speechKey || !speechEndpoint) {
            throw new Error("サーバー設定エラー: SPEECH_KEYまたはSPEECH_ENDPOINTがありません。");
        }

        const profileId = req.headers['x-profile-id'];
        if (!profileId) {
            return res.status(400).json({ error: 'Profile ID is required in X-Profile-Id header' });
        }

        const endpoint = `${speechEndpoint}speaker/identification/v2.0/profiles/${profileId}/enrollments`;

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
            throw new Error(errorData.error?.message || 'Unknown enrollment error');
        }

    } catch (error) {
        console.error("音声登録エラー:", error.message);
        res.status(500).json({ error: `Failed to enroll voice: ${error.message}` });
    }
}