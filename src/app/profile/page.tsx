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
import { getUserAwards, getAwardDisplay } from "@/lib/awards";
import { Award } from "@/lib/supabase";

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
          game:games(*)
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
      setPickHistory(data || []);
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
      loadUserStats();
      loadPickHistory();
      loadAwards();
    }
  }, [user, loadUserStats, loadPickHistory, loadAwards]);

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
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600">{user.email}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Picks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPicks}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Correct
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.correctPicks}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Incorrect
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.incorrectPicks}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Win %
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.winPercentage}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lock Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700 flex items-center gap-1">
                🔒 Lock Picks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-800">
                {stats.lockPicks}
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700">
                Lock Wins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-800">
                {stats.lockWins}
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-700">
                Lock Losses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-800">
                {stats.lockLosses}
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">
                Lock Win %
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-800">
                {stats.lockWinPercentage}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trophy Wall */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏆 Trophy Wall
            </CardTitle>
            <CardDescription>Your achievements and awards</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAwards ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading awards...</p>
              </div>
            ) : awards.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No awards yet. Keep playing to earn trophies!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {awards.map((award) => {
                  const display = getAwardDisplay(award);
                  return (
                    <div
                      key={award.id}
                      className="p-4 border rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200"
                    >
                      <div className="text-center">
                        <div className="text-4xl mb-2">{display.emoji}</div>
                        <div className="font-semibold text-gray-800 mb-1">
                          {display.name}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {display.description}
                        </div>
                        <div className="text-xs text-gray-500">
                          {award.season_type === "preseason"
                            ? "Preseason"
                            : "Regular Season"}{" "}
                          • {award.points} points
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
        <Card>
          <CardHeader>
            <CardTitle>Pick History</CardTitle>
            <CardDescription>Your recent picks and results</CardDescription>
          </CardHeader>
          <CardContent>
            {pickHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No picks made yet
              </p>
            ) : (
              <div className="space-y-4">
                {pickHistory.map((pick) => {
                  const result = getPickResult(pick);
                  const game = pick.game;

                  return (
                    <div
                      key={pick.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {game?.away_team} @ {game?.home_team}
                        </div>
                        <div className="text-sm text-gray-500">
                          Game:{" "}
                          {game?.game_time
                            ? formatGameTime(game.game_time)
                            : "TBD"}
                        </div>
                        <div className="text-sm text-gray-500">
                          Picked: {pick.picked_team} •{" "}
                          {formatPickTime(pick.created_at)}
                        </div>
                        {pick.is_lock && (
                          <div className="text-xs text-yellow-600 font-medium flex items-center gap-1">
                            🔒 LOCKED PICK
                          </div>
                        )}
                        {game?.status === "completed" &&
                          game.home_score !== null &&
                          game.away_score !== null && (
                            <div className="text-sm text-gray-500">
                              Final: {game.away_team} {game.away_score} -{" "}
                              {game.home_team} {game.home_score}
                            </div>
                          )}
                      </div>
                      <div className="ml-4">
                        {result === "correct" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Correct
                          </span>
                        )}
                        {result === "incorrect" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            ✗ Incorrect
                          </span>
                        )}
                        {result === "pending" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
