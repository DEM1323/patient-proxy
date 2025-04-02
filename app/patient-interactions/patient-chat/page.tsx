"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ContentLayout } from "@/app/components/layouts/ContentLayout";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { getProfiles } from "@/app/lib/storage";
import { type PatientProfile } from "@/app/types/patient";
import { Send, ArrowLeft } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "patient";
  timestamp: Date;
}

export default function PatientChat() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId");
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load patient profile
    if (patientId) {
      const profiles = getProfiles();
      const profile = profiles[patientId];
      if (profile) {
        setPatient(profile);
      }
    }
  }, [patientId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setNewMessage("");
  };

  const Title = patient && (
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() =>
          router.push("/patient-interactions/select-patient?mode=chat")
        }
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div>
        <h1 className="text-xl font-bold">{patient.patientName}</h1>
        <p className="text-sm text-gray-500">
          {patient.age} years • {patient.gender}
        </p>
      </div>
    </div>
  );

  if (!patient) {
    return (
      <ContentLayout title="Patient Chat" showSearch={false}>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-600">Patient not found</p>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title={Title} showSearch={false}>
      <div className="flex flex-col h-full">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.sender === "user"
                    ? "bg-[#015a8b] text-white"
                    : "bg-gray-200 text-gray-900"
                }`}
              >
                <p className="text-sm">{message.text}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form
          onSubmit={handleSendMessage}
          className="mt-4 border-t border-gray-200 pt-4"
        >
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder="Say anything..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full text-base p-4 pr-12 min-h-[120px] align-top"
                style={{ alignItems: "flex-start", paddingTop: "1rem" }}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => {
                  // Speech to text functionality will be added later
                  console.log("Audio input clicked");
                }}
              >
                <img
                  src="/audio-input.svg"
                  alt="Audio Input"
                  className="w-[38px] h-[38px]"
                />
              </button>
            </div>
            <Button
              type="submit"
              className="bg-[#015a8b] hover:bg-[#216f99] h-[38px] w-[38px] p-0 flex-shrink-0"
              disabled={!newMessage.trim()}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </form>

        {/* Warning Banner */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Chatbot simulations and patient interactions are not saved and will
            clear once you exit the chat.
          </p>
        </div>
      </div>
    </ContentLayout>
  );
}
