
import React from "react";
import RecordButton from "@/components/RecordButton";

interface ChatControlsProps {
  isRecording: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  onToggleRecording: () => void;
}

const ChatControls: React.FC<ChatControlsProps> = ({ 
  isRecording, 
  isProcessing, 
  isSpeaking, 
  onToggleRecording 
}) => {
  return (
    <>
      <div className="p-4 border-t border-border/40 flex justify-center">
        <RecordButton 
          isRecording={isRecording} 
          onClick={onToggleRecording} 
          disabled={isProcessing || isSpeaking}
        />
      </div>
      
      <div className="pb-4 text-center text-sm text-muted-foreground">
        {isRecording && "Listening..."}
        {isProcessing && "Processing..."}
        {isSpeaking && "Speaking..."}
        {!isRecording && !isProcessing && !isSpeaking && "Click to start talking"}
      </div>
    </>
  );
};

export default ChatControls;
