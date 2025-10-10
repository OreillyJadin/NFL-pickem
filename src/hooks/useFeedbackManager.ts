"use client";

import { useState, useEffect, useCallback } from "react";
import FeedbackModal from "@/components/FeedbackModal";

interface FeedbackPreferences {
  hasSeenFeedback: boolean;
  lastFeedbackPrompt: number;
  feedbackDismissedCount: number;
  lastWinDate?: string;
}

const FEEDBACK_STORAGE_KEY = "whoKnowsBall_feedback_prefs";
const FEEDBACK_COOLDOWN_DAYS = 7; // Don't show again for 7 days after dismissal
const WIN_PROMPT_COOLDOWN_HOURS = 24; // Don't show after wins for 24 hours

export function useFeedbackManager() {
  const [showFeedback, setShowFeedback] = useState(false);
  const [preferences, setPreferences] = useState<FeedbackPreferences>({
    hasSeenFeedback: false,
    lastFeedbackPrompt: 0,
    feedbackDismissedCount: 0,
  });

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading feedback preferences:", error);
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = useCallback((newPrefs: FeedbackPreferences) => {
    try {
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(newPrefs));
      setPreferences(newPrefs);
    } catch (error) {
      console.error("Error saving feedback preferences:", error);
    }
  }, []);

  // Check if we should show feedback prompt
  const shouldShowFeedback = useCallback(() => {
    const now = Date.now();
    const daysSinceLastPrompt =
      (now - preferences.lastFeedbackPrompt) / (1000 * 60 * 60 * 24);

    // Don't show if dismissed recently
    if (
      preferences.lastFeedbackPrompt > 0 &&
      daysSinceLastPrompt < FEEDBACK_COOLDOWN_DAYS
    ) {
      return false;
    }

    // Don't show if dismissed too many times
    if (preferences.feedbackDismissedCount >= 3) {
      return false;
    }

    // Show for first-time users (after they've used the app a bit)
    if (!preferences.hasSeenFeedback) {
      return true;
    }

    // Show after wins (but not too frequently)
    if (preferences.lastWinDate) {
      const lastWinTime = new Date(preferences.lastWinDate).getTime();
      const hoursSinceWin = (now - lastWinTime) / (1000 * 60 * 60);

      if (hoursSinceWin < WIN_PROMPT_COOLDOWN_HOURS) {
        return false;
      }
    }

    // Show periodically for engaged users (every 2 weeks)
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
    if (preferences.lastFeedbackPrompt < twoWeeksAgo) {
      return true;
    }

    return false;
  }, [preferences]);

  // Trigger feedback prompt
  const triggerFeedback = useCallback(() => {
    if (shouldShowFeedback()) {
      setShowFeedback(true);
    }
  }, [shouldShowFeedback]);

  // Handle feedback dismissal
  const handleFeedbackDismiss = useCallback(() => {
    const newPrefs = {
      ...preferences,
      hasSeenFeedback: true,
      lastFeedbackPrompt: Date.now(),
      feedbackDismissedCount: preferences.feedbackDismissedCount + 1,
    };
    savePreferences(newPrefs);
    setShowFeedback(false);
  }, [preferences, savePreferences]);

  // Handle feedback close (submitted or closed without dismissing)
  const handleFeedbackClose = useCallback(() => {
    const newPrefs = {
      ...preferences,
      hasSeenFeedback: true,
      lastFeedbackPrompt: Date.now(),
    };
    savePreferences(newPrefs);
    setShowFeedback(false);
  }, [preferences, savePreferences]);

  // Mark a win (call this when user wins an award or has a good week)
  const markWin = useCallback(() => {
    const newPrefs = {
      ...preferences,
      lastWinDate: new Date().toISOString(),
    };
    savePreferences(newPrefs);
  }, [preferences, savePreferences]);

  // Reset feedback preferences (for testing or if user wants to see it again)
  const resetFeedbackPreferences = useCallback(() => {
    const defaultPrefs: FeedbackPreferences = {
      hasSeenFeedback: false,
      lastFeedbackPrompt: 0,
      feedbackDismissedCount: 0,
    };
    savePreferences(defaultPrefs);
  }, [savePreferences]);

  return {
    showFeedback,
    triggerFeedback,
    handleFeedbackDismiss,
    handleFeedbackClose,
    markWin,
    resetFeedbackPreferences,
    preferences,
  };
}

// Hook for components to easily trigger feedback
export function useFeedbackTrigger() {
  const { triggerFeedback, markWin } = useFeedbackManager();

  return {
    requestFeedback: triggerFeedback,
    markUserWin: markWin,
  };
}
