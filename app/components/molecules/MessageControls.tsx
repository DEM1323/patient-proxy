import React, { FormEvent, ChangeEvent, RefObject } from "react";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";

export interface MessageControlsProps {
  disabled: boolean;
  onSendMessage: (e: FormEvent) => void;
  inputRef: RefObject<HTMLTextAreaElement>;
  setCurrentInput: (value: string) => void;
  currentInput: string;
}

export function MessageControls({
  disabled,
  onSendMessage,
  inputRef,
  setCurrentInput,
  currentInput,
}: MessageControlsProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (currentInput.trim() && !disabled) {
      onSendMessage(e);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (currentInput.trim() && !disabled) {
        onSendMessage(e as unknown as FormEvent);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
      <Textarea
        ref={inputRef}
        value={currentInput}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Type your message to the patient..."
        className="resize-none min-h-[100px] focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </p>
        <Button
          type="submit"
          disabled={!currentInput.trim() || disabled}
          className="bg-[#015a8b] hover:bg-[#014a7b] text-white"
        >
          Send
        </Button>
      </div>
    </form>
  );
}
