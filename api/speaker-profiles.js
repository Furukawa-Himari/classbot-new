// /api/speaker-profiles.js

// This is a Vercel Serverless Function that acts as a secure backend.
// It handles creating speaker profiles and generating voice signatures for speaker recognition.

// We use 'node-fetch' for making HTTP requests to the Azure API.
// In Vercel's Node.js environment, you need to use a library like this.
const fetch = require('node-fetch');

// --- CONFIGURATION ---
// These are loaded from the Environment Variables you set in Vercel.
const SPEECH_KEY = process.env.VITE_SPEECH_KEY;
const SPEECH_REGION = process.env.VITE_SPEECH_REGION;

// The base endpoint for the Speaker Recognition API.
const ENDPOINT = `https://${SPEECH_REGION}.api.cognitive.microsoft.com/sts/v1.0/issuetoken`;
const SPEAKER_RECOGNITION_ENDPOINT = `https://${SPEECH_REGION}.api.cognitive.microsoft.com/speaker/identification/v2.0`;


/**
 * Main handler for the serverless function.
 * Vercel directs all requests to this path to this function.
 * @param {object} req - The incoming request object.
 * @param {object} res - The outgoing response object.
 */
export default async function handler(req, res) {
    // We use the HTTP method to determine the requested action.
    const { method } = req;

    try {
        switch (method) {
            case 'GET':
                // GET request: List all existing speaker profiles.
                await handleGetAllProfiles(req, res);
                break;
            case 'POST':
                // POST request: Create a new speaker profile.
                await handleCreateProfile(req, res);
                break;
            case 'PUT':
                 // PUT request: Enroll a voiceprint for a profile.
                await handleCreateEnrollment(req, res);
                break;
            default:
                res.setHeader('Allow', ['GET', 'POST', 'PUT']);
                res.status(405).end(`Method ${method} Not Allowed`);
        }
    } catch (error) {
        console.error("Error in handler:", error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

/**
 * Creates a new speaker profile in Azure.
 * A profile just contains an ID and a display name.
 */
async function handleCreateProfile(req, res) {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    const response = await fetch(`${SPEAKER_RECOGNITION_ENDPOINT}/profiles`, {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': SPEECH_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 'locale': 'en-us' }) // Profile holds the voiceprint
    });

    if (!response.ok) {
        const errorData = await response.json();
        return res.status(response.status).json({ error: `Failed to create profile: ${errorData.error.message}` });
    }
    
    const profileData = await response.json();
    
    // We're returning the new profile ID and the name it's associated with.
    res.status(201).json({ profileId: profileData.profileId, name: name });
}


/**
 * Gets all existing speaker profiles from Azure.
 */
async function handleGetAllProfiles(req, res) {
    const response = await fetch(`${SPEAKER_RECOGNITION_ENDPOINT}/profiles`, {
        method: 'GET',
        headers: { 'Ocp-Apim-Subscription-Key': SPEECH_KEY }
    });

    if (!response.ok) {
        const errorData = await response.json();
        return res.status(response.status).json({ error: `Failed to get profiles: ${errorData.error.message}` });
    }

    const { profiles } = await response.json();
    res.status(200).json(profiles);
}

/**
 * Creates a voice enrollment for an existing profile.
 * This function receives audio data from the client and sends it to Azure.
 */
async function handleCreateEnrollment(req, res) {
    const { profileId } = req.body;
    if (!profileId) {
        return res.status(400).json({ error: 'Profile ID is required' });
    }

    // The client sends the raw audio data in the request body.
    // We just need to pipe this data directly to the Azure endpoint.
    const response = await fetch(`${SPEAKER_RECOGNITION_ENDPOINT}/profiles/${profileId}/enrollments`, {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': SPEECH_KEY,
            'Content-Type': 'application/octet-stream' // The audio data format
        },
        body: req // Pipe the client request body directly
    });
    
    if (!response.ok) {
        const errorData = await response.json();
         return res.status(response.status).json({ error: `Failed to enroll voice: ${errorData.error.message}` });
    }
    
    const enrollmentData = await response.json();
    res.status(200).json(enrollmentData);
}
