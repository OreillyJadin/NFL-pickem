"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PasswordResetModal } from "@/components/PasswordResetModal";

interface LoginFormProps {
  onToggleMode: () => void;
}

export function LoginForm({ onToggleMode }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
    }

    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md bg-gray-800 border-gray-600">
      <CardHeader>
        <CardTitle className="text-white">Sign In</CardTitle>
        <CardDescription className="text-gray-300">
          Enter your credentials to access your picks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-300">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
          </div>
          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-600 p-2 rounded">
              {error}
            </div>
          )}
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <div className="mt-4 text-center space-y-2">
          <button
            type="button"
            onClick={async () => {
              if (!email) {
                setError("Please enter your email address first");
                return;
              }
              setIsResetting(true);
              setError("");
              try {
                const { error } = await supabase.auth.resetPasswordForEmail(
                  email,
                  {
                    redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
                  }
                );
                if (error) throw error;
                alert("Password reset email sent! Check your inbox.");
              } catch (err: any) {
                setError(err.message || "Failed to send reset email");
              } finally {
                setIsResetting(false);
              }
            }}
            disabled={isResetting}
            className="text-sm text-gray-400 hover:text-gray-300 disabled:opacity-50"
          >
            {isResetting ? "Sending..." : "Forgot your password?"}
          </button>
          <div>
            <button
              type="button"
              onClick={onToggleMode}
              className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
            >
              Don&apos;t have an account? Sign up
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
