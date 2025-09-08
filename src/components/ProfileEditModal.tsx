"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  uploadProfilePicture,
  deleteFile,
  getProfilePictureUrl,
} from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, Upload, User } from "lucide-react";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profileData: { username: string; bio: string }) => void;
  currentProfile: {
    username?: string;
    bio?: string;
  };
}

export function ProfileEditModal({
  isOpen,
  onClose,
  onSave,
  currentProfile,
}: ProfileEditModalProps) {
  const [username, setUsername] = useState(currentProfile.username || "");
  const [bio, setBio] = useState(currentProfile.bio || "");
  const [profilePicUrl, setProfilePicUrl] = useState("");
  const [currentProfilePicUrl, setCurrentProfilePicUrl] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [passwordResetMessage, setPasswordResetMessage] = useState("");

  // Load current profile picture when modal opens
  useEffect(() => {
    const loadCurrentProfilePicture = async () => {
      if (isOpen) {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const currentPicUrl = await getProfilePictureUrl(user.id);
            setCurrentProfilePicUrl(currentPicUrl);
          }
        } catch (error) {
          console.error("Error loading current profile picture:", error);
        }
      }
    };

    loadCurrentProfilePicture();
  }, [isOpen]);

  // Cleanup object URL when component unmounts or URL changes
  useEffect(() => {
    return () => {
      if (profilePicUrl && profilePicUrl.startsWith("blob:")) {
        URL.revokeObjectURL(profilePicUrl);
      }
    };
  }, [profilePicUrl]);

  // Reset file input when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById(
        "file-upload"
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    }
  }, [isOpen]);

  const handlePasswordReset = async () => {
    setPasswordResetLoading(true);
    setPasswordResetMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        (await supabase.auth.getUser()).data.user?.email || "",
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) throw error;

      setPasswordResetMessage("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      setPasswordResetMessage(
        error.message || "Failed to send password reset email"
      );
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");

    try {
      let finalProfilePicUrl = profilePicUrl.trim();

      // If a file was selected, upload to Supabase Storage
      if (selectedFile) {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("User not authenticated");
          setLoading(false);
          return;
        }

        // Upload the file to Supabase Storage
        const uploadResult = await uploadProfilePicture(selectedFile, user.id);

        if (!uploadResult.success) {
          setError(uploadResult.error || "Failed to upload image");
          setLoading(false);
          return;
        }

        // Delete old profile picture if it exists and is from storage
        if (profilePicUrl && profilePicUrl.includes("supabase")) {
          const oldPath = profilePicUrl.split("/").slice(-2).join("/"); // Get user-id/filename
          await deleteFile("profile-pictures", oldPath);
        }

        finalProfilePicUrl = uploadResult.url!;
      }

      // Save profile
      onSave({
        username: username.trim(),
        bio: bio.trim(),
      });
      onClose();
    } catch (err) {
      setError("Failed to save profile changes");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Check file size (max 50MB for Supabase Storage)
    if (file.size > 50 * 1024 * 1024) {
      setError("Image must be smaller than 50MB");
      return;
    }

    try {
      // Clean up previous object URL if it exists
      if (profilePicUrl && profilePicUrl.startsWith("blob:")) {
        URL.revokeObjectURL(profilePicUrl);
      }

      // Store the file and create a preview URL
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setProfilePicUrl(previewUrl);
      setError("");
    } catch (err) {
      setError("Failed to process image");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit Profile
          </DialogTitle>
          <DialogDescription>
            Update your display name, bio, and profile picture
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Profile Picture */}
          <div className="space-y-2">
            <Label htmlFor="profile-pic">Profile Picture</Label>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                {profilePicUrl ? (
                  <img
                    src={profilePicUrl}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                ) : currentProfilePicUrl ? (
                  <img
                    src={currentProfilePicUrl}
                    alt="Current profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex space-x-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById("file-upload")?.click()
                    }
                    className="flex-1 flex items-center gap-1"
                  >
                    <Upload className="h-4 w-4" />
                    Choose Photo
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Upload a photo from your device (max 50MB)
                </p>
              </div>
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
            />
            <p className="text-xs text-gray-500">
              This will be shown on the leaderboard
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself..."
              value={bio}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setBio(e.target.value)
              }
              maxLength={200}
              rows={3}
            />
            <p className="text-xs text-gray-500">{bio.length}/200 characters</p>
          </div>

          {/* Password Reset */}
          <div className="space-y-2">
            <Label>Password Reset</Label>
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPasswordReset(!showPasswordReset)}
                className="w-full"
              >
                🔒 Password Reset
              </Button>

              {showPasswordReset && (
                <div className="space-y-2 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600">
                    Send a password reset link to your email address
                  </p>
                  <Button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={passwordResetLoading}
                    className="w-full"
                    variant="destructive"
                  >
                    {passwordResetLoading ? "Sending..." : "Send Reset Email"}
                  </Button>
                  {passwordResetMessage && (
                    <p
                      className={`text-sm ${
                        passwordResetMessage.includes("sent")
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {passwordResetMessage}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
