
import React from "react";
import { cn } from "@/lib/utils";
import { Message } from "@/lib/api";

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ content, isUser }) => {
  return (
    <div
      className={cn(
        "px-4 py-2 rounded-lg max-w-[80%] my-2",
        isUser
          ? "bg-accent text-accent-foreground self-end rounded-br-none"
          : "bg-muted text-foreground self-start rounded-bl-none"
      )}
    >
      {content}
    </div>
  );
};

export default MessageBubble;
