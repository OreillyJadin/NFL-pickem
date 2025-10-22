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

import { Navigation } from "@/components/Navigation";
import { supabase } from "@/lib/supabase";
import { Lock, Trophy, Check, X, Star, Unlock } from "lucide-react";
import { getProfilePictureUrl } from "@/services/storage";
import { getUserAwards, getAwardDisplay } from "@/services/awards";
import { Award } from "@/lib/supabase";
import { getTeamColors, getTeamAbbreviation } from "@/services/team-colors";
import { ProfileEditModal } from "@/components/ProfileEditModal";
import { Button } from "@/components/ui/button";
import { Edit, User } from "lucide-react";

interface UserStats {
  totalPicks: number;
  correctPicks: number;
  incorrectPicks: number;
  winPercentage: number;
  lockPicks: number;
  lockWins: number;
  lockLosses: number;
  lockWinPercentage: number;
}

interface PickHistory {
  id: string;
  game_id: string;
  picked_team: string;
  is_lock: boolean;
  created_at: string;
  solo_pick?: boolean;
  solo_lock?: boolean;
  super_bonus?: boolean;
  bonus_points?: number;
  pick_points?: number;
  game: {
    home_team: string;
    away_team: string;
    home_score?: number;
    away_score?: number;
    status: string;
    game_time: string;
  };
}

export default function Profile() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats>({
    totalPicks: 0,
    correctPicks: 0,
    incorrectPicks: 0,
    winPercentage: 0,
    lockPicks: 0,
    lockWins: 0,
    lockLosses: 0,
    lockWinPercentage: 0,
  });
  const [pickHistory, setPickHistory] = useState<PickHistory[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingAwards, setLoadingAwards] = useState(true);
  const [profileData, setProfileData] = useState({
    username: "",
    bio: "",
  });
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    null
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | "all">("all");
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);

  const loadAvailableWeeks = useCallback(async () => {
    try {
      const { data: weeksData, error } = await supabase
        .from("games")
        .select("week")
        .eq("season", 2025)
        .order("week", { ascending: true });

      if (!error && weeksData) {
        const uniqueWeeks = [...new Set(weeksData.map((g) => g.week))];
        setAvailableWeeks(uniqueWeeks);
      }
    } catch (error) {
      console.error("Error loading available weeks:", error);
    }
  }, []);

  const loadProfileData = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, bio")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfileData({
        username: data?.username || "",
        bio: data?.bio || "",
      });

      // Load profile picture from storage
      const pictureUrl = await getProfilePictureUrl(user.id);
      setProfilePictureUrl(pictureUrl);
    } catch (error) {
      console.error("Error loading profile data:", error);
    }
  }, [user]);

  const updateProfile = async (newProfileData: {
    username: string;
    bio: string;
  }) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update(newProfileData)
        .eq("id", user.id);

      if (error) throw error;

      setProfileData(newProfileData);
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const loadUserStats = useCallback(async () => {
    if (!user) return;

    try {
      // For now, we'll calculate basic stats from picks
      // In a real app, you'd want to store computed stats in the database
      const { data: picks, error } = await supabase
        .from("picks")
        .select(
          `
          *,
          game:games(week, home_team, away_team, home_score, away_score, status, game_time)
        `
        )
        .eq("user_id", user.id);

      if (error) throw error;

      const totalPicks = picks?.length || 0;
      let correctPicks = 0;
      let incorrectPicks = 0;
      let lockPicks = 0;
      let lockWins = 0;
      let lockLosses = 0;
      let completedGames = 0;

      picks?.forEach((pick) => {
        const game = pick.game;
        if (
          game &&
          game.status === "completed" &&
          game.home_score !== null &&
          game.away_score !== null
        ) {
          completedGames++;
          // Handle ties properly - ties are neither wins nor losses
          if (game.home_score === game.away_score) {
            // Tie game - don't count as win or loss
          } else {
            const winner =
              game.home_score > game.away_score
                ? game.home_team
                : game.away_team;
            const isCorrect = pick.picked_team === winner;

            if (isCorrect) {
              correctPicks++;
            } else {
              incorrectPicks++;
            }
          }

          // Count lock picks separately - handle ties properly
          if (pick.is_lock) {
            lockPicks++;
            if (game.home_score === game.away_score) {
              // Tie game - don't count lock as win or loss
            } else {
              const winner =
                game.home_score > game.away_score
                  ? game.home_team
                  : game.away_team;
              const isCorrect = pick.picked_team === winner;
              if (isCorrect) {
                lockWins++;
              } else {
                lockLosses++;
              }
            }
          }
        }
      });

      const winPercentage =
        completedGames > 0
          ? Math.round((correctPicks / completedGames) * 100)
          : 0;

      const lockWinPercentage =
        lockPicks > 0 ? Math.round((lockWins / lockPicks) * 100) : 0;

      setStats({
        totalPicks,
        correctPicks,
        incorrectPicks,
        winPercentage,
        lockPicks,
        lockWins,
        lockLosses,
        lockWinPercentage,
      });
    } catch (error) {
      console.error("Error loading user stats:", error);
    } finally {
      setLoadingStats(false);
    }
  }, [user]);

  const loadPickHistory = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("picks")
        .select(
          `
          *,
          game:games(*)
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Sort picks: completed games first, then by creation date (newest first)
      const sortedPicks = (data || []).sort((a, b) => {
        const aCompleted = a.game?.status === "completed";
        const bCompleted = b.game?.status === "completed";

        if (aCompleted && !bCompleted) return -1;
        if (!aCompleted && bCompleted) return 1;

        // If both completed or both not completed, sort by creation date
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      setPickHistory(sortedPicks);
    } catch (error) {
      console.error("Error loading pick history:", error);
    }
  }, [user]);

  const loadAwards = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingAwards(true);
      const { data, error } = await getUserAwards(user.id);
      if (error) throw error;
      setAwards(data || []);
    } catch (error) {
      console.error("Error loading awards:", error);
    } finally {
      setLoadingAwards(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadProfileData();
      loadUserStats();
      loadPickHistory();
      loadAwards();
      loadAvailableWeeks();
    }
  }, [
    user,
    loadProfileData,
    loadUserStats,
    loadPickHistory,
    loadAwards,
    loadAvailableWeeks,
  ]);

  const getPickResult = (pick: PickHistory) => {
    const game = pick.game;
    if (
      !game ||
      game.status !== "completed" ||
      game.home_score === null ||
      game.home_score === undefined ||
      game.away_score === null ||
      game.away_score === undefined
    ) {
      return "pending";
    }

    // Check for tie first
    if (game.home_score === game.away_score) {
      return "tie";
    }

    const winner =
      game.home_score > game.away_score ? game.home_team : game.away_team;
    return pick.picked_team === winner ? "correct" : "incorrect";
  };

  // Get pick points for display (similar to dashboard)
  const getPickPoints = (pick: PickHistory) => {
    const game = pick.game;
    if (
      game.status !== "completed" ||
      game.home_score === null ||
      game.away_score === null
    ) {
      return 0;
    }
    return pick.pick_points || 0;
  };

  // Filter pick history by selected week
  const filteredPickHistory = pickHistory.filter((pick) => {
    if (selectedWeek === "all") return true;
    return (pick.game as any)?.week === selectedWeek;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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

  const formatPickTime = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleString("en-US", { month: "long" });
    const day = date.getDate();
    const dayWithSuffix =
      day +
      (day % 10 === 1 && day !== 11
        ? "st"
        : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
        ? "rd"
        : "th");
    const time = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `${month} ${dayWithSuffix} ${time}`;
  };

  if (loading || loadingStats) {
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
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="relative flex-shrink-0">
                <div
                  className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative group"
                  onClick={() => setShowEditModal(true)}
                  role="button"
                  aria-label="Edit profile picture"
                >
                  {profilePictureUrl ? (
                    <img
                      src={profilePictureUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={() => setProfilePictureUrl(null)}
                    />
                  ) : (
                    <User className="h-10 w-10 text-gray-300" />
                  )}
                  {/* Hover overlay for desktop */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Edit className="h-6 w-6 text-white" />
                  </div>
                </div>
                {/* Edit badge - visible on mobile, hidden on desktop hover */}
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center border-2 border-gray-900 md:group-hover:opacity-0 transition-opacity shadow-lg">
                  <Edit className="h-4 w-4 text-gray-200" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-white mb-1">
                  {profileData.username || user.email}
                </h1>
                {profileData.bio && (
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {profileData.bio}
                  </p>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 text-sm px-4 py-2 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-1 mb-4">
          <Card className="p-2 text-center bg-gray-800 border-gray-600">
            <div className="text-xs text-gray-300">Total</div>
            <div className="text-lg font-bold text-white">
              {stats.totalPicks}
            </div>
          </Card>

          <Card className="p-2 text-center bg-gray-800 border-gray-600">
            <div className="text-xs text-gray-300">Correct</div>
            <div className="text-lg font-bold text-green-400">
              {stats.correctPicks}
            </div>
          </Card>

          <Card className="p-2 text-center bg-gray-800 border-gray-600">
            <div className="text-xs text-gray-300">Wrong</div>
            <div className="text-lg font-bold text-red-400">
              {stats.incorrectPicks}
            </div>
          </Card>

          <Card className="p-2 text-center bg-gray-800 border-gray-600">
            <div className="text-xs text-gray-300">Win %</div>
            <div className="text-lg font-bold text-blue-400">
              {stats.winPercentage}%
            </div>
          </Card>
        </div>

        {/* Lock Stats Cards */}
        <div className="grid grid-cols-4 gap-1 mb-4">
          <Card className="border-yellow-600 bg-yellow-900/20 p-2 text-center">
            <div className="text-xs text-yellow-300 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              Locks
            </div>
            <div className="text-lg font-bold text-yellow-200">
              {stats.lockPicks}
            </div>
          </Card>

          <Card className="border-green-600 bg-green-900/20 p-2 text-center">
            <div className="text-xs text-green-300">Lock W</div>
            <div className="text-lg font-bold text-green-200">
              {stats.lockWins}
            </div>
          </Card>

          <Card className="border-red-600 bg-red-900/20 p-2 text-center">
            <div className="text-xs text-red-300">Lock L</div>
            <div className="text-lg font-bold text-red-200">
              {stats.lockLosses}
            </div>
          </Card>

          <Card className="border-purple-600 bg-purple-900/20 p-2 text-center">
            <div className="text-xs text-purple-300">Lock %</div>
            <div className="text-lg font-bold text-purple-200">
              {stats.lockWinPercentage}%
            </div>
          </Card>
        </div>

        {/* Trophy Wall */}
        <Card className="mb-4 bg-gray-800 border-gray-600">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Trophy Wall
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingAwards ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-300">Loading awards...</p>
              </div>
            ) : awards.length === 0 ? (
              <p className="text-gray-400 text-center py-4 text-sm">
                No awards yet. Keep playing to earn trophies!
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {awards.map((award) => {
                  const display = getAwardDisplay(award);
                  return (
                    <div
                      key={award.id}
                      className="p-2 border rounded bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-yellow-600"
                    >
                      <div className="text-center">
                        <div className="mb-1 flex justify-center">
                          <display.icon className="w-6 h-6 text-yellow-400" />
                        </div>
                        <div className="font-semibold text-yellow-200 text-xs mb-1">
                          {display.name}
                        </div>
                        <div className="text-xs text-gray-300 mb-1">
                          {display.description}
                        </div>
                        <div className="text-xs text-gray-400">
                          {award.season_type === "preseason"
                            ? "Preseason"
                            : "Regular Season"}{" "}
                          • {award.points} pts
                        </div>
                        <div className="text-xs font-medium text-yellow-300 mt-1">
                          {display.record} record
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pick History */}
        <Card className="bg-gray-800 border-gray-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white mb-4">
              Pick History
            </CardTitle>

            {/* Week Selector - Horizontal Scrollable */}
            <div className="bg-gray-700 rounded-lg overflow-hidden mb-4">
              <div className="flex overflow-x-auto scrollbar-hide week-selector-scroll py-2 px-2">
                <button
                  onClick={() => setSelectedWeek("all")}
                  className={`flex-shrink-0 px-3 py-2 mx-1 rounded-lg transition-all duration-200 text-sm font-medium ${
                    selectedWeek === "all"
                      ? "bg-gray-600 text-white"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-600"
                  }`}
                >
                  All Weeks
                </button>
                {availableWeeks.map((week) => (
                  <button
                    key={week}
                    onClick={() => setSelectedWeek(week)}
                    className={`flex-shrink-0 px-3 py-2 mx-1 rounded-lg transition-all duration-200 text-sm font-medium ${
                      selectedWeek === week
                        ? "bg-gray-600 text-white"
                        : "text-gray-400 hover:text-gray-200 hover:bg-gray-600"
                    }`}
                  >
                    Week {week}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredPickHistory.length === 0 ? (
              <p className="text-gray-400 text-center py-4 text-sm px-6">
                {pickHistory.length === 0
                  ? "No picks made yet"
                  : `No picks found for Week ${selectedWeek}`}
              </p>
            ) : (
              <div className="space-y-0">
                {filteredPickHistory.map((pick, index) => {
                  const result = getPickResult(pick);
                  const game = pick.game;

                  // Helper function to render solo status stars
                  const renderSoloStars = (pick: PickHistory) => {
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

                  return (
                    <div
                      key={pick.id}
                      className={`bg-gray-900 border-t border-gray-600 ${
                        index === 0 ? "rounded-t-lg" : ""
                      } ${
                        index === filteredPickHistory.length - 1
                          ? "rounded-b-lg"
                          : ""
                      }`}
                    >
                      <div className="p-4">
                        <div className="text-white">
                          {/* Header with Week and Game Info */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm text-gray-400">
                              Week {(game as any)?.week} •{" "}
                              {formatPickTime(game?.game_time)}
                            </div>
                            {pick.is_lock && (
                              <div className="text-xs text-yellow-400 font-medium flex items-center justify-center gap-1">
                                <Lock className="w-3 h-3" />
                                LOCKED
                              </div>
                            )}
                          </div>

                          {/* Team Matchup Section */}
                          <div className="flex items-center justify-between mb-2">
                            {/* Left Side - Team Info */}
                            <div className="flex-1">
                              {/* Away Team */}
                              <div className="flex items-center gap-3 mb-1">
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                                  style={{
                                    backgroundColor: getTeamColors(
                                      game.away_team
                                    ).primary,
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
                                  </div>
                                </div>
                                {pick.picked_team === game.away_team && (
                                  <div className="mr-2 flex items-center">
                                    {renderSoloStars(pick)}
                                    {game.status === "completed" ? (
                                      <span
                                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                          result === "tie"
                                            ? "bg-gray-600 text-gray-100"
                                            : result === "correct"
                                            ? "bg-green-600 text-green-100"
                                            : "bg-red-600 text-red-100"
                                        }`}
                                      >
                                        {result === "tie" ? (
                                          <>
                                            <span className="mr-1">🤝</span>
                                            TIE
                                            <span className="ml-1 text-gray-200 font-bold">
                                              +{getPickPoints(pick)}
                                            </span>
                                          </>
                                        ) : result === "correct" ? (
                                          <>
                                            <Check className="w-3 h-3 mr-1" />
                                            WIN
                                            <span className="ml-1 text-green-200 font-bold">
                                              +{getPickPoints(pick)}
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <X className="w-3 h-3 mr-1" />
                                            LOSS
                                            <span className="ml-1 text-red-200 font-bold">
                                              {getPickPoints(pick)}
                                            </span>
                                          </>
                                        )}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-600 text-blue-100">
                                        ● PICKED
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* @ Symbol with Line */}
                              <div className="flex items-center justify-center mb-1">
                                <span className="text-gray-400 text-lg mr-2">
                                  @
                                </span>
                                <div className="flex-1 h-px bg-gray-600"></div>
                              </div>

                              {/* Home Team */}
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                                  style={{
                                    backgroundColor: getTeamColors(
                                      game.home_team
                                    ).primary,
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
                                  </div>
                                </div>
                                {pick.picked_team === game.home_team && (
                                  <div className="mr-2 flex items-center">
                                    {renderSoloStars(pick)}
                                    {game.status === "completed" ? (
                                      <span
                                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                          result === "tie"
                                            ? "bg-gray-600 text-gray-100"
                                            : result === "correct"
                                            ? "bg-green-600 text-green-100"
                                            : "bg-red-600 text-red-100"
                                        }`}
                                      >
                                        {result === "tie" ? (
                                          <>
                                            <span className="mr-1">🤝</span>
                                            TIE
                                            <span className="ml-1 text-gray-200 font-bold">
                                              +{getPickPoints(pick)}
                                            </span>
                                          </>
                                        ) : result === "correct" ? (
                                          <>
                                            <Check className="w-3 h-3 mr-1" />
                                            WIN
                                            <span className="ml-1 text-green-200 font-bold">
                                              +{getPickPoints(pick)}
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <X className="w-3 h-3 mr-1" />
                                            LOSS
                                            <span className="ml-1 text-red-200 font-bold">
                                              {getPickPoints(pick)}
                                            </span>
                                          </>
                                        )}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-600 text-blue-100">
                                        ● PICKED
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right Side - Game Details */}
                            <div className="ml-6 text-right">
                              {game.status === "completed" ? (
                                <>
                                  <div className="text-sm font-bold text-green-400 mb-1">
                                    FINAL
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-sm text-gray-400 mb-1">
                                    {new Date(
                                      game.game_time
                                    ).toLocaleDateString("en-US", {
                                      weekday: "short",
                                      month: "numeric",
                                      day: "numeric",
                                    })}
                                  </div>
                                  <div className="text-sm text-gray-400 mb-1">
                                    {new Date(
                                      game.game_time
                                    ).toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Edit Modal */}
        <ProfileEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={updateProfile}
          currentProfile={profileData}
        />
      </div>
    </div>
  );
}
