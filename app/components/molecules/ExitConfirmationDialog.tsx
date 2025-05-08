import React from "react";

interface ExitConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExit: () => void;
  title?: string;
  message?: string;
  cancelText?: string;
  exitText?: string;
}

export const ExitConfirmationDialog: React.FC<ExitConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onExit,
  title = "Exit Confirmation",
  message = "You are in the middle of a session. If you exit now, your progress will not be saved.",
  cancelText = "Cancel",
  exitText = "Exit Anyway",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="mb-6 text-gray-600">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onExit}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            {exitText}
          </button>
        </div>
      </div>
    </div>
  );
};
