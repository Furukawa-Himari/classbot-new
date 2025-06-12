// /api/debug-env.js
// このファイルは、Vercelの環境変数が正しく読み込まれているか確認するためのものです。

export default function handler(req, res) {
  // Vercelのサーバーで環境変数を読み取ります
  const speechKey = process.env.VITE_SPEECH_KEY;
  const speechRegion = process.env.VITE_SPEECH_REGION;

  // セキュリティのため、キー全体は表示しません
  const keyExists = !!speechKey; // キーが存在するかどうか (true/false)
  const keyHint = speechKey ? `${speechKey.substring(0, 4)}...${speechKey.substring(speechKey.length - 4)}` : "Not Found";

  // 結果をJSON形式でブラウザに表示します
  res.status(200).json({
    message: "これはVercelのサーバーが読み込んでいる環境変数です。",
    isKeyFound: {
      description: "VITE_SPEECH_KEYは設定されていますか？",
      value: keyExists,
    },
    speechKeyHint: {
      description: "キーのヒント（最初と最後の4文字）",
      value: keyHint,
    },
    speechRegion: {
      description: "VITE_SPEECH_REGIONの値",
      value: speechRegion || "Not Found",
    },
  });
}
