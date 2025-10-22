import { AwardModel } from "@/models/AwardModel";
import { Award } from "@/types/database";

export class AwardController {
  /**
   * Process automatic awards for completed weeks
   * This uses the existing auto-awards service
   */
  static async processAwards(): Promise<{
    success: boolean;
    awardsCreated: number;
    message: string;
  }> {
    try {
      // Import the auto-awards service
      const { processAutoAwards } = await import("@/services/auto-awards");

      const result = await processAutoAwards();

      return {
        success: true,
        awardsCreated: result.awardsCreated || 0,
        message: result.message || "Awards processed successfully",
      };
    } catch (error) {
      console.error("Error processing awards:", error);
      return {
        success: false,
        awardsCreated: 0,
        message:
          error instanceof Error ? error.message : "Failed to process awards",
      };
    }
  }

  /**
   * Get all awards for a user
   */
  static async getUserAwards(userId: string): Promise<Award[]> {
    return await AwardModel.findByUser(userId);
  }

  /**
   * Get awards for a specific week
   */
  static async getWeekAwards(
    week: number,
    season: number = 2025,
    seasonType: string = "regular"
  ): Promise<Award[]> {
    return await AwardModel.findByWeek(week, season, seasonType);
  }

  /**
   * Check if a user has a specific award
   */
  static async hasAward(
    userId: string,
    week: number,
    season: number,
    seasonType: string,
    awardType: Award["award_type"]
  ): Promise<boolean> {
    return await AwardModel.exists(userId, week, season, seasonType, awardType);
  }

  /**
   * Delete awards for a week (for re-processing)
   */
  static async deleteWeekAwards(
    week: number,
    season: number = 2025,
    seasonType: string = "regular"
  ): Promise<boolean> {
    return await AwardModel.deleteForWeek(week, season, seasonType);
  }

  /**
   * Get award display name
   */
  static getAwardDisplayName(awardType: Award["award_type"]): string {
    const displayNames: Record<Award["award_type"], string> = {
      top_scorer: "Top Scorer",
      second_scorer: "Second Place",
      third_scorer: "Third Place",
      lowest_scorer: "Cold Streak",
      perfect_week: "Perfect Week",
      cold_week: "Ice Cold",
    };

    return displayNames[awardType] || awardType;
  }

  /**
   * Get award emoji
   */
  static getAwardEmoji(awardType: Award["award_type"]): string {
    const emojis: Record<Award["award_type"], string> = {
      top_scorer: "🏆",
      second_scorer: "🥈",
      third_scorer: "🥉",
      lowest_scorer: "❄️",
      perfect_week: "💎",
      cold_week: "🧊",
    };

    return emojis[awardType] || "🏅";
  }
}
