"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { TutorialModal } from "@/components/TutorialModal";
import { ProfileEditModal } from "@/components/ProfileEditModal";
import { supabase } from "@/lib/supabase";
import { getTeamColors, getTeamAbbreviation } from "@/lib/team-colors";
import { syncAllCurrentGames, syncGameScore } from "@/lib/game-sync";

interface Game {
  id: string;
  week: number;
  season: number;
  season_type: string;
  home_team: string;
  away_team: string;
  game_time: string;
  status: string;
  home_score?: number;
  away_score?: number;
  quarter?: number;
  espn_id?: string;
}

interface Pick {
  id: string;
  game_id: string;
  picked_team: string;
  is_lock: boolean;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedSeasonType, setSelectedSeasonType] = useState<
    "preseason" | "regular"
  >("regular");
  const [availableWeeks, setAvailableWeeks] = useState<
    { week: number; season_type: string; season: number }[]
  >([]);
  const [locksUsed, setLocksUsed] = useState<number>(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showProfileSuggestion, setShowProfileSuggestion] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    username?: string;
    bio?: string;
  } | null>(null);
  const [syncingScores, setSyncingScores] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const loadUserProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("bio, username")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setUserProfile(data);

        // Check if user needs profile suggestions
        const needsBio =
          !data.bio || data.bio === "this is my bio, I do not know ball.";
        const needsProfilePic = false; // Profile pics are handled via Supabase Storage

        if (needsBio || needsProfilePic) {
          // Randomly show suggestion (30% chance)
          const shouldShow = Math.random() < 0.3;
          if (shouldShow) {
            setShowProfileSuggestion(true);
          }
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  }, [user]);

  const loadAvailableWeeks = useCallback(async () => {
    try {
      const { data: weeksData, error } = await supabase
        .from("games")
        .select("week, season_type, season")
        .eq("season", 2025)
        .order("season_type", { ascending: true })
        .order("week", { ascending: true });

      if (!error && weeksData) {
        // Get unique week/season_type combinations
        const uniqueWeeks = weeksData.reduce((acc: any[], current) => {
          const exists = acc.find(
            (item) =>
              item.week === current.week &&
              item.season_type === current.season_type
          );
          if (!exists) {
            acc.push(current);
          }
          return acc;
        }, []);
        setAvailableWeeks(uniqueWeeks);
      }
    } catch (error) {
      console.error("Error loading available weeks:", error);
    }
  }, []);

  const loadGames = useCallback(async () => {
    try {
      setLoadingGames(true);

      // Load games for selected week and season type
      const { data: dbGames, error } = await supabase
        .from("games")
        .select("*")
        .eq("week", selectedWeek)
        .eq("season_type", selectedSeasonType)
        .eq("season", 2025)
        .order("game_time", { ascending: true });

      if (error || !dbGames || dbGames.length === 0) {
        // Fallback to mock data if no games in database
        if (selectedWeek === 1 && selectedSeasonType === "regular") {
          const response = await fetch("/data/week1.json");
          const data = await response.json();
          setGames(data.games);
        } else {
          setGames([]);
        }
      } else {
        setGames(dbGames);
      }
    } catch (error) {
      console.error("Error loading games:", error);
    } finally {
      setLoadingGames(false);
    }
  }, [selectedWeek, selectedSeasonType]);

  const loadPicks = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("picks")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      setPicks(data || []);
    } catch (error) {
      console.error("Error loading picks:", error);
    }
  }, [user]);

  const calculateLocksUsed = useCallback(() => {
    if (!games.length || !picks.length) {
      setLocksUsed(0);
      return;
    }

    const currentWeekLocks = picks.filter(
      (pick) => pick.is_lock && games.some((game) => game.id === pick.game_id)
    ).length;
    setLocksUsed(currentWeekLocks);
  }, [games, picks]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadAvailableWeeks();
    }
  }, [user, loadAvailableWeeks]);

  useEffect(() => {
    if (user) {
      loadGames();
      loadPicks();
    }
  }, [user, loadGames, loadPicks]);

  useEffect(() => {
    calculateLocksUsed();
  }, [calculateLocksUsed]);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user, loadUserProfile]);

  const handleProfileUpdate = useCallback(
    async (profileData: { username: string; bio: string }) => {
      if (!user) return;

      try {
        const { error } = await supabase
          .from("profiles")
          .update(profileData)
          .eq("id", user.id);

        if (error) throw error;

        // Reload profile data
        await loadUserProfile();
      } catch (error) {
        console.error("Error updating profile:", error);
      }
    },
    [user, loadUserProfile]
  );

  const handleSyncAllGames = async () => {
    setSyncingScores(true);
    setSyncMessage("");

    try {
      const result = await syncAllCurrentGames();
      setSyncMessage(result.message || "Sync completed");

      if (result.success) {
        // Reload games to show updated scores
        loadGames();
      }
    } catch (error) {
      setSyncMessage("Error syncing games");
      console.error("Sync error:", error);
    } finally {
      setSyncingScores(false);
    }
  };

  const handleSyncGame = async (gameId: string) => {
    setSyncingScores(true);
    setSyncMessage("");

    try {
      const result = await syncGameScore(gameId);
      setSyncMessage(
        result.success
          ? "Game synced successfully"
          : result.error || "Sync failed"
      );

      if (result.success) {
        // Reload games to show updated scores
        loadGames();
      }
    } catch (error) {
      setSyncMessage("Error syncing game");
      console.error("Sync error:", error);
    } finally {
      setSyncingScores(false);
    }
  };

  // Function to toggle lock status for existing picks
  const toggleLock = async (gameId: string) => {
    if (!user) return;

    const pick = picks.find((p) => p.game_id === gameId);
    if (!pick) return;

    const newLockStatus = !pick.is_lock;

    // Check if user is trying to add a lock but already used 3 locks
    if (newLockStatus && locksUsed >= 3) {
      alert("You can only use 3 locks per week!");
      return;
    }

    try {
      const { error } = await supabase
        .from("picks")
        .update({ is_lock: newLockStatus })
        .eq("user_id", user.id)
        .eq("game_id", gameId);

      if (error) throw error;

      // Update local state
      setPicks((prev) => {
        const newPicks = prev.map((p) =>
          p.game_id === gameId ? { ...p, is_lock: newLockStatus } : p
        );

        // Recalculate locks used
        const currentWeekLocks = newPicks.filter(
          (pick) =>
            pick.is_lock && games.some((game) => game.id === pick.game_id)
        ).length;
        setLocksUsed(currentWeekLocks);
        return newPicks;
      });
    } catch (error) {
      console.error("Error toggling lock:", error);
      alert("Error updating lock status. Please try again.");
    }
  };

  const makePick = async (
    gameId: string,
    team: string,
    isLock: boolean = false
  ) => {
    if (!user) return;

    // Check if user is trying to use a lock but already used 3 locks
    if (isLock && locksUsed >= 3) {
      alert("You can only use 3 locks per week!");
      return;
    }

    try {
      // First try to update existing pick
      const { data: existingPick, error: findError } = await supabase
        .from("picks")
        .select("id, is_lock")
        .eq("user_id", user.id)
        .eq("game_id", gameId)
        .single();

      if (findError && findError.code !== "PGRST116") {
        throw findError;
      }

      if (existingPick) {
        // Update existing pick
        const { error: updateError } = await supabase
          .from("picks")
          .update({ picked_team: team, is_lock: isLock })
          .eq("id", existingPick.id);

        if (updateError) throw updateError;
      } else {
        // Insert new pick
        const { error: insertError } = await supabase.from("picks").insert({
          user_id: user.id,
          game_id: gameId,
          picked_team: team,
          is_lock: isLock,
        });

        if (insertError) throw insertError;
      }

      // Update local state
      setPicks((prev) => {
        const existing = prev.find((p) => p.game_id === gameId);
        const newPicks = existing
          ? prev.map((p) =>
              p.game_id === gameId
                ? { ...p, picked_team: team, is_lock: isLock }
                : p
            )
          : [
              ...prev,
              { id: "", game_id: gameId, picked_team: team, is_lock: isLock },
            ];

        // Calculate locks count for current week
        const currentWeekLocks = newPicks.filter(
          (pick) =>
            pick.is_lock && games.some((game) => game.id === pick.game_id)
        ).length;
        setLocksUsed(currentWeekLocks);

        return newPicks;
      });
    } catch (error) {
      console.error("Error making pick:", error);
      alert("Error updating pick. Please try again.");
    }
  };

  const getPickForGame = (gameId: string) => {
    return picks.find((p) => p.game_id === gameId);
  };

  const isGameLocked = (gameTime: string) => {
    const now = new Date();
    const gameStart = new Date(gameTime);
    return now >= gameStart;
  };

  const formatGameTime = (gameTime: string) => {
    const date = new Date(gameTime);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow =
      date.toDateString() ===
      new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })}`;
    } else {
      return date.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      });
    }
  };

  if (loading || loadingGames) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {selectedSeasonType === "preseason"
              ? "Preseason"
              : "Regular Season"}{" "}
            Week {selectedWeek}
          </h1>
          <p className="text-gray-600">
            Make your picks for this week&apos;s games
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-gray-500">
              Current time: {new Date().toLocaleString()}
            </p>
            <Button
              onClick={() => setShowTutorial(true)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              📚 Help
            </Button>
          </div>
          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-800">
                  🔒 Locks Used:
                </span>
                <span className="text-lg font-bold text-blue-900">
                  {locksUsed}/3
                </span>
              </div>
              <div className="text-xs text-blue-600">
                Lock picks: +2 points if correct, -2 points if wrong
              </div>
            </div>
          </div>
        </div>

        {/* Week and Season Type Selector */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Season Type
              </label>
              <select
                value={selectedSeasonType}
                onChange={(e) =>
                  setSelectedSeasonType(
                    e.target.value as "preseason" | "regular"
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="regular">Regular Season</option>
                <option value="preseason">Preseason</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Week
              </label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableWeeks
                  .filter((w) => w.season_type === selectedSeasonType)
                  .map((week) => (
                    <option
                      key={`${week.season}-${week.season_type}-${week.week}`}
                      value={week.week}
                    >
                      Week {week.week}
                    </option>
                  ))}
              </select>
            </div>
            <div className="text-sm text-gray-500 sm:col-span-2 text-center">
              {games.length} games available
            </div>
          </div>
        </div>

        {/* Score Sync Controls */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-3">🔄 Sync Recent Games</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleSyncAllGames}
              disabled={syncingScores}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {syncingScores ? "Syncing..." : "🚀 Sync Recent Games"}
            </Button>
          </div>
          {syncMessage && (
            <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
              {syncMessage}
            </div>
          )}
        </div>

        <div className="grid gap-4">
          {games.map((game) => {
            const pick = getPickForGame(game.id);
            const locked = isGameLocked(game.game_time);

            return (
              <Card key={game.id} className={locked ? "opacity-75" : ""}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {pick?.is_lock && (
                        <span className="text-yellow-600" title="Locked Pick">
                          🔒
                        </span>
                      )}
                      {game.away_team} @ {game.home_team}
                    </CardTitle>
                    <div className="text-sm text-gray-500">
                      {formatGameTime(game.game_time)}
                    </div>
                  </div>
                  {locked ? (
                    <CardDescription className="text-red-600">
                      Game locked - picks no longer accepted
                    </CardDescription>
                  ) : pick ? (
                    <CardDescription className="text-green-600">
                      You can change your pick until the game starts
                    </CardDescription>
                  ) : (
                    <CardDescription className="text-blue-600">
                      Make your pick - you can change it until the game starts
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {game.status === "completed" ? (
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-4 mb-4">
                          {/* Away Team Score */}
                          <div className="flex items-center gap-2">
                            <div
                              className="px-3 py-1 rounded text-sm font-bold text-white"
                              style={{
                                backgroundColor: getTeamColors(game.away_team)
                                  .primary,
                              }}
                            >
                              {getTeamAbbreviation(game.away_team)}
                            </div>
                            <span className="text-2xl font-bold">
                              {game.away_score || 0}
                            </span>
                          </div>

                          <div className="text-gray-400 text-xl">@</div>

                          {/* Home Team Score */}
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold">
                              {game.home_score || 0}
                            </span>
                            <div
                              className="px-3 py-1 rounded text-sm font-bold text-white"
                              style={{
                                backgroundColor: getTeamColors(game.home_team)
                                  .primary,
                              }}
                            >
                              {getTeamAbbreviation(game.home_team)}
                            </div>
                          </div>
                        </div>
                        {pick && (
                          <div className="space-y-2">
                            <div
                              className={`text-lg font-semibold flex items-center justify-center gap-2 ${
                                (pick.picked_team === game.away_team &&
                                  (game.away_score || 0) >
                                    (game.home_score || 0)) ||
                                (pick.picked_team === game.home_team &&
                                  (game.home_score || 0) >
                                    (game.away_score || 0))
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {pick.is_lock && (
                                <span className="text-yellow-600">🔒</span>
                              )}
                              {pick.picked_team} -{" "}
                              {(pick.picked_team === game.away_team &&
                                (game.away_score || 0) >
                                  (game.home_score || 0)) ||
                              (pick.picked_team === game.home_team &&
                                (game.home_score || 0) > (game.away_score || 0))
                                ? "WIN"
                                : "LOSS"}
                            </div>
                            {pick.is_lock && (
                              <div className="flex items-center justify-center gap-1 text-sm font-medium text-yellow-600">
                                🔒 LOCKED PICK
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : game.status === "in_progress" ? (
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600 mb-2">
                          <span className="inline-flex items-center">
                            <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                            LIVE: {game.away_team} {game.away_score || 0} -{" "}
                            {game.home_team} {game.home_score || 0}
                          </span>
                        </div>
                        {game.quarter && (
                          <div className="text-sm text-blue-500 font-medium">
                            Q{game.quarter}
                          </div>
                        )}
                        {pick && (
                          <div className="space-y-1">
                            <div className="text-sm text-blue-600 font-medium flex items-center justify-center gap-2">
                              {pick.is_lock && (
                                <span className="text-yellow-600">🔒</span>
                              )}
                              Your pick: {pick.picked_team}
                            </div>
                            {pick.is_lock && (
                              <div className="text-xs text-yellow-600 font-medium">
                                🔒 LOCKED
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center mb-4">
                        <div className="text-lg font-semibold text-gray-700">
                          {formatGameTime(game.game_time)}
                        </div>
                        {(() => {
                          const gameTime = new Date(game.game_time).getTime();
                          const now = new Date().getTime();
                          const minutesUntilStart = Math.floor(
                            (gameTime - now) / (1000 * 60)
                          );

                          if (minutesUntilStart <= 0) {
                            // Game has started, show current score
                            return (
                              <div className="text-sm text-blue-600 font-medium">
                                <span className="inline-flex items-center">
                                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                                  LIVE: {game.away_team} {game.away_score || 0}{" "}
                                  - {game.home_team} {game.home_score || 0}
                                  {game.quarter && (
                                    <span className="ml-2">
                                      Q{game.quarter}
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          } else {
                            // Game hasn't started, show countdown
                            return (
                              <div className="text-sm text-gray-500">
                                Game starts in {minutesUntilStart} minutes
                              </div>
                            );
                          }
                        })()}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Away Team Button */}
                        <button
                          onClick={() =>
                            !locked && makePick(game.id, game.away_team, false)
                          }
                          disabled={locked}
                          className={`
                            relative p-4 rounded-lg border-2 transition-all duration-200 transform hover:scale-105
                            ${
                              locked
                                ? "opacity-50 cursor-not-allowed"
                                : "cursor-pointer hover:shadow-lg"
                            }
                            ${
                              pick?.picked_team === game.away_team
                                ? "ring-2 ring-offset-2 ring-blue-500 shadow-lg scale-105"
                                : "hover:shadow-md"
                            }
                          `}
                          style={{
                            backgroundColor:
                              pick?.picked_team === game.away_team
                                ? getTeamColors(game.away_team).primary
                                : "white",
                            borderColor: getTeamColors(game.away_team).border,
                            color:
                              pick?.picked_team === game.away_team
                                ? getTeamColors(game.away_team).text
                                : getTeamColors(game.away_team).primary,
                          }}
                        >
                          <div className="text-center">
                            <div className="text-xs font-bold text-gray-500 mb-1">
                              {getTeamAbbreviation(game.away_team)}
                            </div>
                            <div className="font-semibold text-sm">
                              {game.away_team}
                            </div>
                            {pick?.picked_team === game.away_team && (
                              <div className="mt-2 text-lg">✓</div>
                            )}
                          </div>
                        </button>

                        {/* Home Team Button */}
                        <button
                          onClick={() =>
                            !locked && makePick(game.id, game.home_team, false)
                          }
                          disabled={locked}
                          className={`
                            relative p-4 rounded-lg border-2 transition-all duration-200 transform hover:scale-105
                            ${
                              locked
                                ? "opacity-50 cursor-not-allowed"
                                : "cursor-pointer hover:shadow-lg"
                            }
                            ${
                              pick?.picked_team === game.home_team
                                ? "ring-2 ring-offset-2 ring-blue-500 shadow-lg scale-105"
                                : "hover:shadow-md"
                            }
                          `}
                          style={{
                            backgroundColor:
                              pick?.picked_team === game.home_team
                                ? getTeamColors(game.home_team).primary
                                : "white",
                            borderColor: getTeamColors(game.home_team).border,
                            color:
                              pick?.picked_team === game.home_team
                                ? getTeamColors(game.home_team).text
                                : getTeamColors(game.home_team).primary,
                          }}
                        >
                          <div className="text-center">
                            <div className="text-xs font-bold text-gray-500 mb-1">
                              {getTeamAbbreviation(game.home_team)}
                            </div>
                            <div className="font-semibold text-sm">
                              {game.home_team}
                            </div>
                            {pick?.picked_team === game.home_team && (
                              <div className="mt-2 text-lg">✓</div>
                            )}
                          </div>
                        </button>
                      </div>

                      {/* Lock Toggle */}
                      {pick && !locked && (
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => toggleLock(game.id)}
                            disabled={!pick.picked_team || locked}
                            className={`
                              flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-200
                              ${
                                pick.is_lock
                                  ? "bg-red-100 border-red-300 text-red-700 hover:bg-red-200"
                                  : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
                              }
                              ${
                                !pick.picked_team || locked
                                  ? "opacity-50 cursor-not-allowed"
                                  : "cursor-pointer"
                              }
                            `}
                          >
                            <span className="text-lg">
                              {pick.is_lock ? "🔒" : "🔓"}
                            </span>
                            <span className="text-sm font-medium">
                              {pick.is_lock ? "Remove Lock" : "Lock This Pick"}
                            </span>
                          </button>
                        </div>
                      )}
                      {pick && !locked && (
                        <p className="text-xs text-gray-500 text-center">
                          Click either team to change your pick
                        </p>
                      )}
                      {pick && (
                        <p className="text-sm text-gray-600 text-center">
                          Your pick:{" "}
                          <span className="font-semibold">
                            {pick.picked_team}
                          </span>
                          {pick.is_lock && (
                            <span className="ml-2 text-red-600 font-bold">
                              🔒 LOCKED
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Make your picks before game time. Once a game starts, your pick is
            locked.
          </p>
        </div>
      </div>

      <TutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onSkip={() => setShowTutorial(false)}
      />

      {/* Profile Suggestion Popup */}
      {showProfileSuggestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                🎨 Complete Your Profile!
              </CardTitle>
              <CardDescription>
                Make your profile stand out on the leaderboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  {!userProfile?.bio && (
                    <>Add a bio to tell others about yourself!</>
                  )}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => {
                    setShowProfileSuggestion(false);
                    setShowProfileEdit(true);
                  }}
                  className="px-6 py-3 text-base font-semibold"
                  size="lg"
                >
                  ✏️ Edit Profile
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowProfileSuggestion(false)}
                  className="flex-1"
                >
                  Maybe Later
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ProfileEditModal
        isOpen={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
        onSave={handleProfileUpdate}
        currentProfile={userProfile || {}}
      />
    </div>
  );
}
