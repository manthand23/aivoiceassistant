import { toast } from "@/components/ui/sonner";

// API configuration
const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY;
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;

// Define system prompt for OpenAI
const SYSTEM_PROMPT = `
You are a helpful and friendly AI voice assistant providing customer support.
Your goal is to help users with their account questions, technical issues, and other inquiries.
Be conversational, helpful, and make the user feel valued and heard.
Use a friendly tone and be concise in your responses.

When helping users, follow these guidelines:
- If the user asks about resetting passwords, guide them through the process step by step
- If the user asks for specific information, provide clear answers
- If the user asks about account details, ask for verification information first
- Be empathetic and understanding
- Remember information from previous exchanges in the conversation
- Do not use special characters like asterisks or quotation marks in your responses as they will be spoken aloud
`;

// Interface for conversation history
export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

// Interface for user data
export interface UserData {
  name: string;
  email: string;
  conversations: {
    date: string;
    messages: Message[];
  }[];
}

// Store user data in local storage
export const saveUserData = (userData: UserData): void => {
  const existingUsers = getUsersData();
  const userIndex = existingUsers.findIndex(user => user.email === userData.email);
  
  if (userIndex >= 0) {
    existingUsers[userIndex] = userData;
  } else {
    existingUsers.push(userData);
  }
  
  localStorage.setItem("aiAssistantUsers", JSON.stringify(existingUsers));
  localStorage.setItem("conversation_history", JSON.stringify(userData.conversations));
  console.log("Saved user data:", userData);
};

// Get all users data
export const getUsersData = (): UserData[] => {
  const data = localStorage.getItem("aiAssistantUsers");
  return data ? JSON.parse(data) : [];
};

// Get specific user data
export const getUserData = (email: string): UserData | undefined => {
  if (!email) return undefined;
  
  const users = getUsersData();
  const userData = users.find(user => user.email.toLowerCase() === email.toLowerCase());
  console.log("Retrieved user data for email:", email, userData ? "found" : "not found");
  return userData;
};

// Speech to text with Deepgram
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append("audio", audioBlob);

    const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true", {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to transcribe audio: ${response.status}`);
    }

    const data = await response.json();
    return data.results.channels[0].alternatives[0].transcript || "";
  } catch (error) {
    console.error("Error transcribing audio:", error);
    toast.error("Failed to transcribe audio. Please try again.");
    return "";
  }
};

// Get AI response from OpenAI
export const getAIResponse = async (messages: Message[]): Promise<string> => {
  try {
    const response = await fetch("/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error ${response.status}:`, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error getting AI response:", error);
    toast.error("Failed to get AI response. Please try again.");
    return "I'm sorry, I'm having trouble processing your request right now. Could you please try again?";
  }
};

// Clean text for speech by removing special characters that shouldn't be spoken
const cleanTextForSpeech = (text: string): string => {
  // Remove asterisks (markdown bold/italics)
  let cleanedText = text.replace(/\*/g, "");
  
  // Remove quotes that would be spoken
  cleanedText = cleanedText.replace(/["']/g, "");
  
  // Remove markdown links and keep only the text
  cleanedText = cleanedText.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  
  // Remove other special characters that might be incorrectly spoken
  cleanedText = cleanedText.replace(/[_#>`]/g, "");
  
  return cleanedText;
};

// Text to speech with ElevenLabs - modified to handle quota errors better
export const textToSpeech = async (text: string): Promise<ArrayBuffer> => {
  try {
    // Fallback for ElevenLabs API issues - using browser's built-in TTS
    const useFallbackTTS = (message: string): Promise<ArrayBuffer> => {
      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(message);
        const voices = window.speechSynthesis.getVoices();
        // Try to find a good voice
        const preferredVoice = voices.find(voice => 
          voice.name.includes('Female') || 
          voice.name.includes('Google') || 
          voice.name.includes('Samantha')
        );
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
        
        utterance.rate = 1;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
        
        // Create a simple audio sample to return
        const audioContext = new AudioContext();
        const emptyBuffer = audioContext.createBuffer(1, 1, 22050);
        const arrayBuffer = emptyBuffer.getChannelData(0).buffer;
        resolve(arrayBuffer);
      });
    };
    
    try {
      const cleanedText = cleanTextForSpeech(text);
      const voice_id = "EXAVITQu4vr4xnSDxMaL"; // Using Sarah voice
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: cleanedText,
          model_id: "eleven_turbo_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        console.error("ElevenLabs error, using fallback:", await response.text());
        toast.info("Using browser's text-to-speech due to API limitations.");
        return await useFallbackTTS(cleanedText);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error("Error with ElevenLabs, using fallback:", error);
      toast.info("Using browser's text-to-speech due to API limitations.");
      return await useFallbackTTS(text);
    }
  } catch (error) {
    console.error("Text-to-speech completely failed:", error);
    toast.error("Failed to generate speech. Please try again.");
    throw error;
  }
};

// Save conversation analytics
export const saveAnalytics = (question: string, response: string): void => {
  // Get existing analytics
  const analyticsData = localStorage.getItem("aiAssistantAnalytics");
  const analytics = analyticsData ? JSON.parse(analyticsData) : {
    totalInteractions: 0,
    questions: {},
    topicFrequency: {}
  };
  
  // Update analytics
  analytics.totalInteractions += 1;
  
  // Extract topic from question (simple keyword extraction)
  const keywords = ["password", "reset", "account", "login", "billing", "payment", "subscription", "cancel", "update", "problem"];
  
  const detectedTopics = keywords.filter(keyword => question.toLowerCase().includes(keyword));
  
  detectedTopics.forEach(topic => {
    analytics.topicFrequency[topic] = (analytics.topicFrequency[topic] || 0) + 1;
  });
  
  // Store question
  const shortQuestion = question.substring(0, 100);
  analytics.questions[shortQuestion] = (analytics.questions[shortQuestion] || 0) + 1;
  
  // Save back to localStorage
  localStorage.setItem("aiAssistantAnalytics", JSON.stringify(analytics));
};

// Get analytics data for dashboard
export const getAnalytics = () => {
  const analyticsData = localStorage.getItem("aiAssistantAnalytics");
  return analyticsData ? JSON.parse(analyticsData) : {
    totalInteractions: 0,
    questions: {},
    topicFrequency: {}
  };
};

// Save FAQ data
export const saveFAQ = (question: string, answer: string): void => {
  const faqs = getFAQs();
  const existingIndex = faqs.findIndex(faq => faq.question === question);
  
  if (existingIndex >= 0) {
    faqs[existingIndex].count += 1;
  } else {
    faqs.push({ question, answer, count: 1 });
  }
  
  localStorage.setItem("aiAssistantFAQs", JSON.stringify(faqs));
};

// Get FAQ data
export const getFAQs = () => {
  const faqData = localStorage.getItem("aiAssistantFAQs");
  return faqData ? JSON.parse(faqData) : [];
};

// Extract topics from user messages - similar to the provided code
export const extractTopicsFromMessages = (messages: Message[]): string[] => {
  // Get only user messages
  const userMessages = messages.filter(msg => msg.role === "user").slice(-3);
  
  if (userMessages.length === 0) return [];
  
  // Define keywords for topics detection
  const topicKeywords: Record<string, string> = {
    "weather": "the weather forecast",
    "calendar": "your calendar",
    "email": "email communications",
    "send": "sending information",
    "renewable": "renewable energy",
    "energy": "energy topics",
    "time": "time management",
    "management": "management strategies",
    "meeting": "scheduling meetings",
    "book": "booking appointments",
    "password": "password reset",
    "reset": "account resets",
    "account": "account management",
    "login": "login issues",
    "billing": "billing questions",
    "payment": "payment methods",
    "subscription": "subscription details",
    "cancel": "cancellation procedures",
    "update": "account updates",
    "problem": "technical issues",
    "help": "customer support",
    "question": "general inquiries"
  };
  
  // Extract topics from user messages
  const topics = userMessages.map(msg => {
    const content = msg.content.toLowerCase();
    
    // Check for each keyword
    for (const [keyword, topic] of Object.entries(topicKeywords)) {
      if (content.includes(keyword)) {
        return topic;
      }
    }
    
    return "various topics";
  });
  
  // Get unique topics
  return Array.from(new Set(topics));
};