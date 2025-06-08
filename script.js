document.addEventListener('DOMContentLoaded', () => {
    const chatLog = document.getElementById('chat-log');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const startButton = document.getElementById('startButton');

    // OpenAI APIキーはフロントエンドから削除します。
// Vercelの環境変数に設定し、バックエンドAPI経由で利用します。

// 会話の履歴を保持する配列
let conversationHistory = [];

    // 開始ボタンが押されたときの処理
    startButton.addEventListener('click', () => {
        addMessageToLog("AI", "こんにちは！何かお話ししましょう。");
        // 必要であれば、ここで最初のAPIコールをしても良い
        // (例: conversationHistoryに初期メッセージを追加してsendMessageToOpenAIを呼び出す)
        // conversationHistory.push({ role: "system", content: "あなたは親切なアシスタントです。" }); // 必要なら
        startButton.disabled = true; // 一度押したら無効にするなど
    });

    // 送信ボタンが押されたときの処理
    sendButton.addEventListener('click', () => {
        const userMessage = userInput.value.trim();
        if (userMessage) {
            addMessageToLog("あなた", userMessage);
            conversationHistory.push({ role: "user", content: userMessage });
            sendMessageToOpenAI(); // ユーザーメッセージはconversationHistoryに含まれるため引数不要
            userInput.value = ''; // 入力欄をクリア
        }
    });

    // Enterキーでも送信できるようにする (任意)
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendButton.click();
        }
    });

    // メッセージをチャットログに追加する関数
    function addMessageToLog(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender.toLowerCase()); // 'user' or 'ai' class
        messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`; // XSSに注意。信頼できないHTMLを直接挿入しないこと。
        chatLog.appendChild(messageElement);
        chatLog.scrollTop = chatLog.scrollHeight; // 自動で一番下にスクロール
    }

    // OpenAI APIにメッセージを送信する関数 (バックエンド経由に変更)
    async function sendMessageToOpenAI() {
        addMessageToLog("AI", "考え中...");

        try {
            // バックエンドのAPIルートのURL
            const backendApiUrl = '/api/chat'; // Vercelでデプロイした場合の相対パス

            const response = await fetch(backendApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Authorizationヘッダーはバックエンドで付与するのでここには不要
                },
                body: JSON.stringify({
                    // バックエンドAPIが期待する形式で会話履歴を送信
                    // 前回の提案では conversationHistory をそのまま送りましたが、
                    // バックエンドで model や messages を構築する場合は、
                    // conversationHistory の内容だけを送るのが一般的です。
                    // バックエンドの /api/chat.js の実装に合わせてください。
                    // 今回は前回の /api/chat.js の例に合わせて conversationHistory を送ります。
                    conversationHistory: conversationHistory
                })
            });

            // "考え中..." のメッセージを特定して削除
            const thinkingMessageElement = Array.from(chatLog.children).find(el => {
                const strongTag = el.querySelector('strong');
                return strongTag && strongTag.textContent === 'AI:' && el.textContent.includes("考え中...");
            });
            if (thinkingMessageElement) {
                thinkingMessageElement.remove();
            }


            if (!response.ok) {
                const errorData = await response.json(); // バックエンドからのエラーメッセージを取得
                console.error('Backend API Error:', errorData);
                addMessageToLog("AI", `エラーが発生しました: ${errorData.message || `Status ${response.status}`}`);
                return;
            }

            const data = await response.json();

            // バックエンドからの応答を取得 (バックエンドのレスポンス構造に合わせる)
            const aiResponse = data.message; // 前回の /api/chat.js の例では { message: "AIの返答" } で返している想定

            if (aiResponse) {
                addMessageToLog("AI", aiResponse);
                speak(aiResponse);
                conversationHistory.push({ role: "assistant", content: aiResponse });
            } else {
                addMessageToLog("AI", "すみません、うまく応答できませんでした。");
            }

        } catch (error) {
            console.error('Fetch Error:', error);
            addMessageToLog("AI", "通信エラーが発生しました。");
             // エラー時に "考え中..." が残っていれば削除
            const thinkingMessageOnError = Array.from(chatLog.children).find(el => {
                const strongTag = el.querySelector('strong');
                return strongTag && strongTag.textContent === 'AI:' && el.textContent.includes("考え中...");
            });
            if (thinkingMessageOnError) {
                thinkingMessageOnError.remove();
            }
        }
    }
});
document.addEventListener('DOMContentLoaded', () => {

    //
    // 日葵さんが元々書いていたコードが全部ここにあります
    // (const chatLog = ... とか、sendMessageToOpenAI とか...)
    //

    // =============================================
    // ★★★ここから音声会話プログラム★★★
    // ★★★（この場所にお引越しさせる）★★★
    // =============================================
    const voiceButton = document.getElementById('voice-button');
    // ...以下、音声会話のコードが続く...


}); // ← この}); の内側に入っていればOKです！