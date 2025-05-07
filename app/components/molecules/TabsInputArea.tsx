import React, { RefObject } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { ChatInput } from "./ChatInput";

// Types for actions
interface ActionOption {
  id: string;
  name: string;
}

interface Action {
  id: string;
  name: string;
  icon: React.ReactNode;
  options?: ActionOption[];
}

interface TabsInputAreaProps {
  // Chat input props
  value: string;
  onChange: (value: string) => void;
  onSend: (e?: any) => void;
  isProcessing: boolean;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  inputRef?: React.Ref<HTMLTextAreaElement>;

  // Actions props
  availableActions?: Action[];
  onActionSelect?: (actionId: string, optionId?: string) => void;

  // Default tab
  defaultTab?: "chat" | "actions";

  // Class name for the container
  className?: string;
}

export const TabsInputArea: React.FC<TabsInputAreaProps> = ({
  value,
  onChange,
  onSend,
  isProcessing,
  disabled = false,
  placeholder,
  helperText,
  inputRef,
  availableActions = [],
  onActionSelect,
  defaultTab = "chat",
  className = "",
}) => {
  return (
    <div className={`${className}`}>
      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-3">
          <TabsTrigger value="chat">Communication</TabsTrigger>
          <TabsTrigger value="actions">Clinical Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-3 mt-0">
          <ChatInput
            value={value}
            onChange={onChange}
            onSend={onSend}
            isProcessing={isProcessing}
            disabled={disabled}
            inputRef={inputRef}
            placeholder={placeholder}
            helperText={helperText}
          />
        </TabsContent>

        <TabsContent value="actions" className="space-y-3 mt-0 mb-2">
          <p className="text-xs text-gray-500 text-center">
            Select clinical actions to perform during the interaction.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-0">
            {availableActions.map((action) => (
              <div key={action.id} className="space-y-2">
                <button
                  onClick={() =>
                    !action.options &&
                    onActionSelect &&
                    onActionSelect(action.id)
                  }
                  className="w-full h-12 flex items-center justify-center gap-2 p-3 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-800 text-sm font-medium"
                >
                  {action.icon}
                  {action.name}
                </button>

                {action.options && (
                  <div className="space-y-1 pl-2">
                    {action.options.map((option) => (
                      <button
                        key={option.id}
                        onClick={() =>
                          onActionSelect && onActionSelect(action.id, option.id)
                        }
                        className="w-full py-1.5 px-3 border border-gray-200 bg-white hover:bg-gray-100 rounded-md text-sm flex items-center"
                      >
                        {option.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
