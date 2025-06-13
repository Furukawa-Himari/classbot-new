// /api/speaker-profiles.js

// node-fetchの読み込み方をCommonJS形式(require)に変更
const fetch = require('node-fetch');

// --- 設定 ---
// Vercelの環境変数から読み込まれます
const SPEECH_KEY = process.env.SPEECH_KEY;
const SPEECH_REGION = process.env.SPEECH_REGION;

// Speaker Recognition APIのエンドポイント
const SPEAKER_RECOGNITION_ENDPOINT = `https://${SPEECH_REGION}.api.cognitive.microsoft.com/speaker/identification/v2.0`;

/**
 * サーバーレス関数のメインハンドラー
 * @param {object} req - リクエストオブジェクト
 * @param {object} res - レスポンスオブジェクト
 */
export default async function handler(req, res) {
    // HTTPメソッドによって処理を分岐
    const { method } = req;

    try {
        switch (method) {
            case 'GET':
                // GET: 既存のプロファイルを全てリストアップ
                await handleGetAllProfiles(req, res);
                break;
            case 'POST':
                // POST: 新しいスピーカープロファイルを作成
                await handleCreateProfile(req, res);
                break;
            case 'PUT':
                 // PUT: プロファイルに音声登録を行う
                await handleCreateEnrollment(req, res);
                break;
            default:
                res.setHeader('Allow', ['GET', 'POST', 'PUT']);
                res.status(405).end(`Method ${method} Not Allowed`);
        }
    } catch (error) {
        console.error("ハンドラーでエラー発生:", error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

/**
 * Azureに新しいスピーカープロファイルを作成
 */
async function handleCreateProfile(req, res) {
    try {
        // 'name'は実際にはAzure側では使われないが、クライアントからのリクエストに含まれる
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required in request body' });
        }

        const response = await fetch(`${SPEAKER_RECOGNITION_ENDPOINT}/profiles`, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': SPEECH_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 'locale': 'ja-JP' }) // ロケールを日本語に設定
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error.message);
        }
        
        // 新しく作成されたプロファイルIDを返す
        res.status(201).json({ profileId: responseData.profileId });

    } catch (error) {
        console.error("プロファイル作成エラー:", error.message);
        res.status(500).json({ error: `Failed to create profile: ${error.message}` });
    }
}

/**
 * Azureから既存のプロファイルを全て取得
 */
async function handleGetAllProfiles(req, res) {
    // この機能は現在アプリでは使われていませんが、将来のために残しておきます
    try {
        const response = await fetch(`${SPEAKER_RECOGNITION_ENDPOINT}/profiles`, {
            method: 'GET',
            headers: { 'Ocp-Apim-Subscription-Key': SPEECH_KEY }
        });

        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.error.message);
        }

        res.status(200).json(responseData.profiles);
    } catch(error) {
        console.error("プロファイル取得エラー:", error.message);
        res.status(500).json({ error: `Failed to get profiles: ${error.message}` });
    }
}

/**
 * 既存プロファイルに対して音声登録を作成
 */
async function handleCreateEnrollment(req, res) {
    try {
        // ★★★ 修正点 ★★★
        // profileIdをリクエストボディではなく、ヘッダーから取得します。
        // Node.jsはヘッダー名を小文字に変換するため、'x-profile-id'でアクセスします。
        const profileId = req.headers['x-profile-id'];
        
        if (!profileId) {
            return res.status(400).json({ error: 'Profile ID is required in X-Profile-Id header' });
        }

        // クライアントから送られてきた音声データを直接Azureに送信
        const response = await fetch(`${SPEAKER_RECOGNITION_ENDPOINT}/profiles/${profileId}/enrollments`, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': SPEECH_KEY,
                'Content-Type': 'application/octet-stream' // 音声データの形式
            },
            body: req // リクエストのボディ（音声ストリーム）をそのまま渡す
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
