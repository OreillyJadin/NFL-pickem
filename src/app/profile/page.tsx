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
    profile_pic_url: "",
  });
  const [showEditModal, setShowEditModal] = useState(false);

  const loadProfileData = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, bio, profile_pic_url")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfileData({
        username: data?.username || "",
        bio: data?.bio || "",
        profile_pic_url: data?.profile_pic_url || "",
      });
    } catch (error) {
      console.error("Error loading profile data:", error);
    }
  }, [user]);

  const updateProfile = async (newProfileData: {
    username: string;
    bio: string;
    profile_pic_url: string;
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
    }
  }, [user, loadProfileData, loadUserStats, loadPickHistory, loadAwards]);

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
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                {profileData.profile_pic_url ? (
                  <img
                    src={profileData.profile_pic_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {profileData.username || user.email}
                </h1>
                {profileData.bio && (
                  <p className="text-sm text-gray-600 mt-1 max-w-md">
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
                className="flex items-center gap-1 text-xs px-2 py-1"
              >
                <Edit className="h-3 w-3" />
                Edit
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-1 mb-4">
          <Card className="p-2 text-center">
            <div className="text-xs text-gray-600">Total</div>
            <div className="text-sm font-bold">{stats.totalPicks}</div>
          </Card>

          <Card className="p-2 text-center">
            <div className="text-xs text-gray-600">Correct</div>
            <div className="text-sm font-bold text-green-600">
              {stats.correctPicks}
            </div>
          </Card>

          <Card className="p-2 text-center">
            <div className="text-xs text-gray-600">Wrong</div>
            <div className="text-sm font-bold text-red-600">
              {stats.incorrectPicks}
            </div>
          </Card>

          <Card className="p-2 text-center">
            <div className="text-xs text-gray-600">Win %</div>
            <div className="text-sm font-bold text-blue-600">
              {stats.winPercentage}%
            </div>
          </Card>
        </div>

        {/* Lock Stats Cards */}
        <div className="grid grid-cols-4 gap-1 mb-4">
          <Card className="border-yellow-200 bg-yellow-50 p-2 text-center">
            <div className="text-xs text-yellow-700">🔒 Locks</div>
            <div className="text-sm font-bold text-yellow-800">
              {stats.lockPicks}
            </div>
          </Card>

          <Card className="border-green-200 bg-green-50 p-2 text-center">
            <div className="text-xs text-green-700">Lock W</div>
            <div className="text-sm font-bold text-green-800">
              {stats.lockWins}
            </div>
          </Card>

          <Card className="border-red-200 bg-red-50 p-2 text-center">
            <div className="text-xs text-red-700">Lock L</div>
            <div className="text-sm font-bold text-red-800">
              {stats.lockLosses}
            </div>
          </Card>

          <Card className="border-purple-200 bg-purple-50 p-2 text-center">
            <div className="text-xs text-purple-700">Lock %</div>
            <div className="text-sm font-bold text-purple-800">
              {stats.lockWinPercentage}%
            </div>
          </Card>
        </div>

        {/* Trophy Wall */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              🏆 Trophy Wall
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingAwards ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading awards...</p>
              </div>
            ) : awards.length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-sm">
                No awards yet. Keep playing to earn trophies!
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {awards.map((award) => {
                  const display = getAwardDisplay(award);
                  return (
                    <div
                      key={award.id}
                      className="p-2 border rounded bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200"
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-1">{display.emoji}</div>
                        <div className="font-semibold text-gray-800 text-xs mb-1">
                          {display.name}
                        </div>
                        <div className="text-xs text-gray-600 mb-1">
                          {display.description}
                        </div>
                        <div className="text-xs text-gray-500">
                          {award.season_type === "preseason"
                            ? "Preseason"
                            : "Regular Season"}{" "}
                          • {award.points} pts
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
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Pick History</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {pickHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-sm">
                No picks made yet
              </p>
            ) : (
              <div className="space-y-2">
                {pickHistory.map((pick) => {
                  const result = getPickResult(pick);
                  const game = pick.game;

                  return (
                    <div
                      key={pick.id}
                      className="flex items-center justify-between p-3 border rounded text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {game?.away_team} @ {game?.home_team}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          Picked: {pick.picked_team} •{" "}
                          {formatPickTime(pick.created_at)}
                        </div>
                        {pick.is_lock && (
                          <div className="text-xs text-yellow-600 font-medium">
                            🔒 LOCKED
                          </div>
                        )}
                        {game?.status === "completed" &&
                          game.home_score !== null &&
                          game.away_score !== null && (
                            <div className="text-xs text-gray-500">
                              Final: {game.away_team} {game.away_score} -{" "}
                              {game.home_team} {game.home_score}
                            </div>
                          )}
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        {result === "correct" && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            ✓
                          </span>
                        )}
                        {result === "incorrect" && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                            ✗
                          </span>
                        )}
                        {result === "pending" && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
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
