import { GoogleGenerativeAI } from "@google/generative-ai";
import Folder from "../models/Folder.js";
import Notification from "../models/Notification.js";

// Instantiating Google Generative AI client using the configured API key
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.trim() && apiKey !== "your_gemini_api_key_here") {
    try {
      return new GoogleGenerativeAI(apiKey);
    } catch (e) {
      console.error("Error creating Google GenAI client", e);
    }
  }
  return null;
};

// Tracking active analysis timeouts in memory to support note-saving debouncing
const activeAnalysisTimeouts = new Map();

// Helper function to detect explicit time references in note contents
const hasTimeIndicator = (text) => {
  const lowercase = text.toLowerCase();
  const timeRegexes = [
    // Matches relative times: "in 2 mins", "after 5 hrs", "in 10s", "in 2m", "after 1h"
    /\b(in|after)\s+\d+\s*(m|min|minute|h|hour|hr|s|sec|second|d|day)s?\b/i,
    // Matches numbers with time units: "2m", "2 mins", "5hr", "10s"
    /\b\d+\s*(m|min|minute|h|hour|hr|s|sec|second|d|day)s?\b/i,
    // Matches "at 9", "at 9:30", "around 10 PM"
    /\b(at|around)\s+\d{1,2}([:.]\d{2})?\s*(am|pm)?\b/i,
    // Matches exact time digits: "10:30", "11.15 pm"
    /\b\d{1,2}[:.]\d{2}\s*(am|pm)?\b/i,
    // Matches "9 am", "10 PM"
    /\b\d{1,2}\s*(am|pm)\b/i,
    // Matches period descriptors: "tomorrow", "tonight", "today", "morning", "evening", "noon", "afternoon", "night"
    /\b(tomorrow|tonight|today|morning|evening|noon|afternoon|night)\b/i
  ];
  return timeRegexes.some(regex => regex.test(lowercase));
};

// 1. Core scheduling service called on note create or update with debounce support
export const analyzeNoteAndSchedule = async (note, clientTime) => {
  try {
    const userId = note.user;
    const noteId = note._id;

    // Purging pre-existing pending notifications linked to this note
    await Notification.deleteMany({ note: noteId, status: "pending" });

    const contentText = note.content || "";
    const titleText = note.title || "";
    const combinedText = `${titleText}\n${contentText}`.replace(/<[^>]*>/g, " ").trim();

    if (!combinedText) return;

    // Performing fast local checks to detect emotional diary entries
    const lowercaseText = combinedText.toLowerCase();
    const isEmotional = lowercaseText.includes("sad") || 
                        lowercaseText.includes("depress") || 
                        lowercaseText.includes("lonely") || 
                        lowercaseText.includes("cried") || 
                        lowercaseText.includes("crying") ||
                        lowercaseText.includes("love") || 
                        lowercaseText.includes("tired") || 
                        lowercaseText.includes("sick") || 
                        lowercaseText.includes("exhausted") || 
                        lowercaseText.includes("diary") || 
                        lowercaseText.includes("feeling") ||
                        lowercaseText.includes("exam") || 
                        lowercaseText.includes("marks") || 
                        lowercaseText.includes("grade") || 
                        lowercaseText.includes("study") || 
                        lowercaseText.includes("test") || 
                        lowercaseText.includes("assignment") ||
                        lowercaseText.includes("happy") || 
                        lowercaseText.includes("excited") || 
                        lowercaseText.includes("won") || 
                        lowercaseText.includes("success") || 
                        lowercaseText.includes("celebrate") || 
                        lowercaseText.includes("passed");

    const timeGiven = hasTimeIndicator(combinedText);
    const debounceDelay = (isEmotional && !timeGiven) ? 5 * 60 * 1000 : 10000; // 5 mins for emotional diary entries without time, 10s for reminders/time-based notes

    // Clearing any active debounce timeout for this note
    const noteKey = noteId.toString();
    if (activeAnalysisTimeouts.has(noteKey)) {
      clearTimeout(activeAnalysisTimeouts.get(noteKey));
      activeAnalysisTimeouts.delete(noteKey);
    }

    console.log(`[AI Scheduler] Debouncing analysis for note ${noteKey} in ${debounceDelay / 1000}s (isEmotional: ${isEmotional}, timeGiven: ${timeGiven}).`);

    const timeoutId = setTimeout(async () => {
      activeAnalysisTimeouts.delete(noteKey);
      await performAnalysisAndSchedule(note, combinedText, isEmotional, clientTime);
    }, debounceDelay);

    activeAnalysisTimeouts.set(noteKey, timeoutId);

  } catch (error) {
    console.error("Error in analyzeNoteAndSchedule service:", error.message);
  }
};

// Cancelling active analysis timeout when a note is deleted
export const cancelAnalysis = (noteId) => {
  const noteKey = noteId.toString();
  if (activeAnalysisTimeouts.has(noteKey)) {
    clearTimeout(activeAnalysisTimeouts.get(noteKey));
    activeAnalysisTimeouts.delete(noteKey);
    console.log(`[AI Scheduler] Cancelled debounced analysis for deleted note ${noteKey}.`);
  }
};

const parseScheduledDate = (scheduledAtLocal, offsetStr) => {
  if (!scheduledAtLocal) return null;
  
  let cleanLocal = scheduledAtLocal.trim();
  
  // Stripping trailing Z or timezone offset values safely
  cleanLocal = cleanLocal.replace(/Z$/, "").replace(/(?:[+-]\d{2}:?\d{2})$/, "").trim();
  
  // Prepending today's date when receiving a time-only string
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(cleanLocal)) {
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    cleanLocal = `${todayStr}T${cleanLocal}`;
  } else if (/^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}(:\d{2})?$/.test(cleanLocal)) {
    // Replacing space separator with T to construct a valid ISO date string
    cleanLocal = cleanLocal.replace(" ", "T");
  }
  
  const parsed = new Date(`${cleanLocal}${offsetStr}`);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return null;
};

const extractBackupDelay = (text) => {
  const lowercase = text.toLowerCase();
  // Scanning contents for relative minutes (supporting "m", "min", "mins", "minute", "minutes")
  const minMatch = lowercase.match(/\b(?:in|after)?\s*(\d+)\s*(?:m|min|minute)s?\b/i);
  if (minMatch) {
    return parseInt(minMatch[1], 10) * 60 * 1000;
  }
  // Scanning contents for relative hours (supporting "h", "hr", "hrs", "hour", "hours")
  const hourMatch = lowercase.match(/\b(?:in|after)?\s*(\d+)\s*(?:h|hour|hr)s?\b/i);
  if (hourMatch) {
    return parseInt(hourMatch[1], 10) * 60 * 60 * 1000;
  }
  // Scanning contents for relative seconds (supporting "s", "sec", "secs", "second", "seconds")
  const secMatch = lowercase.match(/\b(?:in|after)?\s*(\d+)\s*(?:s|sec|second)s?\b/i);
  if (secMatch) {
    return parseInt(secMatch[1], 10) * 1000;
  }
  return null;
};

// Perform actual heavy lifting (Gemini analysis & DB scheduling) after debounce delay
const performAnalysisAndSchedule = async (note, combinedText, isEmotional, clientTime) => {
  try {
    const userId = note.user;
    const noteId = note._id;

    const apiKey = process.env.GEMINI_API_KEY;
    const isGeminiAvailable = apiKey && apiKey.trim() && apiKey !== "your_gemini_api_key_here";

    let result = null;

    if (isGeminiAvailable) {
      // selectedModelName: gemini-2.5-pro for high emotion checks, gemini-2.5-flash for simple reminders
      const selectedModelName = isEmotional ? "gemini-2.5-flash-lite" : "gemini-2.5-flash-lite";
      console.log(`Using live Gemini API (${selectedModelName}) to analyze note...`);

      try {
        const ai = getGeminiClient();
        let model = ai.getGenerativeModel({ 
          model: selectedModelName,
          generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
          You are a cognitive, empathetic personal assistant.
          Analyze the user's note below. Determine if it is "notification-worthy" (e.g. contains an explicit schedule, task, checklist, deadline, or shows high emotional distress/happiness like a diary entry that warrants a check-in from a therapist/partner/friend/teacher).
          CRITICAL: Do NOT use any emojis, emoticons, or decorative symbols in the message. Keep the writing clean, sophisticated, and highly professional.

          Note Content:
          "${combinedText}"

          Current Local Time Reference: ${clientTime || new Date().toString()}

          Decide on these personas based on tone:
          - 'Therapist' (for sadness, distress, anxiety)
          - 'LifePartner' (for personal check-ins, warmth, encouragement, general care)
          - 'Secretary' (for structured schedules, checklists, tasks, work reminders)
          - 'Friend' (for general chatting, jokes, celebrating good news)
          - 'Teacher' (for studying, goals, advice, exam preparation)

          Return ONLY a raw JSON block matching this structure (no markdown blocks, no enclosing quotes, no extra text):
          {
            "isWorth": true or false,
            "message": "The actual reminder alert text that the user will read when the notification fires (e.g., 'This is the notification you requested.' or 'Your meeting is starting now.'). CRITICAL: The message must be the final alert content itself. Do NOT write a scheduling confirmation, confirmation receipt, or acknowledgement of the request (e.g., do NOT write 'I will send a notification...', 'Sure, I will remind you...', 'Okay, scheduling your...', or 'You asked me to...'). The message must act directly as the final alert when delivered.",
            "scheduledAtLocal": "ISO date-time string in user's LOCAL timezone (format YYYY-MM-DDTHH:mm:ss) when this should trigger. You MUST calculate this relative to the 'Current Local Time Reference' clock:\n            - Note: Do NOT convert this to UTC. Keep it strictly in the user's local timezone offset.\n            - You MUST parse relative duration offsets like 'in X minutes', 'in Y hours', 'Z mins from now' by adding that duration directly to the 'Current Local Time Reference' clock (e.g. if current is 02:23:00 and note says 'in 2 mins', the scheduledAtLocal MUST be 02:25:00).\n            - Detect and parse explicit times (e.g. 'at 4pm', '3:30 AM', '11:00'). Be extremely careful to distinguish AM vs PM.\n            - If no explicit minutes/hours are given, but general periods are mentioned, assume these standard local times for the scheduled day: morning -> 09:00:00, noon -> 12:00:00, afternoon -> 15:00:00, evening -> 18:00:00, night -> 21:00:00.\n            - If relative days are mentioned: 'today' -> schedule today, 'tomorrow' -> schedule tomorrow.\n            - If it's a general emotional diary entry check-in (distress, sadness, celebration) and no specific time is specified: schedule it for exactly 5 minutes in the future relative to the Current Local Time.",
            "persona": "Therapist" or "LifePartner" or "Secretary" or "Friend" or "Teacher",
            "quickReplies": ["Reply option 1", "Reply option 2"]
          }
        `;

        let response;
        try {
          response = await model.generateContent(prompt);
        } catch (apiErr) {
          console.warn(`Model ${selectedModelName} failed, falling back to gemini-2.5-flash-lite:`, apiErr.message);
          model = ai.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
            generationConfig: { responseMimeType: "application/json" }
          });
          response = await model.generateContent(prompt);
        }

        const text = response.response.text().trim();
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        result = JSON.parse(cleanedText);
        console.log("[AI Service] Gemini Raw Output:", text);
        console.log("[AI Service] Parsed Result:", result);
      } catch (err) {
        console.error("Gemini API call failed, falling back to local cognitive parser:", err.message);
        result = runLocalCognitiveParser(combinedText);
      }
    } else {
      console.log("No Gemini API key detected. Running local cognitive parser...");
      result = runLocalCognitiveParser(combinedText);
    }

    // Saving notifications to the database when deemed notification-worthy
    if (result && result.isWorth) {
      // Parsing timezone offset from browser header
      let offsetStr = "+00:00";
      if (clientTime) {
        // Matches GMT+0530, GMT+05:30, GMT-500, GMT-05:00
        const match = clientTime.match(/GMT([+-])(\d{1,2}):?(\d{2})/);
        if (match) {
          const sign = match[1];
          const hours = match[2].padStart(2, "0");
          const mins = match[3];
          offsetStr = `${sign}${hours}:${mins}`; // e.g. "+05:30" or "-04:00"
        }
      } else {
        const offsetMinutes = -new Date().getTimezoneOffset();
        const sign = offsetMinutes >= 0 ? "+" : "-";
        const absMinutes = Math.abs(offsetMinutes);
        const hours = String(Math.floor(absMinutes / 60)).padStart(2, "0");
        const mins = String(absMinutes % 60).padStart(2, "0");
        offsetStr = `${sign}${hours}:${mins}`;
      }

      console.log(`[AI Service] clientTime: ${clientTime}, result.scheduledAtLocal: ${result.scheduledAtLocal}, offsetStr: ${offsetStr}`);

      let scheduledDate = parseScheduledDate(result.scheduledAtLocal, offsetStr);
      if (scheduledDate) {
        console.log(`[AI Service] Parsed scheduledAtLocal as: ${scheduledDate}`);
      } else if (result.scheduledAt) {
        scheduledDate = new Date(result.scheduledAt);
        console.log(`[AI Service] Parsed scheduledAt as: ${scheduledDate}`);
      }
      
      if (!scheduledDate || isNaN(scheduledDate.getTime())) {
        console.log("[AI Service] Gemini failed to return a valid scheduled date. Running backup local time extractor.");
        const delayMs = extractBackupDelay(combinedText);
        if (delayMs !== null) {
          scheduledDate = new Date(Date.now() + delayMs);
          console.log(`[AI Service] Scheduled via backup local delay parser: ${scheduledDate}`);
        } else {
          // Defaulting to two minutes if time is given, otherwise defaulting to five minutes
          const defaultDelay = hasTimeIndicator(combinedText) ? 2 * 60 * 1000 : 5 * 60 * 1000;
          scheduledDate = new Date(Date.now() + defaultDelay);
          console.log(`[AI Service] Scheduled via time-sensitive default: ${scheduledDate}`);
        }
      }

      console.log(`Scheduling AI Notification for ${scheduledDate} (User local offset: ${offsetStr}) using persona: ${result.persona}`);

      const lowercaseMsg = (result.message || "").toLowerCase();
      const lowercaseCombined = combinedText.toLowerCase();

      // Detecting live meeting triggers to set pre-reminders
      const isMeeting = lowercaseMsg.includes("meeting") || lowercaseMsg.includes("join") || lowercaseMsg.includes("call") || lowercaseMsg.includes("interview") || lowercaseMsg.includes("session") || lowercaseMsg.includes("zoom") || lowercaseMsg.includes("meet") ||
                        lowercaseCombined.includes("meeting") || lowercaseCombined.includes("join") || lowercaseCombined.includes("call") || lowercaseCombined.includes("interview") || lowercaseCombined.includes("session") || lowercaseCombined.includes("zoom") || lowercaseCombined.includes("meet");

      if (isMeeting && result.persona === "Secretary") {
        // Scheduling pre-reminder two minutes before meetings start
        const preTime = new Date(scheduledDate.getTime() - 2 * 60 * 1000);
        if (preTime > new Date()) {
          console.log(`Scheduling pre-reminder at ${preTime} (2 mins before meeting).`);
          await Notification.create({
            user: userId,
            note: noteId,
            message: `Heads up: your meeting is scheduled to start in 2 minutes.`,
            persona: result.persona,
            scheduledAt: preTime,
            status: "pending",
            quickReplies: ["Got it", "Snooze"],
          });
        }
      }

      // Scheduling exact main reminder notification
      await Notification.create({
        user: userId,
        note: noteId,
        message: result.message,
        persona: result.persona,
        scheduledAt: scheduledDate,
        status: "pending",
        quickReplies: result.quickReplies || ["Yes", "No"],
      });
    }

  } catch (error) {
    console.error("Error in performAnalysisAndSchedule:", error.message);
  }
};

// Parsing note contents locally when Gemini is unavailable
const runLocalCognitiveParser = (text) => {
  const lowercaseText = text.toLowerCase();
  
  let isWorth = false;
  let message = "";
  let persona = "Secretary";
  let quickReplies = ["Done!", "Remind Later"];
  let delayMs = 30000; // Defaulting to 30s delay for local sandboxes

  // Checking emotional triggers for local fallback scheduling
  if (
    lowercaseText.includes("sad") ||
    lowercaseText.includes("depressed") ||
    lowercaseText.includes("unhappy") ||
    lowercaseText.includes("lonely") ||
    lowercaseText.includes("cried") ||
    lowercaseText.includes("crying")
  ) {
    isWorth = true;
    persona = "Therapist";
    message = "Hey, I noticed you were feeling really sad and down in your diary. Please take a slow breath, drink some water, and remember I'm here for you. How are you holding up right now?";
    quickReplies = ["Feeling better", "Still down", "Need to chat"];
    delayMs = 20000;
  } else if (
    lowercaseText.includes("exam") ||
    lowercaseText.includes("marks") ||
    lowercaseText.includes("grade") ||
    lowercaseText.includes("study") ||
    lowercaseText.includes("test") ||
    lowercaseText.includes("assignment")
  ) {
    isWorth = true;
    persona = "Teacher";
    message = "Hey! I saw your note about your study goals. Consistency makes progress! Have you blocked out study time for today, or do you need help breaking it down?";
    quickReplies = ["Already studying", "Need a schedule", "Taking a break"];
    delayMs = 25000;
  } else if (
    lowercaseText.includes("happy") ||
    lowercaseText.includes("excited") ||
    lowercaseText.includes("won") ||
    lowercaseText.includes("success") ||
    lowercaseText.includes("celebrate") ||
    lowercaseText.includes("passed")
  ) {
    isWorth = true;
    persona = "Friend";
    message = "Oh wow, that is absolutely incredible! I'm so hyped for you! How are we celebrating this win tonight?";
    quickReplies = ["Party time!", "Relaxing", "More work!"];
    delayMs = 20000;
  } else if (
    lowercaseText.includes("love") ||
    lowercaseText.includes("tired") ||
    lowercaseText.includes("sick") ||
    lowercaseText.includes("exhausted") ||
    lowercaseText.includes("diary") ||
    lowercaseText.includes("feeling")
  ) {
    isWorth = true;
    persona = "LifePartner";
    message = "Hey dear, you mentioned feeling exhausted in your diary entries. Please shut down the computer soon, rest your eyes, and get some cozy sleep. Did you eat dinner?";
    quickReplies = ["Yes, I ate", "Going to sleep now", "Working a bit more"];
    delayMs = 20000;
  } else if (
    lowercaseText.includes("every evening") ||
    lowercaseText.includes("evening") ||
    lowercaseText.includes("morning") ||
    lowercaseText.includes("noon") ||
    lowercaseText.includes("pm") ||
    lowercaseText.includes("am") ||
    lowercaseText.includes("todo") ||
    lowercaseText.includes("checklist") ||
    lowercaseText.includes("schedule")
  ) {
    isWorth = true;
    persona = "Secretary";
    
    let taskName = "your scheduled items";
    if (lowercaseText.includes("football")) taskName = "playing football";
    else if (lowercaseText.includes("gym")) taskName = "hitting the gym";
    else if (lowercaseText.includes("meeting")) taskName = "attending your meeting";

    message = `Hey! Just your personal secretary checking in. It's almost time for ${taskName}. Are you prepared and heading out now?`;
    quickReplies = ["On my way!", "Postponed", "Done!"];
    delayMs = 30000;
  }

  // Calculating target date for local fallback alerts
  const scheduledAt = new Date(Date.now() + delayMs);

  return {
    isWorth,
    message,
    scheduledAt: scheduledAt.toISOString(),
    persona,
    quickReplies,
  };
};

// Generating AI follow-up notifications when users submit replies
export const generateFollowUp = async (notification, userResponse) => {
  try {
    const userId = notification.user;
    const originalPersona = notification.persona;
    const responseText = userResponse.trim();

    const apiKey = process.env.GEMINI_API_KEY;
    const isGeminiAvailable = apiKey && apiKey.trim() && apiKey !== "your_gemini_api_key_here";

    let followUpText = "";
    let nextReplies = ["Got it", "Thanks"];

    if (isGeminiAvailable) {
      // Calling Gemini model for conversational follow-ups
      const selectedModelName = "gemini-2.5-flash-lite";
      console.log(`Generating Gemini follow-up response using model: ${selectedModelName}...`);

      try {
        const ai = getGeminiClient();
        let model = ai.getGenerativeModel({ 
          model: selectedModelName,
          generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
          You are a personal assistant acting under the persona of: ${originalPersona}.
          
          Context of original notification: "${notification.message}"
          User responded: "${responseText}"

          Give a brief, highly empathetic, Conversational follow-up message (1-2 sentences max).
          Also suggest 2 quick replies.
          CRITICAL: Do NOT use any emojis, emoticons, or decorative symbols in the message. Keep the writing clean, sophisticated, and highly professional.

          Return ONLY a raw JSON block (no markdown blocks, no extra text):
          {
            "message": "Empathic response back to the user",
            "quickReplies": ["Reply option 1", "Reply option 2"]
          }
        `;

        let response;
        try {
          response = await model.generateContent(prompt);
        } catch (apiErr) {
          console.warn(`Model ${selectedModelName} follow-up failed, falling back to gemini-2.5-flash-lite:`, apiErr.message);
          model = ai.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
            generationConfig: { responseMimeType: "application/json" }
          });
          response = await model.generateContent(prompt);
        }

        const text = response.response.text().trim();
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanedText);
        followUpText = parsed.message;
        nextReplies = parsed.quickReplies;
      } catch (err) {
        console.error("Gemini follow-up generation failed, using local dialogue tree:", err.message);
        const local = runLocalDialogueTree(originalPersona, responseText);
        followUpText = local.message;
        nextReplies = local.quickReplies;
      }
    } else {
      console.log("Running local dialogue tree fallback...");
      const local = runLocalDialogueTree(originalPersona, responseText);
      followUpText = local.message;
      nextReplies = local.quickReplies;
    }

    // Creating the assistant's reply directly with sent status
    await Notification.create({
      user: userId,
      note: notification.note,
      message: followUpText,
      persona: originalPersona,
      scheduledAt: new Date(),
      status: "sent",
      quickReplies: nextReplies,
    });

  } catch (error) {
    console.error("Error in generateFollowUp service:", error.message);
  }
};

// Running local dialogue tree fallback for interactive replies
const runLocalDialogueTree = (persona, reply) => {
  const lowercaseReply = reply.toLowerCase();
  let message = "";
  let quickReplies = ["Okay!", "Awesome"];

  if (persona === "Therapist") {
    if (lowercaseReply.includes("better") || lowercaseReply.includes("yes")) {
      message = "I'm so incredibly happy to hear that! Taking small steps makes all the difference. Remember, I'm always here to check in on you.";
      quickReplies = ["Thank you", "Will keep it up"];
    } else {
      message = "I hear you, and it's okay to not be okay. Please don't be hard on yourself. Make yourself cozy and maybe listen to some peaceful music. I will check back on you later.";
      quickReplies = ["Thanks, I will", "Appreciate it"];
    }
  } else if (persona === "LifePartner") {
    if (lowercaseReply.includes("eat") || lowercaseReply.includes("yes")) {
      message = "Yay! So proud of you for taking care of yourself. Now promise me you'll head to bed soon and get cozy sleep! Sweet dreams.";
      quickReplies = ["Goodnight!", "Love you, goodnight"];
    } else {
      message = "Aww, please don't skip meals dear. Go grab a quick healthy bite or drink a warm cup of milk. You deserve to be cared for.";
      quickReplies = ["Going now", "Will do, thanks"];
    }
  } else if (persona === "Teacher") {
    if (lowercaseReply.includes("study") || lowercaseReply.includes("yes")) {
      message = "Excellent job! Keep that focus and take a 5-minute stretch break every hour. Hard work always yields success.";
      quickReplies = ["Got it, Teacher!", "Focus mode on"];
    } else {
      message = "No worries, a short mental rest is also key to preventing burnout. Recharge your battery and let's tackle it fresh tomorrow!";
      quickReplies = ["Tackle tomorrow!", "Sounds like a plan"];
    }
  } else {
    // Handling Secretary and Friend persona fallback logic
    message = "Perfect! That sounds like an excellent plan. I've updated your schedule logs. Keep up the awesome momentum!";
    quickReplies = ["Will do!", "Awesome"];
  }

  return {
    message,
    quickReplies,
  };
};
