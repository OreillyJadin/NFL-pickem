"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Navigation } from "@/components/Navigation";
import { supabase } from "@/lib/supabase";
import { Lock, Trophy, Check, X, Star, Unlock, ArrowLeft } from "lucide-react";
import { getProfilePictureUrl } from "@/lib/storage";
import { getUserAwards, getAwardDisplay } from "@/lib/awards";
import { Award } from "@/lib/supabase";
import { getTeamColors, getTeamAbbreviation } from "@/lib/team-colors";
import { Button } from "@/components/ui/button";

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
    week: number;
  };
}

export default function PublicProfile() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  
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
  const [selectedWeek, setSelectedWeek] = useState<number | "all">("all");
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

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

  const loadUserProfile = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("bio, username")
        .eq("id", userId)
        .single();

      if (!error && data) {
        setProfileData(data);

        // Load profile picture from storage
        const pictureUrl = await getProfilePictureUrl(userId);
        setProfilePictureUrl(pictureUrl);
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    } finally {
      setLoadingProfile(false);
    }
  }, [userId]);

  const loadUserStats = useCallback(async () => {
    if (!userId) return;

    try {
      // Get all picks for the user with completed games only
      const { data: picks, error: picksError } = await supabase
        .from("picks")
        .select(
          `
          *,
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
        .eq("user_id", userId)
        .eq("game.season", 2025)
        .eq("game.status", "completed"); // Only show completed games

      if (picksError) {
        console.error("Error loading picks:", picksError);
        return;
      }

      if (!picks) return;

      // Calculate stats
      let totalPicks = 0;
      let correctPicks = 0;
      let incorrectPicks = 0;
      let lockPicks = 0;
      let lockWins = 0;
      let lockLosses = 0;

      picks.forEach((pick) => {
        const game = pick.game;
        if (
          game &&
          game.status === "completed" &&
          game.home_score !== null &&
          game.away_score !== null
        ) {
          totalPicks++;

          // Handle tie games properly
          if (game.home_score === game.away_score) {
            // Tie game - don't count as win or loss
          } else {
            const winner =
              (game.home_score || 0) > (game.away_score || 0) ? game.home_team : game.away_team;
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
                (game.home_score || 0) > (game.away_score || 0) ? game.home_team : game.away_team;
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

      const winPercentage = totalPicks > 0 ? (correctPicks / totalPicks) * 100 : 0;
      const lockWinPercentage = lockPicks > 0 ? (lockWins / lockPicks) * 100 : 0;

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

      // Set pick history (only completed games)
      setPickHistory(picks as PickHistory[]);
    } catch (error) {
      console.error("Error loading user stats:", error);
    } finally {
      setLoadingStats(false);
    }
  }, [userId]);

  const loadUserAwards = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await getUserAwards(userId);
      if (!error && data) {
        setAwards(data);
      }
    } catch (error) {
      console.error("Error loading user awards:", error);
    } finally {
      setLoadingAwards(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (userId) {
      loadUserProfile();
      loadUserStats();
      loadUserAwards();
      loadAvailableWeeks();
    }
  }, [userId, loadUserProfile, loadUserStats, loadUserAwards, loadAvailableWeeks]);

  const filteredPickHistory = pickHistory.filter((pick) => {
    if (selectedWeek === "all") return true;
    return pick.game.week === selectedWeek;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getGameResult = (pick: PickHistory) => {
    const game = pick.game;
    if (!game || game.status !== "completed" || game.home_score === null || game.away_score === null) {
      return null;
    }

    if (game.home_score === game.away_score) {
      return "TIE";
    }

    const winner = (game.home_score || 0) > (game.away_score || 0) ? game.home_team : game.away_team;
    const isCorrect = pick.picked_team === winner;
    return isCorrect ? "WIN" : "LOSS";
  };

  const getGameScore = (pick: PickHistory) => {
    const game = pick.game;
    if (!game || game.status !== "completed" || game.home_score === null || game.away_score === null) {
      return null;
    }
    return `${game.home_score}-${game.away_score}`;
  };

  if (loading || loadingProfile) {
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
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-6 border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Profile Header */}
        <div className="mb-6">
          <div className="flex items-start space-x-4">
            <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
              {profilePictureUrl ? (
                <img
                  src={profilePictureUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={() => setProfilePictureUrl(null)}
                />
              ) : (
                <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {profileData.username?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white mb-1">
                {profileData.username || "Unknown User"}
              </h1>
              {profileData.bio && (
                <p className="text-sm text-gray-300 leading-relaxed">
                  {profileData.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-1 mb-4">
          <Card className="p-2 text-center bg-gray-800 border-gray-600">
            <div className="text-xs text-gray-300">Total</div>
            <div className="text-lg font-bold text-white">
              {loadingStats ? "..." : stats.totalPicks}
            </div>
          </Card>

          <Card className="p-2 text-center bg-gray-800 border-gray-600">
            <div className="text-xs text-gray-300">Correct</div>
            <div className="text-lg font-bold text-green-400">
              {loadingStats ? "..." : stats.correctPicks}
            </div>
          </Card>

          <Card className="p-2 text-center bg-gray-800 border-gray-600">
            <div className="text-xs text-gray-300">Wrong</div>
            <div className="text-lg font-bold text-red-400">
              {loadingStats ? "..." : stats.incorrectPicks}
            </div>
          </Card>

          <Card className="p-2 text-center bg-gray-800 border-gray-600">
            <div className="text-xs text-gray-300">Win %</div>
            <div className="text-lg font-bold text-blue-400">
              {loadingStats ? "..." : `${stats.winPercentage.toFixed(1)}%`}
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
              {loadingStats ? "..." : stats.lockPicks}
            </div>
          </Card>

          <Card className="border-green-600 bg-green-900/20 p-2 text-center">
            <div className="text-xs text-green-300">Lock W</div>
            <div className="text-lg font-bold text-green-200">
              {loadingStats ? "..." : stats.lockWins}
            </div>
          </Card>

          <Card className="border-red-600 bg-red-900/20 p-2 text-center">
            <div className="text-xs text-red-300">Lock L</div>
            <div className="text-lg font-bold text-red-200">
              {loadingStats ? "..." : stats.lockLosses}
            </div>
          </Card>

          <Card className="border-purple-600 bg-purple-900/20 p-2 text-center">
            <div className="text-xs text-purple-300">Lock %</div>
            <div className="text-lg font-bold text-purple-200">
              {loadingStats ? "..." : `${stats.lockWinPercentage.toFixed(1)}%`}
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
            <CardDescription className="text-gray-400 mb-4">
              Completed games only - scheduled games are hidden
            </CardDescription>

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
            {loadingStats ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-300">Loading picks...</p>
              </div>
            ) : filteredPickHistory.length === 0 ? (
              <p className="text-gray-400 text-center py-4 text-sm px-6">
                No completed picks found for the selected week.
              </p>
            ) : (
              <div className="space-y-0">
                {filteredPickHistory.map((pick, index) => {
                  const game = pick.game;
                  const result = getGameResult(pick);
                  const score = getGameScore(pick);
                  const teamColors = getTeamColors(pick.picked_team);
                  const teamAbbr = getTeamAbbreviation(pick.picked_team);

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
                              Week {game.week} • {formatDate(pick.created_at)}
                            </div>
                            {pick.is_lock && (
                              <div className="text-xs text-yellow-400 font-medium flex items-center justify-center gap-1">
                                <Lock className="w-3 h-3" />
                                LOCKED
                              </div>
                            )}
                          </div>

                          {/* Game Details */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                style={{ backgroundColor: teamColors.primary }}
                              >
                                {teamAbbr}
                              </div>
                              <div>
                                <div className="font-semibold text-white">
                                  {pick.picked_team}
                                </div>
                                <div className="text-sm text-gray-400">
                                  vs {game.home_team === pick.picked_team ? game.away_team : game.home_team}
                                </div>
                              </div>
                              {renderSoloStars(pick)}
                            </div>

                            <div className="flex items-center space-x-3">
                              {result && (
                                <div
                                  className={`px-2 py-1 rounded text-xs font-semibold ${
                                    result === "WIN"
                                      ? "bg-green-900/50 text-green-300 border border-green-600"
                                      : result === "LOSS"
                                      ? "bg-red-900/50 text-red-300 border border-red-600"
                                      : "bg-gray-700 text-gray-300 border border-gray-600"
                                  }`}
                                >
                                  {result}
                                </div>
                              )}
                              {score && (
                                <div className="text-sm text-gray-400 font-mono">
                                  {score}
                                </div>
                              )}
                              {pick.pick_points !== null && pick.pick_points !== undefined && (
                                <div
                                  className={`text-sm font-semibold ${
                                    pick.pick_points > 0
                                      ? "text-green-400"
                                      : pick.pick_points < 0
                                      ? "text-red-400"
                                      : "text-gray-400"
                                  }`}
                                >
                                  {pick.pick_points > 0 ? "+" : ""}
                                  {pick.pick_points}
                                </div>
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
      </div>
    </div>
  );
}
