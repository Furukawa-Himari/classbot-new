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
    // =============================================
// ★★★ここから音声会話プログラム★★★
// =============================================

// --- 準備：HTMLの部品と、ブラウザの魔法を使えるようにする ---

// HTMLから「マイクで話す」ボタンを探してきます
const voiceButton = document.getElementById('voice-button');

// ブラウザの「話を聞く魔法」を使えるように準備します
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// もし魔法が使えないブラウザだったら、ボタンを隠してお知らせします
if (!SpeechRecognition) {
  voiceButton.style.display = 'none';
  console.log('このブラウザは音声認識に対応していません。Google Chromeで試してください。');
}

// 「聞く魔法」の細かい設定（日本語で話すことを伝えます）
const recognition = new SpeechRecognition();
recognition.lang = 'ja-JP';

// --- 呪文①：「話す魔法」を準備する ---
// テキストを渡すと、それを音声で読み上げてくれる命令のかたまり（関数）です
function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  window.speechSynthesis.speak(utterance);
}

// --- 呪文②：「聞く魔法」を使う ---

// 「マイクで話す」ボタンがクリックされたら、聞く魔法(音声認識)を開始します
voiceButton.addEventListener('click', () => {
  // マイクの使用許可を求めるポップアップがブラウザに表示される場合があります。許可してください。
  console.log('音声認識を開始します...');
  recognition.start();
});

// 話した声が、文字に変換されたら実行される処理です
recognition.addEventListener('result', (event) => {
  const spokenText = event.results[0][0].transcript;
  console.log('認識されたテキスト:', spokenText);

  // ★★★重要★★★
  // ここで、日葵さんの既存のコードを使って、AIにメッセージを送ります。
  // 例えば、入力欄に文字を入れてから送信ボタンを押す仕組みなら、以下のようにします。

  // 1. あなたのHTMLにある入力欄を探してきます
  const chatInput = document.getElementById('userInput'); // IDが`userInput`の場合
  // 2. あなたのHTMLにある送信ボタンを探してきます
  const sendButton = document.getElementById('sendButton'); // IDが`sendButton`の場合

  // 3. 入力欄に、認識した音声テキストをセットします
  chatInput.value = spokenText;
  // 4. 送信ボタンをプログラムからクリックして、AIにメッセージを送ります
  sendButton.click();
});

// 新しい「エラー探知機」の足跡
recognition.onerror = (event) => {
  console.error('★★★★★ エラー探知機が作動しました！ ★★★★★');
  console.error('エラーの種類:', event.error);
  console.error('エラーの詳細メッセージ:', event.message);
};

// 音声認識の様々な状態を監視する「足跡」を追加
recognition.onstart = () => {
  console.log('イベント足跡: onstart - 実際に音声認識が開始されました。マイクが起動しているはずです。');
};

recognition.onspeechend = () => {
  console.log('イベント足跡: onspeechend - 話し声の終わりを検出しました。');
};

recognition.onend = () => {
  console.log('イベント足跡: onend - 音声認識が終了しました。');
};
});