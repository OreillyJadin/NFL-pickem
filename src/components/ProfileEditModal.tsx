"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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
  onSave: (profileData: {
    display_name: string;
    bio: string;
    profile_pic_url: string;
  }) => void;
  currentProfile: {
    display_name?: string;
    bio?: string;
    profile_pic_url?: string;
  };
}

export function ProfileEditModal({
  isOpen,
  onClose,
  onSave,
  currentProfile,
}: ProfileEditModalProps) {
  const [displayName, setDisplayName] = useState(
    currentProfile.display_name || ""
  );
  const [bio, setBio] = useState(currentProfile.bio || "");
  const [profilePicUrl, setProfilePicUrl] = useState(
    currentProfile.profile_pic_url || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  const handleSave = async () => {
    setLoading(true);
    setError("");

    try {
      let finalProfilePicUrl = profilePicUrl.trim();

      // If a file was selected, convert it to a data URL
      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          onSave({
            display_name: displayName.trim(),
            bio: bio.trim(),
            profile_pic_url: dataUrl,
          });
          onClose();
        };
        reader.onerror = () => {
          setError("Failed to process image");
          setLoading(false);
        };
        reader.readAsDataURL(selectedFile);
        return;
      }

      // If no file selected, save with current URL
      onSave({
        display_name: displayName.trim(),
        bio: bio.trim(),
        profile_pic_url: finalProfilePicUrl,
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

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB");
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
                    alt="Profile"
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
                  Upload a photo from your device (max 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              type="text"
              placeholder="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
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
