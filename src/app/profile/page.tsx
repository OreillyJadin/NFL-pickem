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
import { getProfilePictureUrl } from "@/lib/storage";
import { getUserAwards, getAwardDisplay } from "@/lib/awards";
import { Award } from "@/lib/supabase";
import { getTeamColors, getTeamAbbreviation } from "@/lib/team-colors";
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
          const winner =
            game.home_score > game.away_score ? game.home_team : game.away_team;
          const isCorrect = pick.picked_team === winner;

          if (isCorrect) {
            correctPicks++;
          } else {
            incorrectPicks++;
          }

          // Count lock picks separately
          if (pick.is_lock) {
            lockPicks++;
            if (isCorrect) {
              lockWins++;
            } else {
              lockLosses++;
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

    const winner =
      game.home_score > game.away_score ? game.home_team : game.away_team;
    return pick.picked_team === winner ? "correct" : "incorrect";
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
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                {profilePictureUrl ? (
                  <img
                    src={profilePictureUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={() => setProfilePictureUrl(null)}
                  />
                ) : (
                  <User className="h-6 w-6 text-gray-300" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {profileData.username || user.email}
                </h1>
                {profileData.bio && (
                  <p className="text-sm text-gray-300 mt-1 max-w-md">
                    {profileData.bio}
                  </p>
                )}
              </div>
            </div>
            <div className="flex space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-1 text-xs px-2 py-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Edit className="h-3 w-3" />
                Edit
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-1 mb-4">
          <Card className="p-2 text-center bg-gray-800 border-gray-600">
            <div className="text-xs text-gray-300">Total</div>
            <div className="text-sm font-bold text-white">
              {stats.totalPicks}
            </div>
          </Card>

          <Card className="p-2 text-center bg-gray-800 border-gray-600">
            <div className="text-xs text-gray-300">Correct</div>
            <div className="text-sm font-bold text-green-400">
              {stats.correctPicks}
            </div>
          </Card>

          <Card className="p-2 text-center bg-gray-800 border-gray-600">
            <div className="text-xs text-gray-300">Wrong</div>
            <div className="text-sm font-bold text-red-400">
              {stats.incorrectPicks}
            </div>
          </Card>

          <Card className="p-2 text-center bg-gray-800 border-gray-600">
            <div className="text-xs text-gray-300">Win %</div>
            <div className="text-sm font-bold text-blue-400">
              {stats.winPercentage}%
            </div>
          </Card>
        </div>

        {/* Lock Stats Cards */}
        <div className="grid grid-cols-4 gap-1 mb-4">
          <Card className="border-yellow-600 bg-yellow-900/20 p-2 text-center">
            <div className="text-xs text-yellow-300">🔒 Locks</div>
            <div className="text-sm font-bold text-yellow-200">
              {stats.lockPicks}
            </div>
          </Card>

          <Card className="border-green-600 bg-green-900/20 p-2 text-center">
            <div className="text-xs text-green-300">Lock W</div>
            <div className="text-sm font-bold text-green-200">
              {stats.lockWins}
            </div>
          </Card>

          <Card className="border-red-600 bg-red-900/20 p-2 text-center">
            <div className="text-xs text-red-300">Lock L</div>
            <div className="text-sm font-bold text-red-200">
              {stats.lockLosses}
            </div>
          </Card>

          <Card className="border-purple-600 bg-purple-900/20 p-2 text-center">
            <div className="text-xs text-purple-300">Lock %</div>
            <div className="text-sm font-bold text-purple-200">
              {stats.lockWinPercentage}%
            </div>
          </Card>
        </div>

        {/* Trophy Wall */}
        <Card className="mb-4 bg-gray-800 border-gray-600">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              🏆 Trophy Wall
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
                        <div className="text-2xl mb-1">{display.emoji}</div>
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white">Pick History</CardTitle>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-300">
                  Week:
                </label>
                <select
                  value={selectedWeek}
                  onChange={(e) =>
                    setSelectedWeek(
                      e.target.value === "all"
                        ? "all"
                        : parseInt(e.target.value)
                    )
                  }
                  className="px-2 py-1 text-sm border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                >
                  <option value="all">All Weeks</option>
                  {availableWeeks.map((week) => (
                    <option key={week} value={week}>
                      Week {week}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {filteredPickHistory.length === 0 ? (
              <p className="text-gray-400 text-center py-4 text-sm">
                {pickHistory.length === 0
                  ? "No picks made yet"
                  : `No picks found for Week ${selectedWeek}`}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredPickHistory.map((pick) => {
                  const result = getPickResult(pick);
                  const game = pick.game;

                  return (
                    <div
                      key={pick.id}
                      className="border border-gray-600 rounded-lg mb-2 bg-gray-700"
                    >
                      {/* Header with Week and Game Info */}
                      <div className="bg-gray-600 px-3 py-2 border-b border-gray-500">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm text-white">
                            Week {(game as any)?.week} • {game?.away_team} @{" "}
                            {game?.home_team}
                          </div>
                          <div className="text-xs text-gray-300">
                            {formatPickTime(game?.game_time)}
                          </div>
                        </div>
                        {pick.is_lock && (
                          <div className="text-xs text-yellow-400 font-medium mt-1">
                            🔒 LOCKED
                          </div>
                        )}
                      </div>

                      {/* Team Display */}
                      <div className="p-3">
                        {game?.status === "completed" &&
                        game.home_score !== null &&
                        game.away_score !== null ? (
                          // Completed Game - Show scores
                          <div className="space-y-1.5">
                            {/* Away Team - Top */}
                            <div className="flex items-center justify-between py-1.5 border-b border-gray-200">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                                  style={{
                                    backgroundColor: getTeamColors(
                                      game.away_team
                                    ).primary,
                                  }}
                                >
                                  {getTeamAbbreviation(game.away_team)}
                                </div>
                                <span className="font-semibold text-sm">
                                  {game.away_team}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {pick.picked_team === game.away_team && (
                                  <span
                                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                      result === "correct"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {result === "correct" ? "✓" : "✗"}
                                  </span>
                                )}
                                <span className="text-lg font-bold">
                                  {game.away_score}
                                </span>
                              </div>
                            </div>

                            {/* Home Team - Bottom */}
                            <div className="flex items-center justify-between py-1.5">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                                  style={{
                                    backgroundColor: getTeamColors(
                                      game.home_team
                                    ).primary,
                                  }}
                                >
                                  {getTeamAbbreviation(game.home_team)}
                                </div>
                                <span className="font-semibold text-sm">
                                  {game.home_team}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {pick.picked_team === game.home_team && (
                                  <span
                                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                      result === "correct"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {result === "correct" ? "✓" : "✗"}
                                  </span>
                                )}
                                <span className="text-lg font-bold">
                                  {game.home_score}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Pending Game - Show pick without scores
                          <div className="space-y-1.5">
                            {/* Away Team - Top */}
                            <div className="flex items-center justify-between py-1.5 border-b border-gray-200">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                                  style={{
                                    backgroundColor: getTeamColors(
                                      game.away_team
                                    ).primary,
                                  }}
                                >
                                  {getTeamAbbreviation(game.away_team)}
                                </div>
                                <span className="font-semibold text-sm">
                                  {game.away_team}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {pick.picked_team === game.away_team && (
                                  <span className="text-blue-600 text-lg">
                                    ●
                                  </span>
                                )}
                                <span className="text-lg font-bold text-gray-400">
                                  -
                                </span>
                              </div>
                            </div>

                            {/* Home Team - Bottom */}
                            <div className="flex items-center justify-between py-1.5">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                                  style={{
                                    backgroundColor: getTeamColors(
                                      game.home_team
                                    ).primary,
                                  }}
                                >
                                  {getTeamAbbreviation(game.home_team)}
                                </div>
                                <span className="font-semibold text-sm">
                                  {game.home_team}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {pick.picked_team === game.home_team && (
                                  <span className="text-blue-600 text-lg">
                                    ●
                                  </span>
                                )}
                                <span className="text-lg font-bold text-gray-400">
                                  -
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
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
