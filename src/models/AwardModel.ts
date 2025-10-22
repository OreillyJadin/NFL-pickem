import { supabase } from "@/config/supabase";
import { Award, CreateAwardInput } from "@/types/database";

export class AwardModel {
  /**
   * Find all awards for a user
   */
  static async findByUser(userId: string): Promise<Award[]> {
    const { data, error } = await supabase
      .from("awards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching awards by user:", error);
      return [];
    }

    return data as Award[];
  }

  /**
   * Find awards for a specific week
   */
  static async findByWeek(
    week: number,
    season: number = 2025,
    seasonType: string = "regular"
  ): Promise<Award[]> {
    const { data, error } = await supabase
      .from("awards")
      .select("*")
      .eq("week", week)
      .eq("season", season)
      .eq("season_type", seasonType)
      .order("award_type", { ascending: true });

    if (error) {
      console.error("Error fetching awards by week:", error);
      return [];
    }

    return data as Award[];
  }

  /**
   * Create a new award
   */
  static async create(data: CreateAwardInput): Promise<Award | null> {
    const { data: newAward, error } = await supabase
      .from("awards")
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error("Error creating award:", error);
      return null;
    }

    return newAward as Award;
  }

  /**
   * Check if award already exists
   */
  static async exists(
    userId: string,
    week: number,
    season: number,
    seasonType: string,
    awardType: Award["award_type"]
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from("awards")
      .select("id")
      .eq("user_id", userId)
      .eq("week", week)
      .eq("season", season)
      .eq("season_type", seasonType)
      .eq("award_type", awardType)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return false;
      }
      console.error("Error checking award existence:", error);
      return false;
    }

    return !!data;
  }

  /**
   * Delete awards for a specific week (used when re-processing)
   */
  static async deleteForWeek(
    week: number,
    season: number = 2025,
    seasonType: string = "regular"
  ): Promise<boolean> {
    const { error } = await supabase
      .from("awards")
      .delete()
      .eq("week", week)
      .eq("season", season)
      .eq("season_type", seasonType);

    if (error) {
      console.error("Error deleting awards for week:", error);
      return false;
    }

    return true;
  }
}
