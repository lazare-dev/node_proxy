/***********************************************************
 * server.js
 * Node.js Express server for ephemeral Potato Bot logic.
 * - Does not echo user input or internal instructions.
 * - Handles "start" by returning a concise, dry intro message.
 * - Supports a multi-step portrait flow triggered by picture commands.
 * - Uses inclusive gender detection for custom portraits.
 * - Adds lightweight conversation memory to maintain context.
 **********************************************************/
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // if Node < 18

// Import custom modules
const { TODD_PROMPT, DEFAULT_GENERATION_PARAMS } = require("./toddPrompt");
const { cleanFalconReply, addRandomFact } = require("./responseHandler");
const { processPortraitFlow, isPictureCommand, resetPortraitState } = require("./portraitFlow");
const potatoFacts = require("./potatoFacts");
const { getConversationHistory, updateConversationHistory, resetConversationHistory } = require("./conversationContext");

const app = express();

// Serve static images from "public" folder if needed
app.use(express.static("public"));

// Enable CORS
app.use(cors());
app.use(express.json());

// Hugging Face token & Falcon model
const HF_TOKEN = process.env.HF_TOKEN || "";
const HF_API_URL = "https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct";

/**
 * callFalcon:
 * Builds a prompt that includes recent conversation history, the current user input,
 * and instructs Falcon to reply as Todd.
 */
async function callFalcon(userText) {
  // Get conversation history but format it better
  const recentHistory = getConversationHistory(4) // Reduced from 6 to focus on more recent context
    .map(entry => `${entry.role}: ${entry.text}`)
    .join("\n");
    
  const prompt = `${TODD_PROMPT}\nConversation History:\n${recentHistory}\n\nUser: ${userText}\n\nTodd:`;
  
  try {
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: DEFAULT_GENERATION_PARAMS
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Falcon API Error: ${errorText}`);
      // Return a fallback response if API fails
      return `Look, I'm just a potato and my connection to the internet seems to be... well, mashed. Not that I care much either way. Try asking me something else or don't. Spud Fact: Potatoes can actually be used as emergency battery cells due to their acid content, which is probably more useful than I am right now.`;
    }
    
    const data = await response.json();
    let rawReply = data[0]?.generated_text || "No response from Falcon.";
    const cleaned = cleanFalconReply(rawReply, prompt, userText);
    
    // Update conversation history with the new exchange
    updateConversationHistory("User", userText);
    updateConversationHistory("Todd", cleaned);
    
    // Check if response has a Spud Fact
    if (!cleaned.includes("Spud Fact:")) {
      return addRandomFact(cleaned, potatoFacts);
    }
    
    return cleaned;
  } catch (error) {
    console.error("Error calling Falcon API:", error);
    return `I seem to be having a potato moment. My brain's a bit fried right now. Not that I particularly care. Try again later, or don't. Spud Fact: Potatoes contain enough water to sustain life for extended periods, which is more than I can say for this conversation.`;
  }
}

/**
 * ephemeralLogic:
 * Handles initial triggers and special commands.
 */
function ephemeralLogic(userInput) {
  let text = userInput.trim();
  
  // Handle session start
  if (text === "" || text.toLowerCase() === "start") {
    resetConversationHistory();
    resetPortraitState();
    
    const fact = potatoFacts[Math.floor(Math.random() * potatoFacts.length)];
    return `I'm Todd. A potato. Yes, a talking potato. Don't act like you've never seen one before. If you want to see yourself as a potato (though I can't imagine why), just say "make me a potato."\n\nSpud Fact: ${fact}\n\nHave you taken the potato pledge? (yes/no) Not that I really care either way.`;
  }
  
  // Check portrait flow first - this needs top priority
  const portraitResponse = processPortraitFlow(userInput);
  if (portraitResponse !== null) {
    return portraitResponse;
  }
  
  // Handle basic yes/no responses to the pledge question
  if (/^(yes|yeah|yep|yup|sure|ok|okay)/i.test(text)) {
    return "Look at you, all eager to pledge allegiance to a vegetable. I'm flattered, I guess. Now, what would you like to talk about? Keep it interesting—I've been underground for months.";
  }
  
  if (/^(no|nope|nah|not really|haven'?t|i haven'?t)/i.test(text)) {
    return `Well, that's disappointing. Here I am, bearing my soul to you, and you can't even take a simple potato pledge. Fine, take it here if you ever change your mind: <a href="https://link.apisystem.tech/widget/form/JJEtMR9sbBEcE6I7c2Sm" target="_blank">Click here</a>. Or don't. I'm just a potato, not your life coach.`;
  }
  
  // No special handling needed, return null to use Falcon
  return null;
}

// POST /api/chat route.
app.post("/api/chat", async (req, res) => {
  try {
    let userInput = (req.body.userMessage || "").trim();
    if (userInput.toLowerCase() === "start") {
      userInput = "";
    }
    
    // Try to handle with ephemeral logic first
    const ephemeralReply = ephemeralLogic(userInput);
    
    if (ephemeralReply !== null && ephemeralReply !== "") {
      // Update conversation for ephemeral replies too
      updateConversationHistory("User", userInput);
      updateConversationHistory("Todd", ephemeralReply);
      return res.json({ response: ephemeralReply });
    }
    
    // If no ephemeral reply, use Falcon
    const falconReply = await callFalcon(userInput);
    res.json({ response: falconReply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      error: err.message,
      response: "Ugh, my potato brain is malfunctioning. Not that I care much either way. Give me a moment to get my roots sorted, or don't. Spud Fact: Potatoes were the first vegetable grown in space aboard the Space Shuttle Columbia in 1995. They probably had better things to do than talk to humans."
    });
  }
});

// Start the server.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Potato Bot backend running on port", PORT);
});