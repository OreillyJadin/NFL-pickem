"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Trophy,
  Target,
  Lock,
} from "lucide-react";

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkip?: () => void;
}

export function TutorialModal({ isOpen, onClose, onSkip }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to NFL Pick'em!",
      description: "Learn how to make picks and compete with friends",
      content: (
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">🏈</div>
          <p className="text-lg text-gray-600">
            Make your picks for NFL games each week and compete with friends!
          </p>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl mb-2">📱</div>
              <h3 className="font-semibold">Mobile Friendly</h3>
              <p className="text-sm text-gray-600">Works great on your phone</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl mb-2">🏆</div>
              <h3 className="font-semibold">Compete</h3>
              <p className="text-sm text-gray-600">See who's winning</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Making Picks",
      description: "How to select your teams",
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
            <Target className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="font-semibold">Regular Picks</h3>
              <p className="text-sm text-gray-600">
                +1 point for correct, 0 for wrong
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-4 bg-yellow-50 rounded-lg">
            <Lock className="h-6 w-6 text-yellow-600" />
            <div>
              <h3 className="font-semibold">Lock Picks</h3>
              <p className="text-sm text-gray-600">
                +2 points for correct, -2 for wrong (max 3 per week)
              </p>
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              💡 <strong>Tip:</strong> You can change your picks until the game
              starts!
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Leaderboard & Stats",
      description: "Track your performance",
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
            <Trophy className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="font-semibold">Leaderboard</h3>
              <p className="text-sm text-gray-600">
                See how you rank against other players
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">W/L</div>
              <p className="text-xs text-gray-600">Win/Loss Record</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">PTS</div>
              <p className="text-xs text-gray-600">Total Points</p>
            </div>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">
              🏆 <strong>Weekly Awards:</strong> Earn trophies for perfect
              weeks, top scores, and more!
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2 rounded border">
                <div className="font-semibold text-yellow-700">
                  🏆 Top Scorer
                </div>
                <div className="text-gray-600">Highest points</div>
              </div>
              <div className="bg-white p-2 rounded border">
                <div className="font-semibold text-yellow-700">
                  🥶 Lowest Scorer
                </div>
                <div className="text-gray-600">Lowest points</div>
              </div>
              <div className="bg-white p-2 rounded border">
                <div className="font-semibold text-yellow-700">
                  💯 Perfect Week
                </div>
                <div className="text-gray-600">All picks correct</div>
              </div>
              <div className="bg-white p-2 rounded border">
                <div className="font-semibold text-yellow-700">
                  🧊 Cold Week
                </div>
                <div className="text-gray-600">All picks wrong</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Add to Home Screen",
      description: "Get the app experience on your iPhone",
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <Smartphone className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Add to iPhone Home Screen
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                1
              </div>
              <div className="min-w-0">
                <p className="font-medium">Open in Safari</p>
                <p className="text-sm text-gray-600">
                  Make sure you're using Safari browser
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">Tap Middle Share Button</p>
                <p className="text-sm text-gray-600 mb-3">
                  Look for the share icon in the middle of the bottom bar
                </p>
                {/* Mock iPhone screenshot showing share button */}
                <div className="bg-black rounded-lg p-2 w-32 mx-auto">
                  <div className="bg-white rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-500 mb-1">Safari</div>
                    <div className="w-full h-16 bg-gray-100 rounded mb-2 flex items-center justify-center">
                      <div className="text-xs text-gray-400">NFL Pick'em</div>
                    </div>
                    <div className="flex justify-center space-x-2">
                      <div className="w-5 h-5 bg-gray-300 rounded"></div>
                      <div className="w-5 h-5 bg-gray-300 rounded"></div>
                      <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center border-2 border-blue-600">
                        <div className="text-white text-xs">↗</div>
                      </div>
                      <div className="w-5 h-5 bg-gray-300 rounded"></div>
                      <div className="w-5 h-5 bg-gray-300 rounded"></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Middle share button (↗)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                3
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">Select "Add to Home Screen"</p>
                <p className="text-sm text-gray-600 mb-3">
                  Scroll down and tap this option
                </p>
                {/* Mock iPhone screenshot showing share menu */}
                <div className="bg-black rounded-lg p-2 w-40 mx-auto">
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-2">Share Menu</div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 p-1">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <div className="text-xs text-gray-700">Copy Link</div>
                      </div>
                      <div className="flex items-center space-x-2 p-1">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <div className="text-xs text-gray-700">AirDrop</div>
                      </div>
                      <div className="flex items-center space-x-2 p-1 bg-blue-50 rounded">
                        <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
                          <div className="text-white text-xs">+</div>
                        </div>
                        <div className="text-xs font-medium text-blue-800">
                          Add to Home Screen
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 p-1">
                        <div className="w-4 h-4 bg-gray-400 rounded"></div>
                        <div className="text-xs text-gray-700">More...</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                4
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">Tap "Add"</p>
                <p className="text-sm text-gray-600 mb-3">
                  The app icon will appear on your home screen
                </p>
                {/* Mock iPhone screenshot showing home screen with app icon */}
                <div className="bg-black rounded-lg p-2 w-36 mx-auto">
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-2">
                      iPhone Home Screen
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <div className="text-xs text-blue-600">📱</div>
                      </div>
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-xs text-gray-600">📧</div>
                      </div>
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-xs text-gray-600">🌐</div>
                      </div>
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center border-2 border-orange-300">
                        <div className="text-xs text-orange-600">🏈</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 text-center">
                      NFL Pick'em App
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              ✨ <strong>Pro Tip:</strong> Once added, it works like a native
              app with no browser bar!
            </p>
          </div>
        </div>
      ),
    },
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl">
              {steps[currentStep].title}
            </CardTitle>
            <CardDescription>{steps[currentStep].description}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[60vh]">
          {steps[currentStep].content}
        </CardContent>

        <div className="flex flex-col sm:flex-row items-center justify-between p-3 sm:p-4 border-t bg-gray-50 space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-center sm:justify-start">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center space-x-2 text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            {onSkip && (
              <Button
                variant="ghost"
                onClick={onSkip}
                className="text-sm text-gray-500"
              >
                Skip Tour
              </Button>
            )}
          </div>

          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep ? "bg-blue-600" : "bg-gray-300"
                }`}
              />
            ))}
          </div>

          <div className="w-full sm:w-auto flex justify-center sm:justify-end">
            {currentStep === steps.length - 1 ? (
              <Button
                onClick={onClose}
                className="flex items-center space-x-2 text-sm w-full sm:w-auto"
              >
                <span>Get Started</span>
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                className="flex items-center space-x-2 text-sm w-full sm:w-auto"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
