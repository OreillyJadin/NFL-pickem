"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Lock,
  Star,
  Check,
  X,
  User,
  Edit,
  Unlock,
  RefreshCw,
  BookOpen,
  Rocket,
} from "lucide-react";
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
import { getProfilePictureUrl } from "@/lib/storage";
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
  time_remaining?: string;
  possession?: string;
  halftime?: boolean;
  espn_id?: string;
  tv?: string;
}

interface Pick {
  id: string;
  game_id: string;
  picked_team: string;
  is_lock: boolean;
  solo_pick?: boolean;
  solo_lock?: boolean;
  super_bonus?: boolean;
  bonus_points?: number;
  pick_points?: number;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);

  // Custom sort function for games: in_progress > scheduled > completed, then by game_time
  const sortGames = (games: Game[]) => {
    return games.sort((a, b) => {
      // Define status priority: in_progress = 1, scheduled = 2, completed = 3
      const getStatusPriority = (status: string) => {
        switch (status) {
          case "in_progress":
            return 1;
          case "scheduled":
            return 2;
          case "completed":
            return 3;
          default:
            return 4;
        }
      };

      const statusDiff =
        getStatusPriority(a.status) - getStatusPriority(b.status);
      if (statusDiff !== 0) {
        return statusDiff;
      }

      // If same status, sort by game time
      return new Date(a.game_time).getTime() - new Date(b.game_time).getTime();
    });
  };
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  // Function to calculate current NFL week
  const getCurrentNFLWeek = () => {
    const now = new Date();
    const seasonStart = new Date(2025, 8, 4); // September 4, 2025
    if (now < seasonStart) return 1;

    const diffTime = now.getTime() - seasonStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const currentWeek = Math.floor(diffDays / 7) + 1;

    return Math.min(Math.max(currentWeek, 1), 18); // Keep between week 1 and 18
  };

  const [selectedWeek, setSelectedWeek] = useState<number>(getCurrentNFLWeek());
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
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    null
  );
  const [syncingScores, setSyncingScores] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [teamRecords, setTeamRecords] = useState<
    Record<string, { wins: number; losses: number }>
  >({});

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

        // Load profile picture from storage
        const pictureUrl = await getProfilePictureUrl(user.id);
        setProfilePictureUrl(pictureUrl);

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

  const loadTeamRecords = useCallback(async () => {
    try {
      const { data: completedGames, error } = await supabase
        .from("games")
        .select("home_team, away_team, home_score, away_score, status")
        .eq("season", 2025)
        .eq("status", "completed");

      if (error) {
        console.error("Error loading team records:", error);
        return;
      }

      const records: Record<string, { wins: number; losses: number }> = {};

      completedGames?.forEach((game) => {
        const homeTeam = game.home_team;
        const awayTeam = game.away_team;
        const homeScore = game.home_score || 0;
        const awayScore = game.away_score || 0;

        // Initialize teams if not already in records
        if (!records[homeTeam]) {
          records[homeTeam] = { wins: 0, losses: 0 };
        }
        if (!records[awayTeam]) {
          records[awayTeam] = { wins: 0, losses: 0 };
        }

        // Determine winner and update records
        if (homeScore > awayScore) {
          records[homeTeam].wins += 1;
          records[awayTeam].losses += 1;
        } else if (awayScore > homeScore) {
          records[awayTeam].wins += 1;
          records[homeTeam].losses += 1;
        }
        // Ties are not counted in wins/losses for now
      });

      setTeamRecords(records);
    } catch (error) {
      console.error("Error loading team records:", error);
    }
  }, []);

  const loadGames = useCallback(async () => {
    try {
      setLoadingGames(true);

      // Load all games for selected week and season type
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
          setGames(sortGames(data.games));
        } else {
          setGames([]);
        }
      } else {
        setGames(sortGames(dbGames));
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

  const calculateLocksUsed = useCallback(async () => {
    if (!user) {
      setLocksUsed(0);
      return;
    }

    try {
      // Get all picks for the current week from database (not just visible games)
      const { data: weekPicks, error } = await supabase
        .from("picks")
        .select(
          `
          is_lock,
          game:games!inner(
            week,
            season_type,
            season
          )
        `
        )
        .eq("user_id", user.id)
        .eq("games.week", selectedWeek)
        .eq("games.season_type", selectedSeasonType)
        .eq("games.season", 2025);

      if (error) {
        console.error("Error loading week picks:", error);
        setLocksUsed(0);
        return;
      }

      const currentWeekLocks =
        weekPicks?.filter((pick) => pick.is_lock).length || 0;

      console.log(`Week ${selectedWeek} (${selectedSeasonType}) locks:`, {
        totalPicks: weekPicks?.length || 0,
        lockedPicks: currentWeekLocks,
        weekPicks: weekPicks?.map((p: any) => ({
          gameId: p.game_id,
          isLock: p.is_lock,
          gameWeek: p.game?.week,
          gameSeasonType: p.game?.season_type,
        })),
      });

      setLocksUsed(currentWeekLocks);
    } catch (error) {
      console.error("Error calculating locks used:", error);
      setLocksUsed(0);
    }
  }, [user, selectedWeek, selectedSeasonType]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadAvailableWeeks();
      loadTeamRecords();
    }
  }, [user, loadAvailableWeeks, loadTeamRecords]);

  useEffect(() => {
    if (user) {
      loadGames();
      loadPicks();
    }
  }, [user, loadGames, loadPicks]);

  useEffect(() => {
    calculateLocksUsed();
  }, [calculateLocksUsed]);

  // Recalculate locks when week or season type changes
  useEffect(() => {
    if (user) {
      calculateLocksUsed();
    }
  }, [selectedWeek, selectedSeasonType, calculateLocksUsed]);

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
        // Reload picks to show updated points
        loadPicks();
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
        // Reload picks to show updated points
        loadPicks();
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

        // Recalculate locks used from database
        calculateLocksUsed();
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

        // Recalculate locks count for current week from database
        calculateLocksUsed();

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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />

      {/* Welcome Message and New Feature Announcement */}
      <div className="text-center py-6 px-4">
        <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 text-blue-300 font-semibold mb-2">
            <Star className="w-5 h-5" />
            <span>New Feature: Bonus Points!</span>
          </div>
          <p className="text-blue-200 text-sm">
            Starting Week 3, earn bonus points for unique picks:
            <span className="block mt-2 space-y-1">
              <span className="block">
                • Solo Pick (+2): Only person to pick a team correctly
              </span>
              <span className="block">
                • Solo Lock (+2): Only person to lock a team correctly
              </span>
              <span className="block">
                • Super Bonus (+5): Only pick AND lock on a correct pick
              </span>
            </span>
          </p>
        </div>
      </div>

      {/* Horizontal Scrollable Week Selector - Top of Page */}
      <div className="bg-gray-800 rounded-none overflow-hidden mb-2">
        <div className="flex overflow-x-auto scrollbar-hide week-selector-scroll py-2 px-2 cursor-grab active:cursor-grabbing">
          {availableWeeks
            .filter((w) => w.season_type === "regular")
            .sort((a, b) => a.week - b.week)
            .map((week) => {
              const isSelected = week.week === selectedWeek;

              // Calculate week dates for regular season (starts September 4, 2025)
              const regularStart = new Date(2025, 8, 4); // September 4, 2025
              const weekStart = new Date(
                regularStart.getTime() +
                  (week.week - 1) * 7 * 24 * 60 * 60 * 1000
              );
              const weekEnd = new Date(
                weekStart.getTime() + 6 * 24 * 60 * 60 * 1000
              );

              const formatDate = (date: Date) => {
                return date
                  .toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                  .toUpperCase();
              };

              return (
                <button
                  key={`${week.season}-${week.season_type}-${week.week}`}
                  data-week={week.week}
                  onClick={() => setSelectedWeek(week.week)}
                  className={`flex-shrink-0 px-4 py-2 mx-1 rounded-lg transition-all duration-200 scroll-snap-align-start ${
                    isSelected
                      ? "bg-gray-700 text-white"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                  }`}
                  style={{ scrollSnapAlign: "start" }}
                >
                  <div className="text-center">
                    <div
                      className={`text-sm font-medium ${
                        isSelected ? "font-bold text-white" : "text-gray-400"
                      }`}
                    >
                      WEEK {week.week}
                    </div>
                    <div
                      className={`text-xs ${
                        isSelected ? "font-bold text-white" : "text-gray-500"
                      }`}
                    >
                      {formatDate(weekStart)}-{formatDate(weekEnd)}
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      <div className="w-full">
        <div className="mb-2 px-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                className="text-sm px-4 py-2 border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700"
              >
                <span className="flex items-center gap-1">
                  <Lock className="w-4 h-4" />
                  Locks: {locksUsed}/3
                </span>
              </Button>
              <Button
                onClick={handleSyncAllGames}
                disabled={syncingScores}
                size="sm"
                className="bg-green-700 hover:bg-green-800 text-white text-sm px-4 py-2"
              >
                <span className="flex items-center gap-2">
                  {syncingScores ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Rocket className="w-4 h-4" />
                  )}
                  {syncingScores ? "Syncing..." : "Sync Games"}
                </span>
              </Button>
              <Button
                onClick={() => setShowTutorial(true)}
                variant="outline"
                size="sm"
                className="text-sm px-4 py-2 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Help
                </span>
              </Button>
            </div>
          </div>
        </div>

        {syncMessage && (
          <div className="mb-6 px-4">
            <div className="p-3 bg-gray-800 rounded-lg border border-gray-600">
              <div className="text-sm text-gray-300">{syncMessage}</div>
            </div>
          </div>
        )}

        <div className="space-y-0">
          {games.map((game, index) => {
            const pick = getPickForGame(game.id);
            const locked = isGameLocked(game.game_time);

            // Helper function to render solo status stars
            const renderSoloStars = (pick: Pick) => {
              if (!pick.solo_pick && !pick.solo_lock && !pick.super_bonus)
                return null;

              return (
                <div className="flex items-center gap-1 ml-2">
                  {pick.super_bonus ? (
                    // Two stars for super bonus
                    <>
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    </>
                  ) : (
                    // One star for solo pick or solo lock
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  )}
                </div>
              );
            };

            // Use the pre-calculated total_points from the database
            const getPickTotalPoints = (pick: Pick, game: Game) => {
              if (
                game.status !== "completed" ||
                game.home_score === null ||
                game.away_score === null
              ) {
                return 0;
              }
              return pick.pick_points || 0;
            };

            // Determine game result for display
            const getGameResult = (game: Game, pick: Pick) => {
              if (
                game.status !== "completed" ||
                game.home_score === null ||
                game.away_score === null
              ) {
                return { type: "pending", points: 0 };
              }

              // Check for tie first
              if (game.home_score === game.away_score) {
                return { type: "tie", points: pick.pick_points || 0 };
              }

              // Determine winner
              const winner =
                (game.home_score || 0) > (game.away_score || 0)
                  ? game.home_team
                  : game.away_team;
              const isCorrect = pick.picked_team === winner;
              const points = pick.pick_points || 0;

              return {
                type: isCorrect ? "win" : "loss",
                points: points,
              };
            };

            return (
              <div
                key={game.id}
                className={`${
                  locked ? "opacity-75" : ""
                } bg-gray-900 border-t border-gray-600 ${
                  index === 0 ? "rounded-t-lg" : ""
                } ${index === games.length - 1 ? "rounded-b-lg" : ""}`}
              >
                <div className="p-4">
                  <div className="text-white">
                    {/* Team Matchup Section */}
                    <div className="flex items-center justify-between mb-2">
                      {/* Left Side - Team Info */}
                      <div className="flex-1">
                        {/* Away Team */}
                        <div className="flex items-center gap-3 mb-1">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                            style={{
                              backgroundColor: getTeamColors(game.away_team)
                                .primary,
                            }}
                          >
                            {getTeamAbbreviation(game.away_team)}
                          </div>
                          <div className="flex-1">
                            <div className="text-md font-bold text-white flex items-center gap-2">
                              {game.away_team.split(" ").pop()}
                              {(game.status === "in_progress" ||
                                game.status === "completed") && (
                                <span className="text-lg font-bold text-blue-400">
                                  {game.away_score || 0}
                                </span>
                              )}
                              {game.possession &&
                                game.possession ===
                                  getTeamAbbreviation(game.away_team) && (
                                  <span className="text-lg">🏈</span>
                                )}
                            </div>
                          </div>
                          <div className="text-sm text-gray-400 mr-2">
                            {teamRecords[game.away_team]
                              ? `${teamRecords[game.away_team].wins}-${
                                  teamRecords[game.away_team].losses
                                }`
                              : "0-0"}
                          </div>
                          {game.status === "scheduled" && (
                            <button
                              onClick={() =>
                                !locked &&
                                makePick(game.id, game.away_team, false)
                              }
                              disabled={locked}
                              className={`
                                px-3 py-1 rounded text-xs font-medium transition-all duration-200
                                ${
                                  locked
                                    ? "opacity-50 cursor-not-allowed"
                                    : "cursor-pointer hover:bg-gray-700"
                                }
                                ${
                                  pick?.picked_team === game.away_team
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                }
                              `}
                            >
                              Pick
                            </button>
                          )}
                        </div>

                        {/* @ Symbol with Line */}
                        <div className="flex items-center justify-center mb-1">
                          <span className="text-gray-400 text-lg mr-2">@</span>
                          <div className="flex-1 h-px bg-gray-600"></div>
                        </div>

                        {/* Home Team */}
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                            style={{
                              backgroundColor: getTeamColors(game.home_team)
                                .primary,
                            }}
                          >
                            {getTeamAbbreviation(game.home_team)}
                          </div>
                          <div className="flex-1">
                            <div className="text-md font-bold text-white flex items-center gap-2">
                              {game.home_team.split(" ").pop()}
                              {(game.status === "in_progress" ||
                                game.status === "completed") && (
                                <span className="text-lg font-bold text-blue-400">
                                  {game.home_score || 0}
                                </span>
                              )}
                              {game.possession &&
                                game.possession ===
                                  getTeamAbbreviation(game.home_team) && (
                                  <span className="text-lg">🏈</span>
                                )}
                            </div>
                          </div>
                          <div className="text-sm text-gray-400 mr-2">
                            {teamRecords[game.home_team]
                              ? `${teamRecords[game.home_team].wins}-${
                                  teamRecords[game.home_team].losses
                                }`
                              : "0-0"}
                          </div>
                          {game.status === "scheduled" && (
                            <button
                              onClick={() =>
                                !locked &&
                                makePick(game.id, game.home_team, false)
                              }
                              disabled={locked}
                              className={`
                                px-3 py-1 rounded text-xs font-medium transition-all duration-200
                                ${
                                  locked
                                    ? "opacity-50 cursor-not-allowed"
                                    : "cursor-pointer hover:bg-gray-700"
                                }
                                ${
                                  pick?.picked_team === game.home_team
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                }
                              `}
                            >
                              Pick
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Right Side - Game Details */}
                      <div className="ml-6 text-right">
                        {game.status === "in_progress" ? (
                          <>
                            <div className="text-sm font-bold text-blue-400 mb-1 flex items-center justify-end">
                              <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                              LIVE
                            </div>
                            {game.halftime && (
                              <div className="text-sm font-bold text-orange-400 mb-1 text-right">
                                HALF
                              </div>
                            )}
                            <div className="text-sm font-medium text-blue-300 mb-1">
                              {game.halftime ? (
                                ""
                              ) : (
                                <>
                                  {game.quarter
                                    ? game.quarter <= 4
                                      ? `Q${game.quarter}`
                                      : game.quarter === 5
                                      ? "OT"
                                      : `${game.quarter - 4}OT`
                                    : ""}
                                  {game.time_remaining &&
                                    ` ${game.time_remaining}`}
                                </>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">
                              {game.tv || "TBD"}
                            </div>
                          </>
                        ) : game.status === "completed" ? (
                          <>
                            <div className="text-sm font-bold text-green-400 mb-1">
                              FINAL
                            </div>
                            <div className="text-sm text-gray-400 mb-1">
                              {new Date(game.game_time).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "short",
                                  month: "numeric",
                                  day: "numeric",
                                }
                              )}
                            </div>
                            <div className="text-sm text-gray-400">
                              {game.tv || "TBD"}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-sm text-gray-400 mb-1">
                              {new Date(game.game_time).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "short",
                                  month: "numeric",
                                  day: "numeric",
                                }
                              )}
                            </div>
                            <div className="text-sm text-gray-400 mb-1">
                              {new Date(game.game_time).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                }
                              )}
                            </div>
                            <div className="text-sm text-gray-400">
                              {game.tv || "TBD"}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Game Status and Pick Info */}
                    {game.status === "in_progress" ? (
                      <div className="text-center">
                        {pick && (
                          <div className="space-y-1">
                            <div className="text-sm text-blue-300 font-medium flex items-center justify-center gap-2">
                              {pick.is_lock && (
                                <Lock className="w-4 h-4 text-yellow-400" />
                              )}
                              Your pick: {pick.picked_team}
                              {renderSoloStars(pick)}
                            </div>
                            {pick.is_lock && (
                              <div className="text-xs text-yellow-400 font-medium flex items-center justify-center gap-1">
                                <Lock className="w-3 h-3" />
                                LOCKED
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : game.status === "completed" ? (
                      <div className="text-center">
                        {pick && (
                          <div className="space-y-1">
                            <div className="text-sm text-blue-300 font-medium flex items-center justify-center gap-2">
                              {pick.is_lock && (
                                <Lock className="w-4 h-4 text-yellow-400" />
                              )}
                              Your pick: {pick.picked_team}
                              {renderSoloStars(pick)}
                            </div>
                            <div className="flex justify-center">
                              {(() => {
                                const result = getGameResult(game, pick);
                                return (
                                  <span
                                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                      result.type === "tie"
                                        ? "bg-gray-600 text-gray-100"
                                        : result.type === "win"
                                        ? "bg-green-600 text-green-100"
                                        : "bg-red-600 text-red-100"
                                    }`}
                                  >
                                    {result.type === "tie" ? (
                                      <>
                                        TIE
                                        <span className="ml-1 text-gray-200 font-bold">
                                          +{result.points}
                                        </span>
                                      </>
                                    ) : result.type === "win" ? (
                                      <>
                                        <Check className="w-3 h-3 mr-1" />
                                        WIN
                                        <span className="ml-1 text-green-200 font-bold">
                                          +{result.points}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <X className="w-3 h-3 mr-1" />
                                        LOSS
                                        <span className="ml-1 text-red-200 font-bold">
                                          {result.points}
                                        </span>
                                      </>
                                    )}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">
                        {pick && (
                          <div className="space-y-2">
                            <div className="text-sm text-blue-300 flex items-center">
                              {pick.is_lock && (
                                <Lock className="w-3 h-3 text-yellow-400 mr-1" />
                              )}
                              Picked: {pick.picked_team.split(" ").pop()}
                            </div>
                            {!locked && (
                              <button
                                onClick={() => toggleLock(game.id)}
                                disabled={!pick.picked_team || locked}
                                className={`
                                  flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-all duration-200 mx-auto
                                  ${
                                    pick.is_lock
                                      ? "bg-red-700 text-white hover:bg-red-800"
                                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                  }
                                  ${
                                    !pick.picked_team || locked
                                      ? "opacity-50 cursor-not-allowed"
                                      : "cursor-pointer"
                                  }
                                `}
                              >
                                <span className="text-sm">
                                  {pick.is_lock ? (
                                    <Lock className="w-4 h-4" />
                                  ) : (
                                    <Unlock className="w-4 h-4" />
                                  )}
                                </span>
                                <span>
                                  {pick.is_lock ? "Remove Lock" : "Lock Pick"}
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 px-4 text-center">
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
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {profilePictureUrl ? (
                    <img
                      src={profilePictureUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={() => setProfilePictureUrl(null)}
                    />
                  ) : (
                    <User className="h-8 w-8 text-gray-400" />
                  )}
                </div>
              </div>
              <CardTitle className="text-xl">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Complete Your Profile!
                </span>
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
                  <span className="flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Profile
                  </span>
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
