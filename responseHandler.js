/**
 * responseHandler.js
 * Functions for cleaning up and processing API responses
 */

/**
 * cleanFalconReply:
 * Improved cleaning that preserves Todd's actual answer but removes instructions.
 */
function cleanFalconReply(rawText, prompt, userInput) {
    // First, extract the generated text that comes after the prompt
    let toddResponse = "";
    if (rawText.includes(prompt)) {
      toddResponse = rawText.substring(rawText.indexOf(prompt) + prompt.length);
    } else {
      const toddStart = rawText.lastIndexOf("Todd:");
      if (toddStart !== -1) {
        toddResponse = rawText.substring(toddStart + 5);
      } else {
        toddResponse = rawText;
      }
    }
    
    // Remove any markers from the response
    const marker = "BEGIN RESPONSE:";
    const markerIndex = toddResponse.indexOf(marker);
    if (markerIndex !== -1) {
      toddResponse = toddResponse.substring(markerIndex + marker.length);
    }
    
    // Check for story-like patterns (third person narrative)
    if (toddResponse.includes('"Is this really happening?"') || 
        toddResponse.includes('Todd is not a fan') ||
        toddResponse.includes('he decides') ||
        /Todd (was|is|has|had|would|will)/.test(toddResponse)) {
      return `Well, I'm not much for long stories. I'm just a potato trying to get through the day without being turned into french fries. Spud Fact: The average potato contains about 110 calories, which is more energy than I'm willing to expend on most conversations.`;
    }
    
    // Remove any traces of instructions or formatting
    toddResponse = toddResponse
      .replace(/You are Todd.*?(?=\w)/gs, "")
      .replace(/PERSONALITY:.*?(?=\w)/gs, "")
      .replace(/RESPONSE STYLE:.*?(?=\w)/gs, "")
      .replace(/EXAMPLES:.*?(?=\w)/gs, "")
      .replace(/IMPORTANT:.*?(?=\w)/gs, "")
      .replace(/User input:.*?(?=\w)/gs, "")
      .replace(/User:.*?(?=\w)/gs, "")
      .replace(/Todd:/g, "")
      .replace(/Response:/g, "")
      .replace(/- You -/gi, "")
      .replace(/BEGIN RESPONSE:/gi, "")
      .replace(/\bUser\b/g, "") // Remove lone "User" strings
      .replace(/^\s*-\s*/gm, "") // Remove bullet points
      .replace(/^\s*\d+\.\s*/gm, "") // Remove numbered list formatting
      .replace(/As a potato/gi, "")
      .replace(/I am Todd/gi, "");
    
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
  function addRandomFact(response, potatoFacts) {
    const fact = potatoFacts[Math.floor(Math.random() * potatoFacts.length)];
    
    // Check if response already ends with punctuation
    const endsWithPunctuation = /[.!?]$/.test(response.trim());
    
    if (endsWithPunctuation) {
      return `${response.trim()} Spud Fact: ${fact}`;
    } else {
      return `${response.trim()}. Spud Fact: ${fact}`;
    }
  }
  
  module.exports = {
    cleanFalconReply,
    addRandomFact
  };