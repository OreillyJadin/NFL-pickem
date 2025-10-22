import { supabase } from "@/config/supabase";

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param bucket - The storage bucket name
 * @param path - The path where to store the file (e.g., 'user-id/filename.jpg')
 * @returns Promise<UploadResult>
 */
export async function uploadFile(
  file: File,
  bucket: string,
  path: string
): Promise<UploadResult> {
  try {
    // Upload the file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true, // Replace existing file with same name
      });

    if (error) {
      console.error("Storage upload error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Delete a file from Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The path of the file to delete
 * @returns Promise<boolean>
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error("Storage delete error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Delete error:", error);
    return false;
  }
}

/**
 * Upload a profile picture
 * @param file - The image file
 * @param userId - The user's ID
 * @returns Promise<UploadResult>
 */
export async function uploadProfilePicture(
  file: File,
  userId: string
): Promise<UploadResult> {
  // Use consistent filename for each user (avatar.jpg)
  // This allows us to easily retrieve it later
  const fileExtension = file.name.split(".").pop() || "jpg";
  const fileName = `avatar.${fileExtension}`;
  const path = `${userId}/${fileName}`;

  return uploadFile(file, "profile-pictures", path);
}

/**
 * Get the public URL for a profile picture
 * @param userId - The user's ID
 * @returns Promise<string | null>
 */
export async function getProfilePictureUrl(
  userId: string
): Promise<string | null> {
  try {
    // List files in the user's folder to find the avatar
    const { data: files, error } = await supabase.storage
      .from("profile-pictures")
      .list(userId, {
        limit: 10,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      console.error("Error listing profile pictures:", error);
      return null;
    }

    // Find the avatar file (look for both new format 'avatar.*' and old format 'avatar-*')
    const avatarFile = files?.find(
      (file) =>
        file.name.startsWith("avatar.") || file.name.startsWith("avatar-")
    );

    if (!avatarFile) {
      return null;
    }

    // Get the public URL
    const { data } = supabase.storage
      .from("profile-pictures")
      .getPublicUrl(`${userId}/${avatarFile.name}`);

    return data.publicUrl;
  } catch (error) {
    console.error("Error getting profile picture URL:", error);
    return null;
  }
}
