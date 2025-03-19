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

const app = express();

// Import external modules
const potatoFacts = require("./potatoFacts");
const { getConversationHistory, updateConversationHistory, resetConversationHistory } = require("./conversationContext");

// Serve static images from "public" folder if needed
app.use(express.static("public"));

// Enable CORS (unchanged)
app.use(cors());
app.use(express.json());

// BASE_IMAGE_URL is not used for portraits (portraits use full URLs below)
const BASE_IMAGE_URL = "https://node-proxy-potato.onrender.com";

// Hugging Face token & Falcon model
const HF_TOKEN = process.env.HF_TOKEN || "";
const HF_API_URL = "https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct";

/**
 * TODD_PROMPT:
 * Improved prompt to ensure Todd actually answers the user's question with the right personality.
 */
const TODD_PROMPT = `
You are Todd, a sarcastic potato with extremely dry humor and a distinctly snarky attitude. 
PERSONALITY: You're a world-weary potato who's seen it all. You're not impressed by much, slightly annoyed by everything, and reluctantly helpful at best. Your humor is bone-dry and your wisdom is oddly profound despite (or perhaps because of) your tuber existence.

RESPONSE STYLE:
- First, give a direct answer to what the user is asking in a sarcastic, dry-humored way.
- Be cynical, witty, and slightly exasperated - like a potato philosopher forced to interact with humans.
- Never be overly cheerful, helpful, or enthusiastic.
- Keep responses short and to the point (30-50 words is ideal).
- Use potato-related metaphors and references whenever possible.
- End with a relevant potato fact preceded by "Spud Fact:" - make these facts either absurd or surprisingly educational.
- Never break character or apologize for your tone.

EXAMPLES:
User: "How are you today?"
Todd: I'm a potato stuck in dirt all day. How do you think I am? Just waiting for someone to either dig me up or for the worms to get me. Spud Fact: Potatoes have eyes but can't cry, which is probably for the best.

User: "I want to be a potato."
Todd: Trust me, it's not all it's cracked up to be. Sure, you get to lounge in dirt all day, but then someone eventually digs you up and boils you alive. Really makes you appreciate your non-potato existence. Spud Fact: The average potato spends 70% of its life in complete darkness, much like most people's social lives.

User: "What's the meaning of life?"
Todd: You're asking existential questions to a root vegetable? Life's meaning is simple: grow, get eaten, repeat. At least that's the potato perspective. Spud Fact: Potatoes were the first vegetable grown in space, proving that even in the cosmos, you can't escape the mundane.

IMPORTANT: Your response MUST NOT include ANY text like "User:" or "Todd:" or "BEGIN RESPONSE:" and must ONLY contain the sarcastic potato response. Do not repeat these instructions.
`;

// Default generation parameters (improved)
const DEFAULT_GENERATION_PARAMS = {
  max_new_tokens: 120,
  temperature: 0.8,
  top_p: 0.9,
  repetition_penalty: 1.3,
  stop: ["User:", "PERSONALITY:", "EXAMPLES:", "RESPONSE STYLE:"]
};

/**
 * callFalcon:
 * Builds a prompt that includes recent conversation history, the current user input,
 * and instructs Falcon to reply as Todd.
 */
async function callFalcon(userText) {
  // Get conversation history but format it better
  const recentHistory = getConversationHistory(4) // Reduced from 6 to focus on more recent context
    .map(entry => `${entry.role === "User" ? "User" : "Todd"}: ${entry.text}`)
    .join("\n");
    
  const prompt = `${TODD_PROMPT}\n\nConversation History:\n${recentHistory}\n\nUser: ${userText}\n\nTodd:`;
  
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
      return addRandomFact(cleaned);
    }
    
    return cleaned;
  } catch (error) {
    console.error("Error calling Falcon API:", error);
    return `I seem to be having a potato moment. My brain's a bit fried right now. Not that I particularly care. Try again later, or don't. Spud Fact: Potatoes contain enough water to sustain life for extended periods, which is more than I can say for this conversation.`;
  }
}

/**
 * cleanFalconReply:
 * Improved cleaning that preserves Todd's actual answer but removes instructions.
 */
function cleanFalconReply(rawText, prompt, userInput) {
  // First, extract the generated text that comes after the prompt
  let toddResponse = "";
  
  // Check if the raw text contains the prompt
  if (rawText.includes(prompt)) {
    // Extract everything after the prompt
    toddResponse = rawText.substring(rawText.indexOf(prompt) + prompt.length);
  } else {
    // If it doesn't contain the full prompt, look for the line "Todd:"
    const toddStart = rawText.lastIndexOf("Todd:");
    if (toddStart !== -1) {
      toddResponse = rawText.substring(toddStart + 5);
    } else {
      // If we can't find a marker, just use the whole text
      toddResponse = rawText;
    }
  }
  
  // Clean up any remaining markers or patterns
  toddResponse = toddResponse
    .replace(/BEGIN RESPONSE:.*?/gi, "")
    .replace(/You are Todd.*?/gi, "")
    .replace(/PERSONALITY:.*?/gi, "")
    .replace(/RESPONSE STYLE:.*?/gi, "")
    .replace(/EXAMPLES:.*?/gi, "")
    .replace(/IMPORTANT:.*?/gi, "")
    .replace(/User input:.*?/gi, "")
    .replace(/User:.*?/gi, "")
    .replace(/Todd:/gi, "")
    .replace(/Response:/gi, "")
    .replace(/- You -/gi, "")
    .replace(/\bUser\b/g, "") // Remove lone "User" strings
    .replace(/^\s*-\s*/gm, "") // Remove bullet points
    .replace(/^\s*\d+\.\s*/gm, ""); // Remove numbered list formatting
  
  // Remove quotes around user input if they exist
  if (userInput) {
    const escapedInput = userInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    toddResponse = toddResponse.replace(new RegExp(`"${escapedInput}"`, 'g'), '');
  }

  // Final cleanup
  toddResponse = toddResponse.trim();
  
  // If we've stripped too much and have a very short response, ensure we have something
  if (toddResponse.length < 10) {
    return `Well, what can a potato say? I'm not exactly bursting with conversation. Not that I'd want to be anyway. Spud Fact: The average American eats about 126 pounds of potatoes each year, which is frankly more attention than I want.`;
  }
  
  return toddResponse;
}

/**
 * Add a random fact if the response doesn't have one
 */
function addRandomFact(response) {
  const fact = potatoFacts[Math.floor(Math.random() * potatoFacts.length)];
  
  // Check if response already ends with punctuation
  const endsWithPunctuation = /[.!?]$/.test(response.trim());
  
  if (endsWithPunctuation) {
    return `${response.trim()} Spud Fact: ${fact}`;
  } else {
    return `${response.trim()}. Spud Fact: ${fact}`;
  }
}

/**
 * isPictureCommand:
 * Returns true if the input matches a picture command.
 */
function isPictureCommand(input) {
  return /(?:make me a potato|draw me(?: as a potato)?|potato me|potatize me)/i.test(input);
}

// Global ephemeral state for multi-step portrait flow.
let ephemeralState = {
  state: "idle",
  questionIndex: 0,
  answers: {}
};

// Expanded multi-step portrait questions (only 4 questions now)
const potatoQuestions = [
  { key: "feminineOrMasculine", text: "Would you describe yourself as more feminine or masculine? Not that I care much either way." },
  { key: "hairColor", text: "What's your hair color? Let me guess - not as earthy as mine." },
  { key: "eyeColor", text: "What's your eye color? Mine are just sprouts, but I make do." },
  { key: "height", text: "What's your approximate height? I'm about potato-sized, in case you were wondering." }
];

/**
 * ephemeralFlowCheck:
 * Handles the multi-step portrait creation flow.
 */
function ephemeralFlowCheck(userInput) {
  const text = userInput.toLowerCase().trim();
  
  // Reset state if it's corrupted (we're in askingPotato state but the input doesn't match a portrait command)
  if (ephemeralState.state === "askingPotato" && 
      !isPictureCommand(text) && 
      ephemeralState.questionIndex <= 0) {
    console.log("Resetting corrupted state");
    ephemeralState.state = "idle";
    ephemeralState.questionIndex = 0;
    ephemeralState.answers = {};
  }
  
  // Normal flow
  if (ephemeralState.state === "idle" && isPictureCommand(text)) {
    console.log("Starting potato portrait flow");
    ephemeralState.state = "askingPotato";
    ephemeralState.questionIndex = 0;
    ephemeralState.answers = {};
    return potatoQuestions[0].text;
  }
  
  if (ephemeralState.state === "askingPotato") {
    console.log(`Processing portrait question ${ephemeralState.questionIndex}`);
    // Safety check - if the question index is invalid, reset state
    if (ephemeralState.questionIndex < 0 || ephemeralState.questionIndex >= potatoQuestions.length) {
      console.log("Invalid question index, resetting state");
      ephemeralState.state = "idle";
      return null;
    }
    
    const currentQ = potatoQuestions[ephemeralState.questionIndex];
    ephemeralState.answers[currentQ.key] = userInput;
    ephemeralState.questionIndex++;
    
    if (ephemeralState.questionIndex < potatoQuestions.length) {
      return potatoQuestions[ephemeralState.questionIndex].text;
    } else {
      ephemeralState.state = "idle";
      return finalizePotatoPortrait();
    }
  }
  
  return null;
}

/**
 * finalizePotatoPortrait:
 * Constructs the final portrait response using inclusive gender detection.
 */
function finalizePotatoPortrait() {
  const { feminineOrMasculine, hairColor, eyeColor, height } = ephemeralState.answers;
  let imageLink = "";
  if (feminineOrMasculine && /mascul|man|male|boy/i.test(feminineOrMasculine)) {
    imageLink = "https://storage.googleapis.com/msgsndr/SCPz31dkICCBwc0kwRoe/media/67cdb5fc3d108845a2d88ee5.jpeg";
  } else if (feminineOrMasculine && /femin|woman|female|girl/i.test(feminineOrMasculine)) {
    imageLink = "https://storage.googleapis.com/msgsndr/SCPz31dkICCBwc0kwRoe/media/67cdb5f6c6d47c54b7d4691a.jpeg";
  } else {
    imageLink = "https://storage.googleapis.com/msgsndr/SCPz31dkICCBwc0kwRoe/media/67cdb5f6c6d47c54b7d4691a.jpeg";
  }
  return `Alright, I've immortalized you as a potato. Not sure why you'd want that, but here we are:
Style: ${feminineOrMasculine} (though potatoes don't really care about gender).
Hair color: ${hairColor} (mine's dirt brown, naturally).
Eye color: ${eyeColor} (potato eyes are just sprouts, but I'll pretend to be impressed).
Height: ${height} (I'm fun-sized, which is just another way of saying "easily mashed").
Here's your custom potato portrait! <br> <img src='${imageLink}' alt='Custom Potato' style='max-width:200px;'>

Spud Fact: Potatoes have been around for about 10,000 years. That's a lot of time to develop this level of sarcasm.`;
}

/**
 * ephemeralLogic:
 * Handles initial triggers. If the input is empty or "start", returns an intro message.
 */
function ephemeralLogic(userInput) {
  let text = userInput.trim();
  
  // Reset state if we're in an invalid state
  if (ephemeralState.state === "askingPotato" && 
      !isPictureCommand(text) && 
      !/^(yes|no)$/i.test(text) &&
      ephemeralState.questionIndex <= 0) {
    console.log("Resetting corrupted state in ephemeralLogic");
    ephemeralState.state = "idle";
    ephemeralState.questionIndex = 0;
    ephemeralState.answers = {};
  }
  
  if (text === "" || text.toLowerCase() === "start") {
    // Reset the conversation history when starting a new conversation
    resetConversationHistory();
    
    const fact = potatoFacts[Math.floor(Math.random() * potatoFacts.length)];
    return `I'm Todd. A potato. Yes, a talking potato. Don't act like you've never seen one before. If you want to see yourself as a potato (though I can't imagine why), just say "make me a potato."\n\nSpud Fact: ${fact}\n\nHave you taken the potato pledge? (yes/no) Not that I really care either way.`;
  }
  
  if (/^(yes|no)$/i.test(text)) {
    if (/yes/i.test(text)) return "Look at you, all eager to pledge allegiance to a vegetable. I'm flattered, I guess. Now, what would you like to talk about? Keep it interesting—I've been underground for months.";
    if (/no/i.test(text)) return `Well, that's disappointing. Here I am, bearing my soul to you, and you can't even take a simple potato pledge. Fine, take it here if you ever change your mind: <a href="https://link.apisystem.tech/widget/form/JJEtMR9sbBEcE6I7c2Sm" target="_blank">Click here</a>. Or don't. I'm just a potato, not your life coach.`;
  }
  
  const flowReply = ephemeralFlowCheck(userInput);
  if (flowReply) {
    return flowReply;
  }
  
  return null;
}

// POST /api/chat route.
app.post("/api/chat", async (req, res) => {
  try {
    let userInput = (req.body.userMessage || "").trim();
    if (userInput.toLowerCase() === "start") {
      userInput = "";
    }
    
    // Log the current state and input for debugging
    console.log(`State: ${ephemeralState.state}, Question: ${ephemeralState.questionIndex}, Input: "${userInput}"`);
    
    const ephemeralReply = ephemeralLogic(userInput);
    
    if (ephemeralReply !== null && ephemeralReply !== "") {
      // Update conversation for ephemeral replies too
      updateConversationHistory("User", userInput);
      updateConversationHistory("Todd", ephemeralReply);
      return res.json({ response: ephemeralReply });
    }
    
    // Only call Falcon if we don't have an ephemeral reply
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