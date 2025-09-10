"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export function Navigation() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <nav className="bg-gray-800 shadow-sm border-b border-gray-600">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-white">Who Knows Ball?</h1>
            <div className="hidden md:flex space-x-1">
              <button
                onClick={() => router.push("/dashboard")}
                className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                  pathname === "/dashboard"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push("/profile")}
                className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                  pathname === "/profile"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => router.push("/leaderboard")}
                className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                  pathname === "/leaderboard"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                }`}
              >
                Leaderboard
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="hidden sm:block text-sm text-gray-300">
              {user.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="md:hidden pb-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => router.push("/dashboard")}
              className={`px-3 py-2 rounded-lg transition-all duration-200 text-xs font-medium ${
                pathname === "/dashboard"
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-700 border border-gray-600"
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => router.push("/leaderboard")}
              className={`px-3 py-2 rounded-lg transition-all duration-200 text-xs font-medium ${
                pathname === "/leaderboard"
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-700 border border-gray-600"
              }`}
            >
              🏆 Leaderboard
            </button>
            <button
              onClick={() => router.push("/profile")}
              className={`px-3 py-2 rounded-lg transition-all duration-200 text-xs font-medium ${
                pathname === "/profile"
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-700 border border-gray-600"
              }`}
            >
              👤 Profile
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
