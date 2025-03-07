const express = require("express");
const fetch = require("node-fetch"); // If using Node < 18
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Your Hugging Face (or OpenAI) API key
const HF_TOKEN = process.env.HF_TOKEN;
const HF_API_URL = "https://api-inference.huggingface.co/models/gpt2";

// Simple POST endpoint at /api/chat
app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = req.body.userMessage || "Hello from user";

    // Call Hugging Face Inference API
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: userMessage,
        parameters: {
          max_new_tokens: 50,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({ error: text });
    }

    const data = await response.json();
    const reply = data[0]?.generated_text || "No response";
    res.json({ response: reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server on the port Render gives us (process.env.PORT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
