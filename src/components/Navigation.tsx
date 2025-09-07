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
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-gray-900">
              NFL Pick&apos;em
            </h1>
            <div className="hidden md:flex space-x-4">
              <Button
                variant={pathname === "/dashboard" ? "default" : "ghost"}
                onClick={() => router.push("/dashboard")}
                className="text-sm"
              >
                Dashboard
              </Button>
              <Button
                variant={pathname === "/profile" ? "default" : "ghost"}
                onClick={() => router.push("/profile")}
                className="text-sm"
              >
                Profile
              </Button>
              <Button
                variant={pathname === "/leaderboard" ? "default" : "ghost"}
                onClick={() => router.push("/leaderboard")}
                className="text-sm"
              >
                Leaderboard
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="hidden sm:block text-sm text-gray-600">
              {user.email}
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="md:hidden pb-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={pathname === "/dashboard" ? "default" : "outline"}
              onClick={() => router.push("/dashboard")}
              size="sm"
              className="text-xs"
            >
              📊 Dashboard
            </Button>
            <Button
              variant={pathname === "/leaderboard" ? "default" : "outline"}
              onClick={() => router.push("/leaderboard")}
              size="sm"
              className="text-xs"
            >
              🏆 Leaderboard
            </Button>
            <Button
              variant={pathname === "/profile" ? "default" : "outline"}
              onClick={() => router.push("/profile")}
              size="sm"
              className="text-xs"
            >
              👤 Profile
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
