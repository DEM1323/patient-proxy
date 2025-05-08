import { useRef, useEffect, ReactNode } from "react";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { ChatMessage, ChatMessageProps } from "./ChatMessage";

interface ChatContainerProps {
  messages: ChatMessageProps[];
  isTyping?: boolean;
  typingMessageProps?: Partial<ChatMessageProps>;
  className?: string;
  children?: ReactNode;
}

export const ChatContainer = ({
  messages,
  isTyping = false,
  typingMessageProps,
  className = "",
  children,
}: ChatContainerProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const defaultTypingProps: ChatMessageProps = {
    id: "typing",
    role: "patient",
    content: "",
    timestamp: new Date(),
    senderName: typingMessageProps?.senderName || "Patient",
    isTyping: true,
  };

  const typingMessage = {
    ...defaultTypingProps,
    ...typingMessageProps,
  };

  // Check if max-width should be applied based on className
  const useFullWidth =
    className.includes("max-w-full") || className.includes("w-full");

  return (
    <ScrollArea className={`flex-1 p-4 custom-scrollbar ${className}`}>
      <div
        className={
          useFullWidth ? "w-full space-y-4" : "max-w-3xl mx-auto space-y-4"
        }
      >
        {messages.map((message) => (
          <ChatMessage key={message.id} {...message} />
        ))}

        {isTyping && <ChatMessage {...typingMessage} />}

        {children}

        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};
