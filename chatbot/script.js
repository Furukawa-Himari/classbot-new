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
        
        utterance.onend = () => {
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
    startButton.addEventListener('click', () => {
        const startMessage = "こんにちは！これから国際関係やSDGsについて、みんなで探求学習を始めよう！";
        addMessageToLog("AI", startMessage);
        speak(startMessage);
        conversationHistory.push({ role: "system", content: "あなたはクラスボットです。探求学習が始まりました。" });
        conversationHistory.push({ role: "assistant", content: startMessage });
        startButton.disabled = true;
    });

    sendButton.addEventListener('click', () => {
        const userMessage = userInput.value.trim();
        if (userMessage) {
            handleUserMessage(userMessage);
            userInput.value = '';
        }
    });

    voiceButton.addEventListener('click', () => {
        continueConversation = true;
        console.log('音声認識を開始します...');
        recognition.start();
    });

    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendButton.click();
        }
    });

    // --- ⑤ 音声認識のイベント処理 ---
    recognition.addEventListener('result', (event) => {
        const spokenText = event.results[0][0].transcript;
        handleUserMessage(spokenText);
    });
    
    recognition.onerror = (event) => {
        console.error('音声認識エラー:', event.error, event.message);
        addMessageToLog("AI", `ごめんなさい、マイクでエラーが起きたみたいです: ${event.error}`);
    };

    // --- ⑥ 共通の処理をまとめた関数 ---
    function handleUserMessage(message) {
        addMessageToLog("あなた", message);
        conversationHistory.push({ role: "user", content: message });
        
        if (message.includes('さようなら')) {
            continueConversation = false;
        } else {
            continueConversation = true;
        }
        
        sendMessageToOpenAI();
    }

    function addMessageToLog(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender.toLowerCase());
        messageElement.innerHTML = `<strong>${sender}:</strong> `;
        
        const messageText = document.createTextNode(message); // XSS対策
        messageElement.appendChild(messageText);

        chatLog.appendChild(messageElement);
        chatLog.scrollTop = chatLog.scrollHeight;
        return messageElement;
    }

    async function sendMessageToOpenAI() {
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
                throw new Error(errorData.message || `Status ${response.status}`);
            }
            const data = await response.json();
            const aiResponse = data.message;
            if (aiResponse) {
                addMessageToLog("AI", aiResponse);
                conversationHistory.push({ role: "assistant", content: aiResponse });
                speak(aiResponse);
            }
        } catch (error) {
            console.error('API Error:', error);
            if(thinkingMessage) thinkingMessage.remove();
            addMessageToLog("AI", `エラーが発生しました: ${error.message}`);
        }
    }
});