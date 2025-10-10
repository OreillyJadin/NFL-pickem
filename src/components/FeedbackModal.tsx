"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Bug, Star, X } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDismiss: () => void;
}

type FeedbackType = "bug" | "suggestion" | "general";

export default function FeedbackModal({
  isOpen,
  onClose,
  onDismiss,
}: FeedbackModalProps) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: feedbackType,
          message: message.trim(),
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        setTimeout(() => {
          onClose();
          setIsSubmitted(false);
          setMessage("");
        }, 2000);
      } else {
        throw new Error("Failed to submit feedback");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    onDismiss();
    onClose();
  };

  if (isSubmitted) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-gray-800 border-gray-600">
          <div className="text-center py-6">
            <div className="mx-auto w-12 h-12 bg-green-900/20 rounded-full flex items-center justify-center mb-4 border border-green-600">
              <Star className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Thank you!
            </h3>
            <p className="text-gray-300">
              Your feedback has been submitted successfully.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-600">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-white">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              Share Your Feedback
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Help us improve WhoKnowsBall! Your feedback helps us make the app
            better for everyone.
          </p>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-white">
              What would you like to share?
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={feedbackType === "bug" ? "default" : "outline"}
                size="sm"
                onClick={() => setFeedbackType("bug")}
                className={`flex items-center gap-2 ${
                  feedbackType === "bug"
                    ? "bg-red-600 hover:bg-red-700 text-white border-red-600"
                    : "bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
                }`}
              >
                <Bug className="w-4 h-4" />
                Bug Report
              </Button>
              <Button
                variant={feedbackType === "suggestion" ? "default" : "outline"}
                size="sm"
                onClick={() => setFeedbackType("suggestion")}
                className={`flex items-center gap-2 ${
                  feedbackType === "suggestion"
                    ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                    : "bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
                }`}
              >
                <Star className="w-4 h-4" />
                Suggestion
              </Button>
              <Button
                variant={feedbackType === "general" ? "default" : "outline"}
                size="sm"
                onClick={() => setFeedbackType("general")}
                className={`flex items-center gap-2 ${
                  feedbackType === "general"
                    ? "bg-gray-600 hover:bg-gray-500 text-white border-gray-600"
                    : "bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                General
              </Button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message" className="text-white">
                {feedbackType === "bug" && "Describe the bug:"}
                {feedbackType === "suggestion" && "Share your idea:"}
                {feedbackType === "general" && "Tell us what's on your mind:"}
              </Label>
              <Textarea
                id="message"
                placeholder={
                  feedbackType === "bug"
                    ? "What happened? What did you expect to happen?"
                    : feedbackType === "suggestion"
                    ? "What feature would you like to see?"
                    : "Any thoughts about the app?"
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="resize-none bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDismiss}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600 hover:text-white"
              >
                Maybe Later
              </Button>
              <Button
                type="submit"
                disabled={!message.trim() || isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600 disabled:text-gray-400"
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>

          <p className="text-xs text-gray-400 text-center">
            We read every piece of feedback and use it to improve the app.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
