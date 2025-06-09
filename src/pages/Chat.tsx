import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import ChatHeader from "@/components/ChatHeader";
import ChatMessages from "@/components/ChatMessages";
import ChatControls from "@/components/ChatControls";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useConversation } from "@/hooks/useConversation";
import { textToSpeech } from "@/lib/api";

interface LocationState {
  name: string;
  email: string;
  previousTopic?: string;
  isReturningUser?: boolean;
}

const Chat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    name = "",
    email = "",
    previousTopic = "",
    isReturningUser = false,
  } = (location.state as LocationState) || {};

  const [initialized, setInitialized] = useState(false);
  const [displayMessages, setDisplayMessages] = useState<any[]>([]);
  const [hasWelcomed, setHasWelcomed] = useState(false);

  const conversation = useConversation({ name, email, isReturningUser });

  const { isRecording, setupMicrophone, toggleRecording } = useAudioRecording({
    onRecordingComplete: conversation.handleAudioSubmission,
  });

  // ✅ Mute any early browser voice for returning users
  useEffect(() => {
    if (!isReturningUser || typeof window === "undefined") return;

    const originalSpeak = window.speechSynthesis.speak;

    window.speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => {
      utterance.volume = 0; // 🔇 mute greeting
      originalSpeak.call(window.speechSynthesis, utterance);
    };

    const timer = setTimeout(() => {
      window.speechSynthesis.speak = originalSpeak;
    }, 1000); // restore after 1 second

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!email) {
      navigate("/");
      return;
    }

    const loaded = conversation.loadConversation();

    if (!loaded) {
      navigate("/");
      return;
    }

    setupMicrophone();
    setInitialized(true);

    return () => {
      conversation.cleanup();
    };
  }, [email]);

  useEffect(() => {
    if (!initialized) return;

    let messages = [...conversation.messages];

    if (isReturningUser) {
      messages = messages.filter(
        (msg) =>
          msg.role !== "assistant" ||
          !msg.content?.includes("I'm your AI Voice Assistant")
      );
    }

    if (
      isReturningUser &&
      previousTopic &&
      previousTopic !== "nothing in particular" &&
      !hasWelcomed
    ) {
      const welcomeContent = `Hello ${name}! I remember our previous conversation about ${previousTopic}. Would you like to continue that conversation?`;
      const welcomeMessage = {
        role: "assistant" as const,
        content: welcomeContent,
      };

      setDisplayMessages([welcomeMessage, ...messages]);
      playAudioWithElevenLabs(welcomeContent);
      setHasWelcomed(true);
    } else {
      setDisplayMessages(messages);
    }
  }, [initialized, conversation.messages]);

  const playAudioWithElevenLabs = async (text: string) => {
    try {
      const audioBuffer = await textToSpeech(text);
      const audioContext = new AudioContext();
      const buffer = await audioContext.decodeAudioData(audioBuffer);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
    } catch (error) {
      console.error("Failed to play ElevenLabs audio:", error);
      toast.error("Failed to play welcome message.");
    }
  };

  const handleToggleRecording = () => {
    if (conversation.isSpeaking) {
      toast.info("Please wait for the assistant to finish speaking.");
      return;
    }
    toggleRecording();
  };

  const endCall = () => {
    navigate("/");
  };

  if (!email || !name || !initialized) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader onEndCall={endCall} />

      <ChatMessages
        messages={displayMessages}
        isRecording={isRecording}
        isSpeaking={conversation.isSpeaking}
        isProcessing={conversation.isProcessing}
      />

      <ChatControls
        isRecording={isRecording}
        isProcessing={conversation.isProcessing}
        isSpeaking={conversation.isSpeaking}
        onToggleRecording={handleToggleRecording}
      />
    </div>
  );
};

export default Chat;
