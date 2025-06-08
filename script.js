document.addEventListener('DOMContentLoaded', () => {
    // --- ① 準備：HTMLの部品を探してくる ---
    const chatLog = document.getElementById('chat-log');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const startButton = document.getElementById('startButton');
    const voiceButton = document.getElementById('voice-button');

    // --- ② 準備：大事なデータをしまっておく変数 ---
    let conversationHistory = [];
    let continueConversation = true; // 会話を続けるかどうかの旗

    // --- ③ 準備：「話を聞く魔法」と「話す魔法」 ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';

    function speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        
        // AIが話し終わったら、次の行動を決める
        utterance.onend = () => {
            // もし「会話を続ける」の旗がONの時だけ、マイクを起動する
            if (continueConversation) {
                console.log('AIの話が完了。次のマイク入力を待ちます...');
                recognition.start();
            } else {
                console.log('会話が終了しました。');
            }
        };
        
        window.speechSynthesis.speak(utterance);
    }

    // --- ④ イベント処理：ボタンが押されたら何をするか ---

    // 「開始」ボタンの処理
    startButton.addEventListener('click', () => {
        addMessageToLog("AI", "こんにちは！何かお話ししましょう。");
        speak("こんにちは！何かお話ししましょう。"); // 開始メッセージも話すように追加
        startButton.disabled = true;
    });

    // 「送信」ボタン（文字入力）の処理
    sendButton.addEventListener('click', () => {
        const userMessage = userInput.value.trim();
        if (userMessage) {
            handleUserMessage(userMessage);
            userInput.value = '';
        }
    });

    // 「マイクで話す」ボタンの処理
    voiceButton.addEventListener('click', () => {
        continueConversation = true; // マイクボタンが押されたら、必ず会話を再開する
        console.log('音声認識を開始します...');
        recognition.start();
    });

    // Enterキーでも送信
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendButton.click();
        }
    });

    // --- ⑤ 音声認識のイベント処理 ---

    // 声が文字に変換されたら
    recognition.addEventListener('result', (event) => {
        const spokenText = event.results[0][0].transcript;
        handleUserMessage(spokenText);
    });
    
    // 音声認識でエラーが起きたら
    recognition.onerror = (event) => {
        console.error('音声認識エラー:', event.error, event.message);
    };


    // --- ⑥ 共通の処理をまとめた関数 ---

    // ユーザーからのメッセージを処理する関数
    function handleUserMessage(message) {
        addMessageToLog("あなた", message);
        conversationHistory.push({ role: "user", content: message });
        
        // 「さようなら」チェック
        if (message.includes('さようなら')) {
            continueConversation = false;
        } else {
            continueConversation = true;
        }
        
        sendMessageToOpenAI();
    }

    // チャットログにメッセージを追加する関数
    function addMessageToLog(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender.toLowerCase());
        messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
        chatLog.appendChild(messageElement);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    // OpenAI APIにメッセージを送信する関数
    async function sendMessageToOpenAI() {
        // ... (この関数の中身は日葵さんの元のコードとほぼ同じなので省略) ...
        // ... 正しく動いていたので、変更の必要はありません！ ...
        const thinkingMessage = addMessageToLog("AI", "考え中...");
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationHistory: conversationHistory })
            });

            if(thinkingMessage) thinkingMessage.remove();

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message);
            }
            const data = await response.json();
            const aiResponse = data.message;
            if (aiResponse) {
                addMessageToLog("AI", aiResponse);
                speak(aiResponse);
                conversationHistory.push({ role: "assistant", content: aiResponse });
            }
        } catch (error) {
            console.error('API Error:', error);
            addMessageToLog("AI", `エラーが発生しました: ${error.message}`);
            if(thinkingMessage) thinkingMessage.remove();
        }
    }
});