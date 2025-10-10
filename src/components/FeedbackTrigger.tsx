"use client";

import { useFeedback } from "@/components/FeedbackProvider";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

export function FeedbackTrigger() {
  const { requestFeedback, resetFeedbackPreferences } = useFeedback();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={requestFeedback}
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg border border-blue-500 hover:border-blue-400 transition-all duration-200"
        title="Share Feedback"
      >
        <MessageSquare className="w-4 h-4" />
      </Button>
    </div>
  );
}
