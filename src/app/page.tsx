"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { TutorialModal } from "@/components/TutorialModal";
import { Button } from "@/components/ui/button";
import { Star, BookOpen, Smartphone } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const { user, signOut } = useAuth();

  // Show tutorial for new users
  useEffect(() => {
    if (user && !hasSeenTutorial) {
      const tutorialShown = localStorage.getItem("nfl-pickem-tutorial-shown");
      if (!tutorialShown) {
        setShowTutorial(true);
      }
    }
  }, [user, hasSeenTutorial]);

  const handleTutorialClose = () => {
    setShowTutorial(false);
    setHasSeenTutorial(true);
    localStorage.setItem("nfl-pickem-tutorial-shown", "true");
  };

  const goToDashboard = () => {
    window.location.href = "/dashboard";
  };

  if (user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-600">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white">
              Welcome to Who Knows Ball
            </CardTitle>
            <CardDescription className="text-gray-300">
              You&apos;re signed in as {user.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-center gap-2 text-blue-300 font-semibold mb-2">
                <Star className="w-5 h-5" />
                <span>New Feature: Bonus Points!</span>
              </div>
              <p className="text-blue-200 text-sm">
                Starting Week 3, earn bonus points: Solo Pick (+2), Solo Lock
                (+2), Super Bonus (+5) for both!
              </p>
            </div>
            <Button
              onClick={goToDashboard}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Go to Dashboard
            </Button>
            <Button
              onClick={() => setShowTutorial(true)}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Take a Tour
              </span>
            </Button>
            <Button
              onClick={signOut}
              variant="ghost"
              className="w-full text-gray-300 hover:bg-gray-700"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>

        <TutorialModal
          isOpen={showTutorial}
          onClose={handleTutorialClose}
          onSkip={goToDashboard}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Who Knows Ball?
          </h1>
          <p className="text-gray-300">
            Make your picks and compete with friends
          </p>
        </div>

        {isLogin ? (
          <LoginForm onToggleMode={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onToggleMode={() => setIsLogin(true)} />
        )}

        {/* Subtle home screen reminder */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
            <Smartphone className="w-4 h-4" />
            <span>Add to home screen for quick access</span>
          </p>
          <div className="mt-2 flex justify-center">
            <svg
              className="w-4 h-4 text-red-500 animate-bounce"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                d="M10 3 L10 13 M6 9 L10 13 L14 9"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
