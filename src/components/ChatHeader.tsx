
import React from "react";
import { Button } from "@/components/ui/button";
import { PhoneOff } from "lucide-react";

interface ChatHeaderProps {
  onEndCall: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ onEndCall }) => {
  return (
    <header className="flex justify-between items-center p-4 border-b border-border/40">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-accent animate-pulse"></div>
        <h1 className="font-semibold text-xl">AI Voice Assistant</h1>
      </div>
      <Button 
        variant="destructive" 
        size="sm"
        onClick={onEndCall}
      >
        <PhoneOff className="mr-2 h-4 w-4" />
        End Call
      </Button>
    </header>
  );
};

export default ChatHeader;
