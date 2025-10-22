import { supabase } from "@/config/supabase";
import { User, UpdateUserInput } from "@/types/database";

export class UserModel {
  /**
   * Find a user by ID
   */
  static async findById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching user by ID:", error);
      return null;
    }

    return data as User;
  }

  /**
   * Find a user by username
   */
  static async findByUsername(username: string): Promise<User | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      console.error("Error fetching user by username:", error);
      return null;
    }

    return data as User;
  }

  /**
   * Find all users
   */
  static async findAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, email")
      .order("username", { ascending: true });

    if (error) {
      console.error("Error fetching all users:", error);
      return [];
    }

    return data as User[];
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    id: string,
    data: UpdateUserInput
  ): Promise<User | null> {
    const { data: updatedUser, error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }

    return updatedUser as User;
  }

  /**
   * Check if username is available
   */
  static async isUsernameAvailable(
    username: string,
    excludeUserId?: string
  ): Promise<boolean> {
    let query = supabase.from("profiles").select("id").eq("username", username);

    if (excludeUserId) {
      query = query.neq("id", excludeUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error checking username availability:", error);
      return false;
    }

    return data.length === 0;
  }
}
