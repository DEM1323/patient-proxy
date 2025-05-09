import React, { RefObject, MutableRefObject } from "react";
import Image from "next/image";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (e?: React.FormEvent) => void;
  isProcessing: boolean;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  inputRef?: React.Ref<HTMLTextAreaElement>;
  className?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  isProcessing,
  disabled = false,
  placeholder = `Type your message...\n\n\n(Press Enter to send, Shift+Enter for new line)`,
  helperText = "Use this area to communicate with the patient. Press Enter to send.",
  inputRef,
  className = "",
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter press (but not with Shift key)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleSend = (e: React.MouseEvent) => {
    e.preventDefault();
    onSend();
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex w-full">
        <div className="flex-1 relative w-full">
          <textarea
            ref={inputRef}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full text-sm px-4 py-4 h-[120px] align-top bg-white border-[1px] border-[#E5E5E5] overflow-y-auto resize-none rounded-[1rem] focus:outline-none focus:ring-2 focus:ring-[#015a8b] focus:border-transparent hide-scrollbar"
            disabled={isProcessing || disabled}
          />
          <div className="absolute right-4 bottom-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                // Speech to text functionality will be added later
                console.log("Audio input clicked");
              }}
            >
              <Image
                src="/audio-input.svg"
                alt="Audio Input"
                width={32}
                height={32}
                className="w-[32px] h-[32px]"
              />
            </button>
            <Button
              onClick={handleSend}
              disabled={!value.trim() || isProcessing || disabled}
              className="bg-[#015a8b] hover:bg-[#216f99] text-white h-[38px] w-[38px] p-0 flex items-center justify-center rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
      {helperText && (
        <p className="text-xs text-gray-500 text-center mt-2">{helperText}</p>
      )}
    </div>
  );
};
