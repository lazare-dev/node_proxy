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
// Replace with the Falcon Instruct model endpoint (or any other)
const HF_API_URL = "https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct";

// POST /api/chat
app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = req.body.userMessage || "Hello from user";

    // Make request to Hugging Face Inference API
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        // userMessage is the prompt
        inputs: userMessage,
        parameters: {
          max_new_tokens: 100,
          temperature: 0.7,
          // Add or adjust any generation parameters you want
        }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({ error: text });
    }

    const data = await response.json();
    // Falcon typically returns an array with an object containing "generated_text"
    const reply = data[0]?.generated_text || "No response from Falcon";

    // Send JSON back to the front-end
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
