import { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type MessageRole =
  | "user"
  | "assistant"
  | "system"
  | "action"
  | "patient";

export interface ChatMessageProps {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  senderName?: string;
  isTyping?: boolean;
}

export const ChatMessage = ({
  id,
  role,
  content,
  timestamp,
  senderName,
  isTyping = false,
}: ChatMessageProps) => {
  // Determine message style based on role
  const getMessageStyle = (): {
    containerClass: string;
    bubbleClass: string;
  } => {
    switch (role) {
      case "user":
        return {
          containerClass: "justify-end",
          bubbleClass: "bg-[#015a8b] text-white", // Blue bubble for user
        };
      case "assistant":
        return {
          containerClass: "justify-start",
          bubbleClass: "bg-gray-100 text-gray-800", // Light gray for AI assistant
        };
      case "patient":
        return {
          containerClass: "justify-start",
          bubbleClass: "bg-[#E9ECEF] text-gray-900", // Gray for patient
        };
      case "system":
        return {
          containerClass: "justify-start",
          bubbleClass: "bg-amber-100 text-amber-800 border border-amber-200", // Amber for system messages
        };
      case "action":
        return {
          containerClass: "justify-start",
          bubbleClass: "bg-green-100 text-green-800 border border-green-200", // Green for actions
        };
      default:
        return {
          containerClass: "justify-start",
          bubbleClass: "bg-gray-100 text-gray-800",
        };
    }
  };

  const { containerClass, bubbleClass } = getMessageStyle();

  // Display name based on role
  const displayName = (): string => {
    if (senderName) return senderName;

    switch (role) {
      case "user":
        return "You";
      case "assistant":
        return "AI Assistant";
      case "patient":
        return "Patient";
      case "system":
        return "System";
      case "action":
        return "Action";
      default:
        return "";
    }
  };

  return (
    <div className={`flex ${containerClass}`}>
      <div
        className={`max-w-[90%] md:max-w-[70%] lg:max-w-[60%] rounded-lg p-3 ${bubbleClass}`}
      >
        <div className="flex flex-col">
          <span className="text-xs font-medium opacity-75 mb-1">
            {displayName()}
          </span>

          {isTyping ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm">Typing...</p>
            </div>
          ) : (
            <div
              className="prose prose-sm max-w-none"
              style={{
                whiteSpace: "pre-wrap",
                // Add markdown styling within the divs
                ...(role === "assistant" && {
                  "& h1": {
                    fontWeight: "bold",
                    fontSize: "1.25rem",
                    marginTop: "1rem",
                    marginBottom: "0.5rem",
                  },
                  "& h2": {
                    fontWeight: "bold",
                    fontSize: "1.1rem",
                    marginTop: "1rem",
                    marginBottom: "0.5rem",
                  },
                  "& ul": {
                    paddingLeft: "1.5rem",
                    marginTop: "0.5rem",
                    marginBottom: "0.5rem",
                  },
                  "& li": { marginBottom: "0.25rem" },
                }),
              }}
            >
              {content}
            </div>
          )}

          <div className="text-xs opacity-70 mt-1 text-right">
            {timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
