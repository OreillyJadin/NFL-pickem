"use client";

import { createContext, useContext, useEffect } from "react";
import { useFeedbackManager } from "@/hooks/useFeedbackManager";
import FeedbackModal from "@/components/FeedbackModal";
import { FeedbackTrigger } from "@/components/FeedbackTrigger";

interface FeedbackContextType {
  requestFeedback: () => void;
  markUserWin: () => void;
  resetFeedbackPreferences: () => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(
  undefined
);

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (context === undefined) {
    throw new Error("useFeedback must be used within a FeedbackProvider");
  }
  return context;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const {
    showFeedback,
    triggerFeedback,
    handleFeedbackDismiss,
    handleFeedbackClose,
    markWin,
    resetFeedbackPreferences,
  } = useFeedbackManager();

  // Auto-trigger feedback on app load (if conditions are met)
  useEffect(() => {
    // Small delay to let the app load first
    const timer = setTimeout(() => {
      triggerFeedback();
    }, 2000);

    return () => clearTimeout(timer);
  }, [triggerFeedback]);

  const contextValue: FeedbackContextType = {
    requestFeedback: triggerFeedback,
    markUserWin: markWin,
    resetFeedbackPreferences,
  };

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
      <FeedbackModal
        isOpen={showFeedback}
        onClose={handleFeedbackClose}
        onDismiss={handleFeedbackDismiss}
      />
      <FeedbackTrigger />
    </FeedbackContext.Provider>
  );
}
