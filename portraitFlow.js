/**
 * portraitFlow.js
 * Handles the multi-step portrait creation flow
 */

// Global ephemeral state for multi-step portrait flow
let ephemeralState = {
    state: "idle",
    questionIndex: 0,
    answers: {}
  };
  
  // Portrait questionnaire
  const potatoQuestions = [
    { key: "feminineOrMasculine", text: "Would you describe yourself as more feminine or masculine? Not that I care much either way." },
    { key: "hairColor", text: "What's your hair color? Let me guess - not as earthy as mine." },
    { key: "eyeColor", text: "What's your eye color? Mine are just sprouts, but I make do." },
    { key: "height", text: "What's your approximate height? I'm about potato-sized, in case you were wondering." }
  ];
  
  /**
   * isPictureCommand:
   * Returns true if the input matches a picture command.
   */
  function isPictureCommand(input) {
    return /(?:make me a potato|draw me(?: as a potato)?|potato me|potatize me)/i.test(input);
  }
  
  /**
   * processPortraitFlow:
   * Main handler for the potato portrait creation flow
   */
  function processPortraitFlow(userInput) {
    console.log(`[PORTRAIT] Current state: ${ephemeralState.state}, Question: ${ephemeralState.questionIndex}`);
    const text = userInput.toLowerCase().trim();
    
    // Start the portrait flow if requested
    if (ephemeralState.state === "idle" && isPictureCommand(text)) {
      console.log("[PORTRAIT] Starting portrait flow");
      ephemeralState.state = "askingPotato";
      ephemeralState.questionIndex = 0;
      ephemeralState.answers = {};
      return potatoQuestions[0].text;
    }
    
    // Continue the portrait flow if we're in it
    if (ephemeralState.state === "askingPotato") {
      console.log(`[PORTRAIT] Processing question ${ephemeralState.questionIndex}`);
      
      // Safety check for valid question index
      if (ephemeralState.questionIndex < 0 || ephemeralState.questionIndex >= potatoQuestions.length) {
        console.log("[PORTRAIT] Invalid question index, resetting");
        ephemeralState.state = "idle";
        return null;
      }
      
      // Save current answer
      const currentQ = potatoQuestions[ephemeralState.questionIndex];
      ephemeralState.answers[currentQ.key] = userInput;
      console.log(`[PORTRAIT] Saved answer for ${currentQ.key}: ${userInput}`);
      
      // Move to next question
      ephemeralState.questionIndex++;
      
      if (ephemeralState.questionIndex < potatoQuestions.length) {
        // Ask next question
        const nextQuestion = potatoQuestions[ephemeralState.questionIndex].text;
        console.log(`[PORTRAIT] Asking next question: ${nextQuestion}`);
        return nextQuestion;
      } else {
        // Finished all questions, generate portrait
        console.log("[PORTRAIT] All questions answered, generating portrait");
        const portraitResponse = finalizePotatoPortrait();
        ephemeralState.state = "idle";
        return portraitResponse;
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
    console.log("[PORTRAIT] Creating portrait with:", ephemeralState.answers);
    
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
   * resetPortraitState:
   * Resets the portrait flow state
   */
  function resetPortraitState() {
    ephemeralState.state = "idle";
    ephemeralState.questionIndex = 0;
    ephemeralState.answers = {};
  }
  
  module.exports = {
    processPortraitFlow,
    isPictureCommand,
    resetPortraitState
  };