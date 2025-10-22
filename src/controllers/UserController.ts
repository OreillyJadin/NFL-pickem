import { UserModel } from "@/models/UserModel";
import { User, UpdateUserInput } from "@/types/database";

export class UserController {
  /**
   * Get user by ID
   */
  static async getUser(userId: string): Promise<User | null> {
    return await UserModel.findById(userId);
  }

  /**
   * Get user by username
   */
  static async getUserByUsername(username: string): Promise<User | null> {
    return await UserModel.findByUsername(username);
  }

  /**
   * Get all users (for leaderboard, etc.)
   */
  static async getAllUsers(): Promise<User[]> {
    return await UserModel.findAll();
  }

  /**
   * Update user profile with validation
   */
  static async updateProfile(
    userId: string,
    updates: UpdateUserInput
  ): Promise<User> {
    // Validate username if being updated
    if (updates.username) {
      // Check username format
      if (!/^[a-zA-Z0-9_-]{3,20}$/.test(updates.username)) {
        throw new Error(
          "Username must be 3-20 characters and contain only letters, numbers, underscores, and hyphens"
        );
      }

      // Check if username is available
      const isAvailable = await UserModel.isUsernameAvailable(
        updates.username,
        userId
      );
      if (!isAvailable) {
        throw new Error("Username is already taken");
      }
    }

    // Validate bio length
    if (updates.bio && updates.bio.length > 500) {
      throw new Error("Bio must be 500 characters or less");
    }

    // Update profile
    const updatedUser = await UserModel.updateProfile(userId, updates);
    if (!updatedUser) {
      throw new Error("Failed to update profile");
    }

    return updatedUser;
  }

  /**
   * Check if username is available
   */
  static async isUsernameAvailable(
    username: string,
    excludeUserId?: string
  ): Promise<boolean> {
    return await UserModel.isUsernameAvailable(username, excludeUserId);
  }

  /**
   * Format user display name
   */
  static formatDisplayName(user: User): string {
    return user.username || user.email.split("@")[0];
  }

  /**
   * Get user initials for avatar
   */
  static getUserInitials(user: User): string {
    const name = user.username || user.email;
    const parts = name.split(/[\s_-]+/);

    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    return name.substring(0, 2).toUpperCase();
  }
}
