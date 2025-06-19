// --- DOM Element References ---
const recordButton = document.getElementById('recordButton');
const micIcon = document.getElementById('micIcon');
const stopIcon = document.getElementById('stopIcon');
const statusEl = document.getElementById('status');
const transcriptContainer = document.getElementById('transcriptContainer');

// --- Application State ---
let conversationTranscriber = null;
let isRecording = false;
let conversationData = new Map();
let speakerOrder = [];
let speechConfig = null;

/**
 * Initializes the application by loading the Speech SDK, fetching authentication tokens,
 * and setting up the initial state and event listeners.
 */
async function initializeApp() {
    try {
        // Dynamically load the Azure Speech SDK
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/microsoft-cognitiveservices-speech-sdk@latest/distrib/browser/microsoft.cognitiveservices.speech.sdk.bundle.min.js';
            script.onload = () => resolve();
            script.onerror = (err) => reject(new Error("Failed to load Speech SDK. Check network connection."));
            document.head.appendChild(script);
        });
        
        updateStatus("Authenticating...", false);
        // Fetch authentication token from a server-side endpoint
        const response = await fetch('/api/get-speech-token');
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `Failed to get auth token (Status: ${response.status}).`);
        }
        const { token, region } = await response.json();

        // Configure the Speech SDK with the token and region
        speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region);
        speechConfig.speechRecognitionLanguage = "ja-JP";

        // Enable the record button and set up its click handler
        recordButton.addEventListener('click', handleRecordButtonClick);
        updateStatus("Ready. Press the microphone button to start.", false);
        recordButton.disabled = false;

    } catch (error) {
        console.error("Initialization Error:", error);
        updateStatus(`Error: Initialization failed. ${error.message}`, true);
        recordButton.disabled = true;
    }
}

// Start the application initialization process when the script loads
initializeApp();

/**
 * Handles clicks on the main record/stop button.
 */
function handleRecordButtonClick() {
    if (!isRecording) {
        startDiarization();
    } else {
        stopDiarization();
    }
}

/**
 * Starts the conversation transcription and diarization process.
 */
function startDiarization() {
    if (isRecording || !speechConfig) {
        return;
    }

    updateUIVisuals(true);
    updateStatus("Connecting to service...");

    try {
        // Set up audio input from the default microphone.
        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        if (!audioConfig) {
            throw new Error("Failed to create AudioConfig. Check microphone permissions.");
        }

        // Create the ConversationTranscriber. This class is essential for diarization.
        conversationTranscriber = new SpeechSDK.ConversationTranscriber(speechConfig, audioConfig);
        if (!conversationTranscriber) {
            throw new Error("Failed to create ConversationTranscriber.");
        }

        // Reset conversation data and UI for a new session.
        conversationData.clear();
        speakerOrder = [];
        transcriptContainer.innerHTML = '';

        // --- Set up event handlers for the ConversationTranscriber ---
        conversationTranscriber.sessionStarted = (s, e) => {
            console.log("SessionStarted event: ", e);
            updateStatus("Listening... Speak into your microphone.");
        };
        
        conversationTranscriber.sessionStopped = (s, e) => {
            console.log("SessionStopped event: ", e);
            updateStatus("Session stopped.");
            stopDiarization();
        };
        
        conversationTranscriber.canceled = (s, e) => {
            console.error("Canceled event: ", e);
            updateStatus(`Canceled: ${e.reason}. Error details: ${e.errorDetails}`, true);
            stopDiarization();
        };

        // The 'transcribed' event is key. It provides the final recognition result with the speaker ID.
        conversationTranscriber.transcribed = (s, e) => {
            console.log("TRANSCRIBED: ", e.result);
            const result = e.result;
            if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech && result.text) {
                // The Speaker ID will be "Guest-1", "Guest-2", etc.
                const speakerId = result.speakerId || "Unknown";
                
                if (!conversationData.has(speakerId)) {
                    conversationData.set(speakerId, []);
                    speakerOrder.push(speakerId);
                }
                
                const utterances = conversationData.get(speakerId);
                utterances.push(result.text);
                
                // Re-render the entire transcript to show the new message.
                renderTranscript();
            }
        };

        // Start the transcription process.
        conversationTranscriber.startTranscribingAsync(
            () => {
                console.log("Conversation transcription started successfully.");
            },
            (err) => {
                console.error("Error starting conversation transcription: ", err);
                updateStatus(`Error starting transcription: ${err}`, true);
                stopDiarization();
            }
        );
    } catch (e) {
        console.error("Fatal error within startDiarization:", e);
        updateStatus(`Error: ${e.message}`, true);
        updateUIVisuals(false);
    }
}

/**
 * Stops the conversation transcription and diarization process.
 */
function stopDiarization() {
    if (!conversationTranscriber) {
        // If already stopped or never started, ensure UI is correct and exit.
        updateUIVisuals(false);
        return;
    }
    // Create a local reference and nullify the global one to prevent race conditions.
    const transcriberToStop = conversationTranscriber;
    conversationTranscriber = null;

    // Use stopTranscribingAsync for ConversationTranscriber.
    transcriberToStop.stopTranscribingAsync(
        () => {
            transcriberToStop.close();
            updateUIVisuals(false);
            updateStatus("Recording stopped.");
            console.log("Conversation transcription stopped successfully.");
        },
        (err) => {
            console.error("Error stopping transcription:", err);
            transcriberToStop.close(); // Ensure it's closed even on error.
            updateUIVisuals(false);
            updateStatus(`Stop Error: ${err}`, true);
        }
    );
}

/**
 * Renders the entire conversation transcript based on the current state of `conversationData`.
 */
function renderTranscript() {
    transcriptContainer.innerHTML = ''; // Clear previous content
    for (const speakerId of speakerOrder) {
        const utterances = conversationData.get(speakerId);
        if (!utterances || utterances.length === 0) continue;

        const combinedText = utterances.join(' ');
        
        // Align bubbles left/right based on an arbitrary speaker number for visual separation
        const speakerNumber = parseInt(speakerId.split(" ")[1] || "1");
        const alignClass = speakerNumber % 2 !== 0 ? 'align-left' : 'align-right';

        const bubbleContainer = document.createElement('div');
        bubbleContainer.className = `speaker-bubble-container ${alignClass}`;
        
        bubbleContainer.innerHTML = `
            <div class="speaker-bubble">
                <p class="speaker-name">${speakerId}</p>
                <p>${combinedText}</p>
            </div>
        `;
        transcriptContainer.appendChild(bubbleContainer);
    }
    // Automatically scroll to the latest message
    transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
}

/**
 * Updates the UI visuals (button state, icons) to reflect the recording state.
 * @param {boolean} recording - True if recording is active, false otherwise.
 */
function updateUIVisuals(recording) {
    isRecording = recording;
    recordButton.classList.toggle('recording', recording);
    micIcon.classList.toggle('hidden', recording);
    stopIcon.classList.toggle('hidden', !recording);
}

/**
 * Updates the status message shown to the user.
 * @param {string} text - The message to display.
 * @param {boolean} [isError=false] - If true, styles the message as an error.
 */
function updateStatus(text, isError = false) {
    statusEl.textContent = text;
    statusEl.classList.toggle('error', isError);
}
