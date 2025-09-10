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
      title: "Making Picks",
      description: "How to select your teams",
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-blue-900/20 rounded-lg border border-blue-600">
            <Target className="h-6 w-6 text-blue-400" />
            <div>
              <h3 className="font-semibold text-white">Regular Picks</h3>
              <p className="text-sm text-gray-300">
                +1 point for correct, 0 for wrong
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-4 bg-yellow-900/20 rounded-lg border border-yellow-600">
            <Lock className="h-6 w-6 text-yellow-400" />
            <div>
              <h3 className="font-semibold text-white">Lock Picks</h3>
              <p className="text-sm text-gray-300">
                +2 points for correct, -2 for wrong (max 3 per week)
              </p>
            </div>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-600">
            <p className="text-sm text-gray-300">
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
          <div className="flex items-center space-x-3 p-4 bg-green-900/20 rounded-lg border border-green-600">
            <Trophy className="h-6 w-6 text-green-400" />
            <div>
              <h3 className="font-semibold text-white">Leaderboard</h3>
              <p className="text-sm text-gray-300">
                See how you rank against other players
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-800 rounded-lg text-center border border-gray-600">
              <div className="text-2xl font-bold text-blue-400">W/L</div>
              <p className="text-xs text-gray-300">Win/Loss Record</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg text-center border border-gray-600">
              <div className="text-2xl font-bold text-green-400">PTS</div>
              <p className="text-xs text-gray-300">Total Points</p>
            </div>
          </div>
          <div className="p-4 bg-yellow-900/20 rounded-lg border border-yellow-600">
            <p className="text-sm text-gray-300 mb-3">
              🏆 <strong>Weekly Awards:</strong> Earn trophies for perfect
              weeks, top scores, and more!
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-800 p-2 rounded border border-gray-600">
                <div className="font-semibold text-yellow-300">
                  🏆 Top Scorer
                </div>
                <div className="text-gray-300">Highest points</div>
              </div>
              <div className="bg-gray-800 p-2 rounded border border-gray-600">
                <div className="font-semibold text-yellow-300">
                  🥶 Lowest Scorer
                </div>
                <div className="text-gray-300">Lowest points</div>
              </div>
              <div className="bg-gray-800 p-2 rounded border border-gray-600">
                <div className="font-semibold text-yellow-300">
                  💯 Perfect Week
                </div>
                <div className="text-gray-300">All picks correct</div>
              </div>
              <div className="bg-gray-800 p-2 rounded border border-gray-600">
                <div className="font-semibold text-yellow-300">
                  🧊 Cold Week
                </div>
                <div className="text-gray-300">All picks wrong</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Add to Home Screen",
      description: "Get quick access to Who Knows Ball? on your iPhone",
      content: (
        <div className="text-center space-y-6">
          <p className="text-lg text-gray-300 mb-6">
            Add Who Knows Ball? to your home screen for easy access!
          </p>

          <div className="flex justify-center space-x-10">
            {/* Step 1 */}
            <div className="text-center">
              <div className="relative mb-4">
                <div className="w-40 h-72 bg-gray-800 rounded-2xl p-3 mx-auto">
                  <div className="w-full h-full bg-white rounded-xl relative overflow-hidden">
                    {/* iPhone notch */}
                    <div className="w-20 h-8 bg-gray-800 rounded-b-2xl mx-auto"></div>

                    {/* Browser content */}
                    <div className="p-2 space-y-2">
                      {/* Address bar */}
                      <div className="bg-blue-100 rounded-lg p-2 text-xs">
                        {/* EDIT THIS: Browser text size - change text-xs to text-sm, text-base, etc. */}
                        www.WhoKnowsBall.app
                      </div>

                      {/* Content area */}
                      <div className="bg-gray-100 rounded-lg h-20"></div>

                      {/* Bottom navigation */}
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-8">
                        <div className="w-6 h-6 bg-gray-300 rounded"></div>
                        <div className="relative">
                          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              {/* EDIT THIS: Upload icon - simple arrow pointing up */}
                              <path
                                d="M10 3 L10 13 M6 7 L10 3 L14 7"
                                stroke="white"
                                strokeWidth="2"
                                fill="none"
                              />
                            </svg>
                          </div>
                          {/* EDIT THIS: Red circle around share button - change -inset-2 and border-2 to make bigger/smaller */}
                          <div className="absolute -inset-2 border-2 border-red-500 rounded-full animate-pulse"></div>
                        </div>
                        <div className="w-6 h-6 bg-gray-300 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-300">
                Step 1: Tap the Share icon
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="relative mb-4">
                <div className="w-40 h-72 bg-gray-800 rounded-2xl p-3 mx-auto">
                  <div className="w-full h-full bg-white rounded-xl relative overflow-hidden">
                    {/* iPhone notch */}
                    <div className="w-20 h-8 bg-gray-800 rounded-b-2xl mx-auto"></div>

                    {/* Share sheet overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-end">
                      <div className="w-full bg-white rounded-t-2xl p-2 space-y-1">
                        <div className="h-1 w-8 bg-gray-300 rounded mx-auto"></div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded">
                            <div className="w-5 h-5 bg-gray-300 rounded"></div>
                            {/* EDIT THIS: Menu text size - change text-xs to text-sm, text-base, etc. */}
                            <span className="text-xs">Add to Favorites</span>
                          </div>
                          <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                            <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                              <svg
                                className="w-3 h-3 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                              </svg>
                            </div>
                            {/* EDIT THIS: "Add to Home Screen" text size - change text-xs to text-sm, text-base, etc. */}
                            <span className="text-xs font-semibold text-blue-600">
                              Add to Home Screen
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded">
                            <div className="w-5 h-5 bg-gray-300 rounded"></div>
                            <span className="text-xs">Find on Page</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-300">
                Step 2: Select "Add to Home Screen"
              </p>
            </div>
          </div>

          <div className="bg-blue-900/20 rounded-lg p-4 mt-6 border border-blue-600">
            <p className="text-sm text-blue-300">
              💡 <strong>Pro tip:</strong> This will add Who Knows Ball? to your
              home screen like a IOS app!
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
      <Card className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden bg-gray-800 border-gray-600">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl text-white">
              {steps[currentStep].title}
            </CardTitle>
            <CardDescription className="text-gray-300">
              {steps[currentStep].description}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-300 hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[60vh]">
          {steps[currentStep].content}
        </CardContent>

        <div className="flex flex-col sm:flex-row items-center justify-between p-3 sm:p-4 border-t border-gray-600 bg-gray-800 space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-center sm:justify-start">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center space-x-2 text-sm border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            {onSkip && (
              <Button
                variant="ghost"
                onClick={onSkip}
                className="text-sm text-gray-400 hover:bg-gray-700"
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
                  index === currentStep ? "bg-blue-400" : "bg-gray-600"
                }`}
              />
            ))}
          </div>

          <div className="w-full sm:w-auto flex justify-center sm:justify-end">
            {currentStep === steps.length - 1 ? (
              <Button
                onClick={onClose}
                className="flex items-center space-x-2 text-sm w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
              >
                <span>Get Started</span>
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                className="flex items-center space-x-2 text-sm w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
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
