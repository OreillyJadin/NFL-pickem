import { supabase } from "./supabase";
import { processWeeklyAwards } from "./awards";

/**
 * Check if all games for a specific week are completed
 */
export async function checkWeekCompletion(
  week: number,
  seasonType: string,
  season: number = 2025
): Promise<{
  allCompleted: boolean;
  totalGames: number;
  completedGames: number;
}> {
  try {
    const { data: games, error } = await supabase
      .from("games")
      .select("id, status")
      .eq("week", week)
      .eq("season_type", seasonType)
      .eq("season", season);

    if (error) {
      console.error("Error checking week completion:", error);
      return { allCompleted: false, totalGames: 0, completedGames: 0 };
    }

    if (!games || games.length === 0) {
      return { allCompleted: false, totalGames: 0, completedGames: 0 };
    }

    const completedGames = games.filter(
      (game) => game.status === "completed"
    ).length;
    const allCompleted = completedGames === games.length;

    return {
      allCompleted,
      totalGames: games.length,
      completedGames,
    };
  } catch (error) {
    console.error("Error checking week completion:", error);
    return { allCompleted: false, totalGames: 0, completedGames: 0 };
  }
}

/**
 * Check if weekly awards have already been processed for a specific week
 */
export async function checkAwardsProcessed(
  week: number,
  seasonType: string,
  season: number = 2025
): Promise<boolean> {
  try {
    const { data: awards, error } = await supabase
      .from("awards")
      .select("id")
      .eq("week", week)
      .eq("season_type", seasonType)
      .eq("season", season)
      .limit(1);

    if (error) {
      console.error("Error checking awards processed:", error);
      return false;
    }

    return awards && awards.length > 0;
  } catch (error) {
    console.error("Error checking awards processed:", error);
    return false;
  }
}

/**
 * Automatically process weekly awards for completed weeks
 * This function should be called periodically to check for completed weeks
 */
export async function processCompletedWeeks(): Promise<{
  success: boolean;
  processedWeeks: Array<{
    week: number;
    seasonType: string;
    season: number;
    awardsCreated: number;
  }>;
  message: string;
}> {
  try {
    console.log("Checking for completed weeks to process awards...");

    // Get all unique week/season combinations from games
    const { data: weekData, error: weekError } = await supabase
      .from("games")
      .select("week, season_type, season")
      .eq("season", 2025)
      .order("season_type", { ascending: true })
      .order("week", { ascending: true });

    if (weekError || !weekData) {
      throw new Error("Failed to fetch week data");
    }

    // Get unique week/season combinations
    const uniqueWeeks = weekData.reduce((acc: any[], current) => {
      const exists = acc.find(
        (item) =>
          item.week === current.week &&
          item.season_type === current.season_type &&
          item.season === current.season
      );
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);

    const processedWeeks: Array<{
      week: number;
      seasonType: string;
      season: number;
      awardsCreated: number;
    }> = [];

    // Check each week
    for (const weekInfo of uniqueWeeks) {
      const { week, season_type, season } = weekInfo;

      // Check if all games are completed
      const completionStatus = await checkWeekCompletion(
        week,
        season_type,
        season
      );

      if (!completionStatus.allCompleted) {
        console.log(
          `Week ${week} (${season_type}) not completed: ${completionStatus.completedGames}/${completionStatus.totalGames} games`
        );
        continue;
      }

      // Check if awards already processed
      const awardsProcessed = await checkAwardsProcessed(
        week,
        season_type,
        season
      );

      if (awardsProcessed) {
        console.log(`Week ${week} (${season_type}) awards already processed`);
        continue;
      }

      // Process awards for this week
      console.log(`Processing awards for Week ${week} (${season_type})...`);

      try {
        const awardsResult = await processWeeklyAwards(
          week,
          season_type,
          season
        );

        if (awardsResult.success) {
          processedWeeks.push({
            week,
            seasonType: season_type,
            season,
            awardsCreated: awardsResult.awardsCreated || 0,
          });
          console.log(
            `Successfully processed ${
              awardsResult.awardsCreated || 0
            } awards for Week ${week} (${season_type})`
          );
        } else {
          console.error(
            `Failed to process awards for Week ${week} (${season_type}):`,
            awardsResult.error
          );
        }
      } catch (error) {
        console.error(
          `Error processing awards for Week ${week} (${season_type}):`,
          error
        );
      }
    }

    const message =
      processedWeeks.length > 0
        ? `Processed awards for ${processedWeeks.length} completed weeks`
        : "No completed weeks found that need award processing";

    return {
      success: true,
      processedWeeks,
      message,
    };
  } catch (error) {
    console.error("Error processing completed weeks:", error);
    return {
      success: false,
      processedWeeks: [],
      message: `Error processing completed weeks: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Get the next available week after the current one
 */
export async function getNextAvailableWeek(
  currentWeek: number,
  currentSeasonType: string,
  season: number = 2025
): Promise<{
  nextWeek: number | null;
  nextSeasonType: string | null;
  hasNextWeek: boolean;
}> {
  try {
    // Get all available weeks for the current season
    const { data: weeksData, error } = await supabase
      .from("games")
      .select("week, season_type")
      .eq("season", season)
      .order("season_type", { ascending: true })
      .order("week", { ascending: true });

    if (error || !weeksData) {
      return { nextWeek: null, nextSeasonType: null, hasNextWeek: false };
    }

    // Get unique week/season combinations
    const uniqueWeeks = weeksData.reduce((acc: any[], current) => {
      const exists = acc.find(
        (item) =>
          item.week === current.week && item.season_type === current.season_type
      );
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);

    // Find the next week after current
    const currentIndex = uniqueWeeks.findIndex(
      (w) => w.week === currentWeek && w.season_type === currentSeasonType
    );

    if (currentIndex === -1 || currentIndex >= uniqueWeeks.length - 1) {
      return { nextWeek: null, nextSeasonType: null, hasNextWeek: false };
    }

    const nextWeekInfo = uniqueWeeks[currentIndex + 1];
    return {
      nextWeek: nextWeekInfo.week,
      nextSeasonType: nextWeekInfo.season_type,
      hasNextWeek: true,
    };
  } catch (error) {
    console.error("Error getting next available week:", error);
    return { nextWeek: null, nextSeasonType: null, hasNextWeek: false };
  }
}

/**
 * Get current week completion status for dashboard display
 */
export async function getCurrentWeekStatus(
  week: number,
  seasonType: string,
  season: number = 2025
): Promise<{
  totalGames: number;
  completedGames: number;
  pendingGames: number;
  allCompleted: boolean;
  awardsProcessed: boolean;
  nextWeek: number | null;
  nextSeasonType: string | null;
  hasNextWeek: boolean;
}> {
  try {
    const completionStatus = await checkWeekCompletion(
      week,
      seasonType,
      season
    );
    const awardsProcessed = await checkAwardsProcessed(
      week,
      seasonType,
      season
    );
    const nextWeekInfo = await getNextAvailableWeek(week, seasonType, season);

    return {
      totalGames: completionStatus.totalGames,
      completedGames: completionStatus.completedGames,
      pendingGames:
        completionStatus.totalGames - completionStatus.completedGames,
      allCompleted: completionStatus.allCompleted,
      awardsProcessed,
      nextWeek: nextWeekInfo.nextWeek,
      nextSeasonType: nextWeekInfo.nextSeasonType,
      hasNextWeek: nextWeekInfo.hasNextWeek,
    };
  } catch (error) {
    console.error("Error getting current week status:", error);
    return {
      totalGames: 0,
      completedGames: 0,
      pendingGames: 0,
      allCompleted: false,
      awardsProcessed: false,
      nextWeek: null,
      nextSeasonType: null,
      hasNextWeek: false,
    };
  }
}
