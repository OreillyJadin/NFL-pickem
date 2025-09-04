import { supabase } from "./supabase";

// Admin functions for managing user picks
export async function getAllUsers() {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, email")
      .order("username", { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getUserPicks(
  userId: string,
  week?: number,
  seasonType?: string
) {
  try {
    let query = supabase
      .from("picks")
      .select(
        `
        *,
        games!inner(week, season_type, season, home_team, away_team, game_time, home_score, away_score, status)
      `
      )
      .eq("user_id", userId);

    if (week) query = query.eq("games.week", week);
    if (seasonType) query = query.eq("games.season_type", seasonType);

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateUserPick(pickId: string, newPickedTeam: string) {
  try {
    const { data, error } = await supabase
      .from("picks")
      .update({ picked_team: newPickedTeam })
      .eq("id", pickId)
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createUserPick(
  userId: string,
  gameId: string,
  pickedTeam: string
) {
  try {
    // First check if pick already exists
    const { data: existingPick, error: findError } = await supabase
      .from("picks")
      .select("id")
      .eq("user_id", userId)
      .eq("game_id", gameId)
      .single();

    if (findError && findError.code !== "PGRST116") {
      throw findError;
    }

    if (existingPick) {
      // Update existing pick
      const { data, error } = await supabase
        .from("picks")
        .update({ picked_team: pickedTeam })
        .eq("id", existingPick.id)
        .select();

      if (error) throw error;
      return { data, error: null };
    } else {
      // Insert new pick
      const { data, error } = await supabase
        .from("picks")
        .insert({ user_id: userId, game_id: gameId, picked_team: pickedTeam })
        .select();

      if (error) throw error;
      return { data, error: null };
    }
  } catch (error) {
    return { data: null, error };
  }
}

export async function deleteUserPick(pickId: string) {
  try {
    const { data, error } = await supabase
      .from("picks")
      .delete()
      .eq("id", pickId)
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
