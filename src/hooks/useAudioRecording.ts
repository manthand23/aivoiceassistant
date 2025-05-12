
import { useState, useRef } from "react";
import { toast } from "@/components/ui/sonner";

interface UseAudioRecordingProps {
  onRecordingComplete: (audioBlob: Blob) => void;
}

export function useAudioRecording({ onRecordingComplete }: UseAudioRecordingProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const setupMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        
        if (audioBlob.size > 0) {
          onRecordingComplete(audioBlob);
        }
      };
      
      setMediaRecorder(recorder);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone. Please check permissions and try again.");
    }
  };

  const toggleRecording = () => {
    if (!mediaRecorder) {
      toast.error("Microphone initialization failed. Please reload the page.");
      return;
    }
    
    if (isRecording) {
      setIsRecording(false);
      mediaRecorder.stop();
    } else {
      setIsRecording(true);
      audioChunksRef.current = [];
      mediaRecorder.start();
    }
  };

  return {
    isRecording,
    setupMicrophone,
    toggleRecording
  };
}
