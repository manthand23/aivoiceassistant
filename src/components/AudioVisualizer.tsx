
import React, { useEffect, useState } from "react";

interface AudioVisualizerProps {
  isRecording: boolean;
  isSpeaking: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isRecording, isSpeaking }) => {
  const [bars, setBars] = useState<number[]>([0.2, 0.5, 0.8, 0.5, 0.2]);
  
  useEffect(() => {
    if (!isRecording && !isSpeaking) return;
    
    const interval = setInterval(() => {
      setBars(prev => prev.map(() => Math.random() * 0.8 + 0.2));
    }, 100);
    
    return () => clearInterval(interval);
  }, [isRecording, isSpeaking]);
  
  if (!isRecording && !isSpeaking) {
    return null;
  }
  
  return (
    <div className="waves flex justify-center items-center h-10 my-4">
      {bars.map((height, index) => (
        <div
          key={index}
          className="wave-bar mx-[2px] rounded-full"
          style={{
            height: `${height * 40}px`,
            backgroundColor: isRecording ? "hsl(var(--accent))" : "hsl(var(--primary))",
            animation: `wave ${1 + index * 0.1}s infinite ease-in-out alternate`
          }}
        />
      ))}
    </div>
  );
};

export default AudioVisualizer;
