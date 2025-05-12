import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { saveUserData, getUserData } from "@/lib/api";

const Index = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);

  useEffect(() => {
    const lastSession = localStorage.getItem("lastSession");
    if (lastSession) {
      const { name: savedName, email: savedEmail } = JSON.parse(lastSession);
      setName(savedName || "");
      setEmail(savedEmail || "");
      checkIfReturningUser(savedEmail);
    }
  }, []);

  const checkIfReturningUser = (email: string) => {
    if (!email) return;
    const userData = getUserData(email);
    const hasConversations = userData?.conversations?.some(
      (conv) => conv.messages && conv.messages.length > 0
    );
    setIsReturningUser(!!hasConversations);
  };

  const extractTopicSummary = (text: string): string => {
    const keywords = [
      "order",
      "payment",
      "account",
      "shipping",
      "status",
      "refund",
      "delivery",
      "technical",
      "support",
      "password",
    ];
    const lower = text.toLowerCase();
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return keyword + " issue";
      }
    }
    return text.split(" ").slice(0, 3).join(" ");
  };

  const handleStartTalking = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast.error("Please enter both name and email.");
      return;
    }

    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    localStorage.setItem("lastSession", JSON.stringify({ name, email }));

    let userData = getUserData(email);

    if (!userData) {
      userData = {
        name,
        email,
        conversations: [],
      };
    } else {
      userData.name = name;
    }

    let lastConversation =
      userData.conversations[userData.conversations.length - 1];
    if (
      !userData.conversations.length ||
      (lastConversation &&
        lastConversation.messages.filter((msg) => msg.role !== "system")
          .length > 0)
    ) {
      lastConversation = {
        date: new Date().toISOString(),
        messages: [],
      };
      userData.conversations.push(lastConversation);
    }

    let previousTopic = "nothing in particular";
    const completedConversations = userData.conversations.slice(0, -1);
    const recentMessages = completedConversations
      .flatMap((c) => c.messages)
      .filter((m) => m.role === "user");

    const lastRelevantMessage = [...recentMessages]
      .reverse()
      .find((msg) => msg.content && msg.content.trim() !== "");

    if (lastRelevantMessage) {
      previousTopic = extractTopicSummary(lastRelevantMessage.content);
    }

    saveUserData(userData);

    navigate("/chat", {
      state: {
        name,
        email,
        previousTopic,
        isReturningUser,
      },
    });
  };

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const goToDashboard = () => navigate("/dashboard");

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    checkIfReturningUser(newEmail);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (email) {
      checkIfReturningUser(email);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 sm:p-6 relative">
      <Button
        variant="outline"
        className="absolute top-4 right-4"
        onClick={goToDashboard}
      >
        Dashboard
      </Button>

      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            AI Voice Assistant
          </h1>
          <p className="text-muted-foreground">
            Your personal AI assistant that understands and helps you
          </p>
        </div>

        <Card className="border border-border/40 bg-card/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Welcome{isReturningUser ? " Back" : ""}</CardTitle>
            <CardDescription>
              {isReturningUser
                ? "Continue your conversation with your AI assistant"
                : "Enter your details below to start a conversation with your AI assistant"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStartTalking} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="John Smith"
                  value={name}
                  onChange={handleNameChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.smith@example.com"
                  value={email}
                  onChange={handleEmailChange}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Starting..." : "Start Talking"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
