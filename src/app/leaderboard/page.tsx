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
import { supabase } from "@/lib/supabase";

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
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedSeasonType, setSelectedSeasonType] = useState<
    "preseason" | "regular"
  >("regular");
  const [viewMode, setViewMode] = useState<"season" | "weekly">("season");

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
          [key: string]: { username: string; email: string };
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

        // Sort by total points (descending)
        const sortedLeaderboard = Object.values(userStats).sort(
          (a, b) => b.total_points - a.total_points
        );
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
          [key: string]: { username: string; email: string };
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

        // Sort by weekly points (descending)
        const sortedLeaderboard = Object.values(userStats).sort(
          (a, b) => b.total_points - a.total_points
        );
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading leaderboard...</p>
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
      <div className="max-w-6xl mx-auto p-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
          <p className="text-gray-600">
            See how you stack up against other players
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={() => setViewMode("season")}
                variant={viewMode === "season" ? "default" : "outline"}
                className="min-h-11 text-base px-4 w-full sm:w-auto"
              >
                Season Standings
              </Button>
              <Button
                onClick={() => setViewMode("weekly")}
                variant={viewMode === "weekly" ? "default" : "outline"}
                className="min-h-11 text-base px-4 w-full sm:w-auto"
              >
                Weekly Standings
              </Button>
            </div>

            {viewMode === "weekly" && (
              <>
                <div className="w-full sm:w-auto">
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
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-11 text-base w-full sm:w-48"
                  >
                    <option value="regular">Regular Season</option>
                    <option value="preseason">Preseason</option>
                  </select>
                </div>
                <div className="w-full sm:w-auto">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Week
                  </label>
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-11 text-base w-full sm:w-40"
                  >
                    {Array.from({ length: 18 }, (_, i) => i + 1).map((week) => (
                      <option key={week} value={week}>
                        Week {week}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Leaderboard Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {viewMode === "season"
                ? "🏆 Season Standings"
                : `📅 ${
                    selectedSeasonType === "preseason"
                      ? "Preseason"
                      : "Regular Season"
                  } Week ${selectedWeek}`}
            </CardTitle>
            <CardDescription className="text-lg">
              {viewMode === "season"
                ? "Overall points across all weeks - All players who have made picks"
                : `Points for this week only - All players who have made picks`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No data available for this period
              </p>
            ) : (
              <>
                {/* Mobile list view */}
                <div className="md:hidden space-y-3" data-testid="mobile-leaderboard-list">
                  {leaderboard.map((entry, index) => {
                    const isTopThree = index < 3;
                    const isLast = index === leaderboard.length - 1;

                    return (
                      <div
                        key={entry.user_id}
                        className={`p-4 rounded-lg border shadow-sm bg-white transition-colors duration-200 ${
                          isTopThree
                            ? "bg-gradient-to-r from-yellow-50 to-orange-50"
                            : isLast
                            ? "bg-gradient-to-r from-red-50 to-pink-50"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {index === 0 && <span className="text-2xl">🥇</span>}
                            {index === 1 && <span className="text-2xl">🥈</span>}
                            {index === 2 && <span className="text-2xl">🥉</span>}
                            <span className={`font-bold text-lg ${
                              isTopThree
                                ? "text-yellow-800"
                                : isLast
                                ? "text-red-600"
                                : "text-gray-700"
                            }`}>
                              #{index + 1}
                            </span>
                          </div>
                          <span
                            className={`font-bold text-xl ${
                              entry.total_points > 0
                                ? "text-green-600"
                                : entry.total_points < 0
                                ? "text-red-600"
                                : "text-gray-600"
                            }`}
                          >
                            {entry.total_points < 0 ? "-" : ""}
                            {Math.abs(entry.total_points)} pts
                          </span>
                        </div>
                        <div className="mb-1">
                          <div className={`font-bold text-base ${
                            isTopThree
                              ? "text-yellow-800"
                              : isLast
                              ? "text-red-600"
                              : "text-gray-800"
                          }`}>
                            {entry.username}
                          </div>
                          <div className="text-sm text-gray-500">{entry.email}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 pt-2">
                          <div className="text-center">
                            <div className="text-xs text-gray-500">Wins</div>
                            <div className="text-green-600 font-bold text-base">
                              {entry.correct_picks}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500">Losses</div>
                            <div className="text-red-600 font-bold text-base">
                              {entry.incorrect_picks}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500">Win %</div>
                            <div className="font-bold text-base">
                              {entry.total_picks > 0
                                ? Math.round((entry.correct_picks / entry.total_picks) * 100)
                                : 0}
                              %
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table view */}
                <div className="hidden md:block" data-testid="desktop-leaderboard-table">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-4 px-4 font-bold text-gray-700 text-lg">
                        Rank
                      </th>
                      <th className="text-left py-4 px-4 font-bold text-gray-700 text-lg">
                        Player
                      </th>
                      <th className="text-center py-4 px-4 font-bold text-gray-700 text-lg">
                        Wins
                      </th>
                      <th className="text-center py-4 px-4 font-bold text-gray-700 text-lg">
                        Losses
                      </th>
                      <th className="text-center py-4 px-4 font-bold text-gray-700 text-lg">
                        Points
                      </th>
                      <th className="text-center py-4 px-4 font-bold text-gray-700 text-lg">
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
                            border-b transition-colors duration-200
                            ${
                              isTopThree
                                ? "bg-gradient-to-r from-yellow-50 to-orange-50 hover:from-yellow-100 hover:to-orange-100"
                                : isLast
                                ? "bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100"
                                : "hover:bg-gray-50"
                            }
                          `}
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center">
                              {index === 0 && (
                                <span className="text-4xl mr-3">🥇</span>
                              )}
                              {index === 1 && (
                                <span className="text-4xl mr-3">🥈</span>
                              )}
                              {index === 2 && (
                                <span className="text-4xl mr-3">🥉</span>
                              )}
                              <span
                                className={`font-bold text-xl ${
                                  isTopThree
                                    ? "text-yellow-800"
                                    : isLast
                                    ? "text-red-600"
                                    : "text-gray-700"
                                }`}
                              >
                                #{index + 1}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div>
                              <div
                                className={`font-bold text-lg ${
                                  isTopThree
                                    ? "text-yellow-800"
                                    : isLast
                                    ? "text-red-600"
                                    : "text-gray-800"
                                }`}
                              >
                                {entry.username}
                              </div>
                              <div className="text-sm text-gray-500">
                                {entry.email}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="text-green-600 font-bold text-lg">
                              {entry.correct_picks}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="text-red-600 font-bold text-lg">
                              {entry.incorrect_picks}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span
                              className={`font-bold text-2xl ${
                                entry.total_points > 0
                                  ? "text-green-600"
                                  : entry.total_points < 0
                                  ? "text-red-600"
                                  : "text-gray-600"
                              }`}
                            >
                              {entry.total_points < 0 ? "-" : ""}
                              {Math.abs(entry.total_points)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="font-bold text-lg">
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
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Scoring Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              🎯 Scoring System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-bold text-green-800 mb-3 text-lg">
                  Normal Picks
                </h4>
                <ul className="text-sm text-green-700 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    Correct: +1 point
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">✗</span>
                    Incorrect: 0 points
                  </li>
                </ul>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-bold text-yellow-800 mb-3 text-lg flex items-center gap-2">
                  🔒 Lock Picks
                </h4>
                <ul className="text-sm text-yellow-700 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    Correct: +2 points
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">✗</span>
                    Incorrect: -2 points
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">🔢</span>
                    Max 3 locks per week
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
