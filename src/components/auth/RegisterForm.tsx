"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { uploadProfilePicture } from "@/lib/storage";
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

interface RegisterFormProps {
  onToggleMode: () => void;
}

export function RegisterForm({ onToggleMode }: RegisterFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profilePicUrl, setProfilePicUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const { signUp } = useAuth();

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameError("");
      return;
    }

    setCheckingUsername(true);
    setUsernameError("");

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "not found" error, which means username is available
        throw error;
      }

      if (data) {
        setUsernameError(
          "Username already exists. Please choose a different one."
        );
      }
    } catch (error) {
      console.error("Error checking username:", error);
      setUsernameError("Error checking username availability");
    } finally {
      setCheckingUsername(false);
    }
  };

  // Debounced username check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username]);

  const validatePasswords = () => {
    // Only validate if both fields have content
    if (password && confirmPassword) {
      if (password !== confirmPassword) {
        setPasswordError("Passwords do not match");
        return false;
      } else {
        setPasswordError("");
        return true;
      }
    }

    // If either field is empty, clear error and allow (validation happens on submit)
    setPasswordError("");
    return true;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      // Validate file size (50MB max for Supabase Storage)
      if (file.size > 50 * 1024 * 1024) {
        setError("Image must be smaller than 50MB");
        return;
      }

      setSelectedFile(file);
      setError("");

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setProfilePicUrl(previewUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (usernameError) {
      setError("Please fix the username error before submitting");
      return;
    }

    // Check if passwords are provided and match
    if (!password || !confirmPassword) {
      setError("Please enter both password and confirm password");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!validatePasswords()) {
      setError("Please fix the password error before submitting");
      return;
    }

    setLoading(true);
    setError("");

    // Upload profile picture to Supabase Storage if selected
    let finalProfilePicUrl = profilePicUrl || undefined;

    if (selectedFile) {
      // First create the user account
      const { error: signupError } = await signUp(
        email,
        password,
        username,
        bio || undefined
      );

      if (signupError) {
        setError(signupError.message);
        setLoading(false);
        return;
      }

      // Get the newly created user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Failed to get user after signup");
        setLoading(false);
        return;
      }

      // Upload the profile picture
      const uploadResult = await uploadProfilePicture(selectedFile, user.id);

      if (uploadResult.success) {
        // Update the profile with the uploaded image URL
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ profile_pic_url: uploadResult.url })
          .eq("id", user.id);

        if (updateError) {
          console.error(
            "Failed to update profile with image URL:",
            updateError
          );
        }
      } else {
        console.error("Failed to upload profile picture:", uploadResult.error);
      }

      setSuccess(true);
      setLoading(false);
      return;
    }

    // No file selected, proceed with normal signup
    const { error } = await signUp(email, password, username, bio || undefined);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }

    setLoading(false);
  };

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            We&apos;ve sent you a confirmation link. Please check your email and
            click the link to complete your registration.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign Up</CardTitle>
        <CardDescription>
          Create your account to start making picks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className={usernameError ? "border-red-500" : ""}
                minLength={3}
              />
              {checkingUsername && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
            {usernameError && (
              <p className="text-sm text-red-600">{usernameError}</p>
            )}
            {!usernameError && username.length >= 3 && !checkingUsername && (
              <p className="text-sm text-green-600">✓ Username available</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                validatePasswords();
              }}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                validatePasswords();
              }}
              required
              minLength={6}
              className={passwordError ? "border-red-500" : ""}
            />
            {passwordError && (
              <p className="text-sm text-red-600">{passwordError}</p>
            )}
            {!passwordError &&
              password &&
              confirmPassword &&
              password === confirmPassword && (
                <p className="text-sm text-green-600">✓ Passwords match</p>
              )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio (Optional)</Label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              maxLength={200}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500">{bio.length}/200 characters</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profilePic">Profile Picture (Optional)</Label>
            <input
              id="profilePic"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {profilePicUrl && (
              <div className="mt-2">
                <img
                  src={profilePicUrl}
                  alt="Profile preview"
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Preview of selected image
                </p>
              </div>
            )}
            <p className="text-xs text-gray-500">
              You can add a profile picture later if you prefer
            </p>
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={
              loading || !!usernameError || checkingUsername || !!passwordError
            }
          >
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onToggleMode}
            className="text-sm text-blue-600 hover:underline"
          >
            Already have an account? Sign in
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
