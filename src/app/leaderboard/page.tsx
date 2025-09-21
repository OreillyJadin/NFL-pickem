"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Lock, Star, Check, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { supabase } from "@/lib/supabase";
import { getProfilePictureUrl } from "@/lib/storage";

// Profile Picture Component
function ProfilePicture({ userId }: { userId: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const url = await getProfilePictureUrl(userId);
        setImageUrl(url);
      } catch (error) {
        console.error("Error loading profile picture:", error);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [userId]);

  if (loading) {
    return (
      <div className="w-4 h-4 bg-gray-300 rounded-full animate-pulse"></div>
    );
  }

  if (!imageUrl) {
    return <div className="w-6 h-6 bg-gray-400 rounded-full"></div>;
  }

  return (
    <img
      src={imageUrl}
      alt="Profile"
      className="w-full h-full object-cover"
      onError={() => setImageUrl(null)}
    />
  );
}

interface LeaderboardEntry {
  user_id: string;
  username: string;
  email: string;
  total_picks: number;
  correct_picks: number;
  incorrect_picks: number;
  total_points: number;
  current_streak: number;
  weekly_points: number;
}

interface WeeklyStats {
  week: number;
  season_type: string;
  total_games: number;
  user_points: number;
  user_picks: number;
  user_correct: number;
}

export default function Leaderboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [loadingData, setLoadingData] = useState(true);
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
  const [viewMode, setViewMode] = useState<"season" | "weekly">("season");

  // Helper function to sort leaderboard entries by priority: points, %, wins, lowest losses
  const sortLeaderboard = (a: LeaderboardEntry, b: LeaderboardEntry) => {
    // 1. Points (descending)
    if (b.total_points !== a.total_points) {
      return b.total_points - a.total_points;
    }

    // 2. Win percentage (descending)
    const aWinPercentage =
      a.total_picks > 0 ? a.correct_picks / a.total_picks : 0;
    const bWinPercentage =
      b.total_picks > 0 ? b.correct_picks / b.total_picks : 0;
    if (bWinPercentage !== aWinPercentage) {
      return bWinPercentage - aWinPercentage;
    }

    // 3. Wins (descending)
    if (b.correct_picks !== a.correct_picks) {
      return b.correct_picks - a.correct_picks;
    }

    // 4. Lowest losses (ascending)
    return a.incorrect_picks - b.incorrect_picks;
  };

  const loadLeaderboard = useCallback(async () => {
    try {
      setLoadingData(true);

      if (viewMode === "season") {
        // Load overall season standings - get all users who have made picks
        const { data: picks, error: picksError } = await supabase
          .from("picks")
          .select(
            `
              user_id,
              picked_team,
              is_lock,
              game:games!inner(
                home_team,
                away_team,
                home_score,
                away_score,
                status,
                week,
                season,
                season_type
              )
            `
          )
          .eq("game.season", 2025);

        if (picksError) throw picksError;

        // Get all user profiles
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, email");

        if (profilesError) throw profilesError;

        // Create user profiles map
        const userProfiles: {
          [key: string]: {
            username: string;
            email: string;
          };
        } = {};

        profiles?.forEach((profile) => {
          userProfiles[profile.id] = {
            username: profile.username,
            email: profile.email,
          };
        });

        // Get all users who have made picks (even if no completed games)
        const usersWithPicks = new Set(
          picks?.map((pick) => pick.user_id) || []
        );
        const userStats: { [key: string]: LeaderboardEntry } = {};

        // Initialize all users who have made picks
        usersWithPicks.forEach((userId) => {
          userStats[userId] = {
            user_id: userId,
            username: userProfiles[userId]?.username || "Unknown",
            email: userProfiles[userId]?.email || "",
            total_picks: 0,
            correct_picks: 0,
            incorrect_picks: 0,
            total_points: 0,
            current_streak: 0,
            weekly_points: 0,
          };
        });

        // Process picks and calculate points
        picks?.forEach((pick) => {
          const game = pick.game as any;

          // Only count completed games for stats
          if (
            game &&
            game.status === "completed" &&
            game.home_score !== null &&
            game.away_score !== null
          ) {
            userStats[pick.user_id].total_picks++;
            const winner =
              game.home_score > game.away_score
                ? game.home_team
                : game.away_team;
            const isCorrect = pick.picked_team === winner;

            if (isCorrect) {
              userStats[pick.user_id].correct_picks++;
              userStats[pick.user_id].total_points += pick.is_lock ? 2 : 1;
            } else {
              userStats[pick.user_id].incorrect_picks++;
              userStats[pick.user_id].total_points += pick.is_lock ? -2 : 0;
            }
          }
        });

        // Sort by priority: points, %, wins, lowest losses
        const sortedLeaderboard =
          Object.values(userStats).sort(sortLeaderboard);
        setLeaderboard(sortedLeaderboard);
      } else {
        // Load weekly standings - get all users who have made picks for this week
        const { data: picks, error: picksError } = await supabase
          .from("picks")
          .select(
            `
              user_id,
              picked_team,
              is_lock,
              game:games!inner(
                home_team,
                away_team,
                home_score,
                away_score,
                status,
                week,
                season,
                season_type
              )
            `
          )
          .eq("game.season", 2025)
          .eq("game.week", selectedWeek)
          .eq("game.season_type", selectedSeasonType);

        if (picksError) throw picksError;

        // Get all user profiles
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, email");

        if (profilesError) throw profilesError;

        // Create user profiles map
        const userProfiles: {
          [key: string]: {
            username: string;
            email: string;
          };
        } = {};

        profiles?.forEach((profile) => {
          userProfiles[profile.id] = {
            username: profile.username,
            email: profile.email,
          };
        });

        // Get all users who have made picks for this week (even if no completed games)
        const usersWithPicks = new Set(
          picks?.map((pick) => pick.user_id) || []
        );
        const userStats: { [key: string]: LeaderboardEntry } = {};

        // Initialize all users who have made picks for this week
        usersWithPicks.forEach((userId) => {
          userStats[userId] = {
            user_id: userId,
            username: userProfiles[userId]?.username || "Unknown",
            email: userProfiles[userId]?.email || "",
            total_picks: 0,
            correct_picks: 0,
            incorrect_picks: 0,
            total_points: 0,
            current_streak: 0,
            weekly_points: 0,
          };
        });

        // Process picks and calculate points
        picks?.forEach((pick) => {
          const game = pick.game as any;

          // Only count completed games for stats
          if (
            game &&
            game.status === "completed" &&
            game.home_score !== null &&
            game.away_score !== null
          ) {
            userStats[pick.user_id].total_picks++;
            const winner =
              game.home_score > game.away_score
                ? game.home_team
                : game.away_team;
            const isCorrect = pick.picked_team === winner;

            if (isCorrect) {
              userStats[pick.user_id].correct_picks++;
              userStats[pick.user_id].total_points += pick.is_lock ? 2 : 1;
            } else {
              userStats[pick.user_id].incorrect_picks++;
              userStats[pick.user_id].total_points += pick.is_lock ? -2 : 0;
            }
          }
        });

        // Sort by priority: points, %, wins, lowest losses
        const sortedLeaderboard =
          Object.values(userStats).sort(sortLeaderboard);
        setLeaderboard(sortedLeaderboard);
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setLoadingData(false);
    }
  }, [viewMode, selectedWeek, selectedSeasonType]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadLeaderboard();
    }
  }, [user, loadLeaderboard]);

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading leaderboard...</p>
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
      <div className="w-full px-0 sm:px-4">
        <div className="mb-2 px-4">
          <h1 className="text-3xl font-bold text-white text-center mt-2">
            Leaderboard
          </h1>
        </div>
        {/* View Mode Toggle */}
        <div className="mb-2 mt-2 mx-4 p-2 bg-gray-800 rounded-lg border border-gray-600">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() => setViewMode("season")}
                variant={viewMode === "season" ? "default" : "outline"}
                className={`flex-1 text-sm ${
                  viewMode === "season"
                    ? "bg-gray-700 text-white"
                    : "border-gray-600 text-gray-300 hover:bg-gray-700"
                }`}
              >
                Season
              </Button>
              <Button
                onClick={() => {
                  setViewMode("weekly");
                  setSelectedWeek(getCurrentNFLWeek()); // Reset to current week when switching to weekly view
                }}
                variant={viewMode === "weekly" ? "default" : "outline"}
                className={`flex-1 text-sm ${
                  viewMode === "weekly"
                    ? "bg-gray-700 text-white"
                    : "border-gray-600 text-gray-300 hover:bg-gray-700"
                }`}
              >
                Weekly
              </Button>
            </div>

            {viewMode === "weekly" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Season Type
                  </label>
                  <select
                    value={selectedSeasonType}
                    onChange={(e) =>
                      setSelectedSeasonType(
                        e.target.value as "preseason" | "regular"
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-700 text-white"
                  >
                    <option value="regular">Regular Season</option>
                    <option value="preseason">Preseason</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Week
                  </label>
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-700 text-white"
                  >
                    {Array.from({ length: 18 }, (_, i) => i + 1).map((week) => (
                      <option key={week} value={week}>
                        Week {week}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard Table */}
        <Card className="bg-gray-800 border-gray-600 mx-0 rounded-none sm:mx-4 sm:rounded-lg">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl text-white">
              {viewMode === "season"
                ? "Season Standings"
                : `${
                    selectedSeasonType === "preseason"
                      ? "Preseason"
                      : "Regular Season"
                  } Week ${selectedWeek}`}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-gray-300">
              {viewMode === "season"
                ? "Overall points across all weeks - All players who have made picks"
                : `Points for this week only - All players who have made picks`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                No data available for this period
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px]">
                  <thead>
                    <tr className="border-b-2 border-gray-600">
                      <th className="text-left py-2 px-1 sm:px-2 font-bold text-gray-300 text-xs sm:text-sm">
                        Rank
                      </th>
                      <th className="text-left py-2 px-1 sm:px-2 font-bold text-gray-300 text-xs sm:text-sm">
                        Player
                      </th>
                      <th className="text-center py-2 px-1 sm:px-2 font-bold text-gray-300 text-xs sm:text-sm">
                        Points
                      </th>
                      <th className="text-center py-2 px-1 sm:px-2 font-bold text-gray-300 text-xs sm:text-sm">
                        Wins
                      </th>
                      <th className="text-center py-2 px-1 sm:px-2 font-bold text-gray-300 text-xs sm:text-sm">
                        Losses
                      </th>
                      <th className="text-center py-2 px-1 sm:px-2 font-bold text-gray-300 text-xs sm:text-sm">
                        Win %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, index) => {
                      const isTopThree = index < 3;
                      const isLast = index === leaderboard.length - 1;

                      return (
                        <tr
                          key={entry.user_id}
                          className={`
                            border-b border-gray-600 transition-colors duration-200
                            ${
                              isTopThree
                                ? "bg-gradient-to-r from-yellow-900/30 to-orange-900/30 hover:from-yellow-900/40 hover:to-orange-900/40"
                                : isLast
                                ? "bg-gradient-to-r from-red-900/30 to-pink-900/30 hover:from-red-900/40 hover:to-pink-900/40"
                                : "hover:bg-gray-700"
                            }
                          `}
                        >
                          <td className="py-2 px-1 sm:px-2">
                            <div className="flex items-center">
                              <span
                                className={`font-bold text-sm sm:text-base ${
                                  isTopThree
                                    ? "text-yellow-300"
                                    : isLast
                                    ? "text-red-400"
                                    : "text-gray-300"
                                }`}
                              >
                                #{index + 1}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-1 sm:px-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                                <ProfilePicture userId={entry.user_id} />
                              </div>
                              <div
                                className={`font-bold text-sm sm:text-base ${
                                  isTopThree
                                    ? "text-yellow-300"
                                    : isLast
                                    ? "text-red-400"
                                    : "text-white"
                                }`}
                              >
                                {entry.username || entry.email}
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-1 sm:px-2 text-center">
                            <span
                              className={`font-bold text-sm sm:text-base ${
                                entry.total_points > 0
                                  ? "text-green-400"
                                  : entry.total_points < 0
                                  ? "text-red-400"
                                  : "text-gray-400"
                              }`}
                            >
                              {entry.total_points < 0 ? "-" : ""}
                              {Math.abs(entry.total_points)}
                            </span>
                          </td>
                          <td className="py-2 px-1 sm:px-2 text-center">
                            <span className="text-green-400 font-bold text-sm sm:text-base">
                              {entry.correct_picks}
                            </span>
                          </td>
                          <td className="py-2 px-1 sm:px-2 text-center">
                            <span className="text-red-400 font-bold text-sm sm:text-base">
                              {entry.incorrect_picks}
                            </span>
                          </td>
                          <td className="py-2 px-1 sm:px-2 text-center">
                            <span className="font-bold text-sm sm:text-base text-white">
                              {entry.total_picks > 0
                                ? Math.round(
                                    (entry.correct_picks / entry.total_picks) *
                                      100
                                  )
                                : 0}
                              %
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scoring Info */}
        <div className="mx-4 mt-4">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4">
            Scoring System
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-900/20 rounded-lg border border-green-600">
              <h4 className="font-bold text-green-300 mb-2 text-sm sm:text-base">
                Normal Picks
              </h4>
              <ul className="text-xs sm:text-sm text-green-200 space-y-1">
                <li className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-400" />
                  Correct: +1 point
                </li>
                <li className="flex items-center gap-2">
                  <X className="w-3 h-3 text-red-400" />
                  Incorrect: 0 points
                </li>
              </ul>
            </div>
            <div className="p-3 bg-yellow-900/20 rounded-lg border border-yellow-600">
              <h4 className="font-bold text-yellow-300 mb-2 text-sm sm:text-base flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Lock Picks
              </h4>
              <ul className="text-xs sm:text-sm text-yellow-200 space-y-1">
                <li className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-400" />
                  Correct: +2 points
                </li>
                <li className="flex items-center gap-2">
                  <X className="w-3 h-3 text-red-400" />
                  Incorrect: -2 points
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-400">#</span>
                  Max 3 locks per week
                </li>
              </ul>
            </div>
            <div className="col-span-2 p-3 bg-blue-900/20 rounded-lg border border-blue-600">
              <h4 className="font-bold text-blue-300 mb-2 text-sm sm:text-base flex items-center gap-2">
                <Star className="w-4 h-4" />
                Bonus Points (Week 3+)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <h5 className="font-semibold text-blue-300 text-sm sm:text-base">
                    Solo Pick
                  </h5>
                  <div className="text-xs sm:text-sm text-blue-200">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400 font-bold">+2</span>
                      Only correct pick on a team
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <h5 className="font-semibold text-blue-300 text-sm sm:text-base">
                    Solo Lock
                  </h5>
                  <div className="text-xs sm:text-sm text-blue-200">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400 font-bold">+2</span>
                      Only correct lock on a team
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <h5 className="font-semibold text-blue-300 text-sm sm:text-base">
                    Super Bonus
                  </h5>
                  <div className="text-xs sm:text-sm text-blue-200">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400 font-bold">+5</span>
                      Only pick AND lock on a team
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
