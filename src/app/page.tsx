"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { TutorialModal } from "@/components/TutorialModal";
import { Button } from "@/components/ui/button";
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

  // Show tutorial automatically for new users
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Welcome to NFL Pick&apos;em!
            </CardTitle>
            <CardDescription>
              You&apos;re signed in as {user.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={goToDashboard} className="w-full">
              Go to Dashboard
            </Button>
            <Button
              onClick={() => setShowTutorial(true)}
              variant="outline"
              className="w-full"
            >
              📚 Take a Tour
            </Button>
            <Button onClick={signOut} variant="ghost" className="w-full">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            NFL Pick&apos;em
          </h1>
          <p className="text-gray-600">
            Make your picks and compete with friends
          </p>
        </div>

        {isLogin ? (
          <LoginForm onToggleMode={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onToggleMode={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  );
}
