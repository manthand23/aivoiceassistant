
import React, { useRef, useEffect } from "react";
import MessageBubble from "@/components/MessageBubble";
import AudioVisualizer from "@/components/AudioVisualizer";
import { Message } from "@/lib/api";

interface ChatMessagesProps {
  messages: Message[];
  isRecording: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ 
  messages, 
  isRecording, 
  isSpeaking, 
  isProcessing 
}) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to the most recent message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div 
      ref={chatContainerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col"
    >
      {messages.map((message, index) => (
        <MessageBubble 
          key={index} 
          content={message.content} 
          isUser={message.role === "user"} 
        />
      ))}
      
      {(isRecording || isSpeaking || isProcessing) && (
        <div className="flex justify-center">
          <AudioVisualizer isRecording={isRecording} isSpeaking={isSpeaking} />
        </div>
      )}
    </div>
  );
};

export default ChatMessages;
