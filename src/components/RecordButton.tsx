
import React from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecordButtonProps {
  isRecording: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const RecordButton: React.FC<RecordButtonProps> = ({ isRecording, onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative w-16 h-16 rounded-full flex items-center justify-center focus:outline-none transition-all",
        isRecording ? "bg-destructive" : "bg-primary",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {isRecording ? (
        <>
          <div className="absolute w-full h-full rounded-full animate-pulse-ring bg-destructive opacity-75"></div>
          <MicOff className="w-8 h-8 text-white" />
        </>
      ) : (
        <>
          <Mic className="w-8 h-8 text-primary-foreground" />
          <span className="sr-only">Start Recording</span>
        </>
      )}
    </button>
  );
};

export default RecordButton;
