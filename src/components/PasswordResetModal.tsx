"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lock, Eye, EyeOff } from "lucide-react";

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  mode?: "reset" | "change"; // "reset" for forgot password, "change" for logged-in users
}

export function PasswordResetModal({
  isOpen,
  onClose,
  userEmail,
  mode = "reset", // default to reset mode for backward compatibility
}: PasswordResetModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handlePasswordAction = async () => {
    if (mode === "change" && newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let error;

      if (mode === "change") {
        // Direct password change for logged-in users
        const result = await supabase.auth.updateUser({
          password: newPassword,
        });
        error = result.error;
      } else {
        // Password reset email for non-logged-in users
        const result = await supabase.auth.resetPasswordForEmail(userEmail, {
          redirectTo: `${window.location.origin}/auth/callback`,
        });
        error = result.error;
      }

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        setNewPassword("");
      }
    } catch (err) {
      setError(
        mode === "change"
          ? "Failed to update password"
          : "Failed to send reset email"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setError("");
    setNewPassword("");
    setShowPassword(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {mode === "change" ? "Change Password" : "Reset Password"}
          </DialogTitle>
          <DialogDescription>
            {mode === "change"
              ? "Enter your new password below"
              : "We'll send you a password reset link"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {mode === "change" ? "Password Updated" : "Check Your Email"}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {mode === "change"
                  ? "Your password has been successfully changed"
                  : `We've sent a password reset link to ${userEmail}`}
              </p>
              <Button onClick={handleClose}>Close</Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userEmail}
                  disabled
                  className="bg-gray-100 text-gray-600"
                />
                <p className="text-xs text-gray-500">
                  {mode === "change"
                    ? "This is your account email"
                    : "Password reset link will be sent to this email"}
                </p>
              </div>

              {mode === "change" && (
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Password must be at least 6 characters long
                  </p>
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button onClick={handlePasswordAction} disabled={loading}>
                  {loading
                    ? mode === "change"
                      ? "Updating..."
                      : "Sending..."
                    : mode === "change"
                    ? "Update Password"
                    : "Send Reset Link"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
