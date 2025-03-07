/***********************************************************
 * server.js
 * Node.js Express server that calls Falcon-7B-Instruct (or
 * any Hugging Face model) using an environment variable
 * for the HF_TOKEN.
 **********************************************************/
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // if Node < 18

const app = express();
app.use(cors());
app.use(express.json());

// Read your Hugging Face token from environment variable
const HF_TOKEN = process.env.HF_TOKEN; 
// Falcon Instruct model endpoint (adjust if needed)
const HF_API_URL = "https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct";

// POST /api/chat
app.post("/api/chat", async (req, res) => {
  try {
    // 1. Grab userMessage and generationParams from the request body
    const userMessage = req.body.userMessage || "Hello from user";
    const generationParams = req.body.generationParams || {
      max_new_tokens: 60,
      temperature: 0.6,
      top_p: 0.9,
      repetition_penalty: 1.3
      // 'stop': ["You are Todd,"] // If you want a default stop sequence
    };

    // 2. Make request to Hugging Face Inference API
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: userMessage,
        parameters: generationParams
      })
    });

    // 3. Check for errors
    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({ error: text });
    }

    // 4. Parse the response
    const data = await response.json();
    // Falcon typically returns an array with an object containing "generated_text"
    const reply = data[0]?.generated_text || "No response from Falcon";

    // 5. Send JSON back to the front-end
    res.json({ response: reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Node proxy is running on port " + PORT);
});
