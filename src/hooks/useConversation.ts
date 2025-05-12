import { useState, useRef, useEffect } from "react";
import { 
  transcribeAudio, 
  getAIResponse, 
  textToSpeech, 
  getUserData, 
  saveUserData,
  saveAnalytics,
  saveFAQ,
  extractTopicsFromMessages,
  Message
} from "@/lib/api";
import { toast } from "@/components/ui/sonner";

interface UseConversationProps {
  name: string;
  email: string;
}

export function useConversation({ name, email }: UseConversationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const messageQueueRef = useRef<string[]>([]);
  const conversationIdRef = useRef<string>(Date.now().toString());

  // Load or initialize conversation
  const loadConversation = () => {
    if (!email) return false;

    try {
      // Get conversation history
      const history = JSON.parse(localStorage.getItem("conversation_history") || "[]");
      
      // Create a base greeting
      let greeting = `Hello ${name}! I'm your AI Voice Assistant.`;
      let hasFoundPreviousConversation = false;
      
      // Find the most recent conversation for this user
      for (let i = history.length - 1; i >= 0; i--) {
        const conv = history[i];
        if (conv.messages && conv.messages.some((msg: Message) => 
          msg.role === "assistant" && 
          msg.content && 
          msg.content.includes(`Hello ${name}!`)
        )) {
          // Extract user messages
          const userMessages = conv.messages
            .filter((msg: Message) => msg.role === "user")
            .slice(-3); // Get the last 3 user messages
            
          if (userMessages.length > 0) {
            // Get topics from previous conversations
            const topics = userMessages.map((msg: Message) => {
              const content = msg.content.toLowerCase();
              if (content.includes("weather")) return "the weather forecast";
              if (content.includes("calendar")) return "your calendar";
              if (content.includes("email") || content.includes("send")) return "sending information to your email";
              if (content.includes("renewable energy")) return "renewable energy developments";
              if (content.includes("time management")) return "time management techniques";
              if (content.includes("meeting") || content.includes("book")) return "booking a meeting";
              return "various topics";
            });
            
            // Get unique topics and filter out "various topics" if there are other specific topics
            const uniqueTopics = Array.from(new Set(topics)).filter(topic => 
              topics.some(t => t !== "various topics") ? topic !== "various topics" : true
            );
            
            if (uniqueTopics.length > 0) {
              greeting = `Hello ${name}! I remember our previous conversation about ${uniqueTopics.join(" and ")}. Would you like to continue that conversation?`;
              hasFoundPreviousConversation = true;
            }
          }
          break;
        }
      }
      
      // If no previous conversation was found or no topics extracted, use the basic greeting
      if (!hasFoundPreviousConversation) {
        greeting += " How can I help you today?";
      }
      
      // Create greeting message and set it
      const greetingMessage: Message = { role: "assistant", content: greeting };
      setMessages([greetingMessage]);
      
      // Save this in user data
      const userData = getUserData(email);
      if (userData) {
        if (userData.conversations.length === 0) {
          userData.conversations.push({
            date: new Date().toISOString(),
            messages: [greetingMessage]
          });
        } else {
          // If last conversation has non-system messages, create a new one
          const lastConv = userData.conversations[userData.conversations.length - 1];
          const hasNonSystemMessages = lastConv.messages.some(msg => msg.role !== "system");
          
          if (hasNonSystemMessages) {
            userData.conversations.push({
              date: new Date().toISOString(),
              messages: [greetingMessage]
            });
          } else {
            // Update last conversation with new greeting
            lastConv.messages = [greetingMessage];
          }
        }
        saveUserData(userData);
      }
      
      // Store this conversation in history
      const conversationHistory = JSON.parse(localStorage.getItem("conversation_history") || "[]");
      const existingConvIndex = conversationHistory.findIndex((conv: any) => conv.id === conversationIdRef.current);
      
      if (existingConvIndex >= 0) {
        conversationHistory[existingConvIndex].messages = [greetingMessage];
      } else {
        const newConversation = {
          id: conversationIdRef.current,
          date: new Date().toISOString(),
          messages: [greetingMessage]
        };
        conversationHistory.push(newConversation);
      }
      
      localStorage.setItem("conversation_history", JSON.stringify(conversationHistory));
      
      // Speak the greeting
      setTimeout(() => {
        speakText(greeting);
      }, 300);
      
      return true;
    } catch (error) {
      console.error("Error loading conversation:", error);
      return false;
    }
  };

  const handleAudioSubmission = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      // Convert speech to text
      const transcript = await transcribeAudio(audioBlob);
      
      if (!transcript.trim()) {
        setIsProcessing(false);
        toast.info("I couldn't hear anything. Please try again.");
        return;
      }
      
      // Add user message
      const userMessage: Message = { role: "user", content: transcript };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      
      // Prepare for speech before getting response to reduce latency
      if (audioContextRef.current && audioContextRef.current.state !== 'running') {
        try {
          await audioContextRef.current.resume();
        } catch (e) {
          console.error("Error resuming audio context:", e);
        }
      }
      
      // Get AI response
      const aiResponseText = await getAIResponse(
        // Filter out the greeting message when sending to AI
        updatedMessages.filter(msg => 
          !(msg.role === "assistant" && 
            (msg.content.includes(`Hello ${name}! I remember`) || 
             msg.content === `Hello ${name}! I'm your AI Voice Assistant. How can I help you today?`))
        )
      );
      const assistantMessage: Message = { role: "assistant", content: aiResponseText };
      
      // Update messages with AI response
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      
      // Save conversation to localStorage
      saveConversationToLocalStorage(finalMessages);
      
      // Save user data
      const userData = getUserData(email);
      if (userData) {
        const currentConversation = userData.conversations[userData.conversations.length - 1];
        
        // Store all messages except the welcome back greeting if it exists
        const messagesToStore = finalMessages.filter(msg => 
          !(msg.role === "assistant" && msg.content.includes(`Hello ${name}! I remember`))
        );
        
        currentConversation.messages = messagesToStore;
        saveUserData(userData);
      }
      
      // Save analytics and FAQ
      saveAnalytics(transcript, aiResponseText);
      saveFAQ(transcript, aiResponseText);
      
      // Start speech synthesis immediately
      speakText(aiResponseText);
      
    } catch (error) {
      console.error("Error processing audio:", error);
      toast.error("Error processing your request. Please try again.");
      setIsProcessing(false);
    }
  };

  const saveConversationToLocalStorage = (messages: Message[]) => {
    // Get existing history
    const history = JSON.parse(localStorage.getItem("conversation_history") || "[]");
    
    // Check if we need to create a new conversation or update existing
    let currentConversation = history.find((conv: any) => conv.id === conversationIdRef.current);
    
    if (!currentConversation) {
      currentConversation = {
        id: conversationIdRef.current,
        date: new Date().toISOString(),
        messages: messages
      };
      history.push(currentConversation);
    } else {
      currentConversation.messages = messages;
    }
    
    // Save back to localStorage
    localStorage.setItem("conversation_history", JSON.stringify(history));
    
    // Update total conversations counter
    const totalConversations = localStorage.getItem("total_conversations") || "0";
    localStorage.setItem("total_conversations", (parseInt(totalConversations) + 1).toString());
  };

  const speakText = async (text: string) => {
    try {
      setIsSpeaking(true);
      
      // Add to message queue
      messageQueueRef.current.push(text);
      processMessageQueue();
    } catch (error) {
      console.error("Error in speak text:", error);
      setIsSpeaking(false);
      setIsProcessing(false);
      toast.error("Failed to play speech. Please try again.");
    }
  };
  
  const processMessageQueue = async () => {
    if (messageQueueRef.current.length === 0 || isSpeaking) {
      return;
    }
    
    try {
      setIsSpeaking(true);
      const textToSpeak = messageQueueRef.current.shift() as string;
      
      // Clean text for speech by removing special characters that shouldn't be spoken
      const cleanedText = cleanTextForSpeech(textToSpeak);
      
      // Get speech audio
      const audioBuffer = await textToSpeech(cleanedText);
      
      // Play the audio
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      const audioContext = audioContextRef.current;
      
      // Stop any current audio
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      }
      
      const audioSource = audioContext.createBufferSource();
      audioSourceRef.current = audioSource;
      
      audioContext.decodeAudioData(audioBuffer, (buffer) => {
        audioSource.buffer = buffer;
        audioSource.connect(audioContext.destination);
        
        audioSource.onended = () => {
          setIsSpeaking(false);
          setIsProcessing(false);
          audioSourceRef.current = null;
          
          // Process next message in queue if available
          if (messageQueueRef.current.length > 0) {
            setTimeout(() => processMessageQueue(), 300);
          }
        };
        
        audioSource.start();
      }, (err) => {
        console.error("Error decoding audio:", err);
        setIsSpeaking(false);
        setIsProcessing(false);
        
        // Process next message in queue if available
        if (messageQueueRef.current.length > 0) {
          setTimeout(() => processMessageQueue(), 300);
        }
      });
    } catch (error) {
      console.error("Error playing speech:", error);
      setIsSpeaking(false);
      setIsProcessing(false);
      
      // Process next message in queue if available
      if (messageQueueRef.current.length > 0) {
        setTimeout(() => processMessageQueue(), 300);
      }
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

  const cleanup = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {
        // Ignore if already stopped
      }
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  // Make sure to clean up when unmounting
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    messages,
    isSpeaking,
    isProcessing,
    loadConversation,
    handleAudioSubmission,
    speakText,
    cleanup
  };
}
