"use client";

import { useEffect, useState } from "react";
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
import { checkAdminAccess } from "@/lib/admin";
import {
  getAllUsers,
  getUserPicks,
  updateUserPick,
  createUserPick,
  deleteUserPick,
} from "@/lib/admin-picks";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  username: string;
  email: string;
}

interface Pick {
  id: string;
  user_id: string;
  game_id: string;
  picked_team: string;
  created_at: string;
  games: {
    week: number;
    season_type: string;
    season: number;
    home_team: string;
    away_team: string;
    game_time: string;
    home_score?: number;
    away_score?: number;
    status: string;
  };
}

export default function AdminPicks() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [picks, setPicks] = useState<Pick[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingPicks, setLoadingPicks] = useState(false);
  const [loadingGames, setLoadingGames] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedSeasonType, setSelectedSeasonType] = useState<
    "preseason" | "regular"
  >("regular");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      checkAdminAccess().then((adminStatus) => {
        setIsAdmin(adminStatus);
        if (!adminStatus) {
          router.push("/dashboard");
        } else {
          loadUsers();
        }
      });
    }
  }, [user, router]);

  useEffect(() => {
    if (selectedUser) {
      loadUserPicks();
      loadGames();
    }
  }, [selectedUser, selectedWeek, selectedSeasonType]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data, error } = await getAllUsers();
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadUserPicks = async () => {
    if (!selectedUser) return;

    try {
      setLoadingPicks(true);
      const { data, error } = await getUserPicks(
        selectedUser,
        selectedWeek,
        selectedSeasonType
      );
      if (error) throw error;
      setPicks(data || []);
    } catch (error) {
      console.error("Error loading picks:", error);
    } finally {
      setLoadingPicks(false);
    }
  };

  const loadGames = async () => {
    try {
      setLoadingGames(true);
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("week", selectedWeek)
        .eq("season_type", selectedSeasonType)
        .eq("season", 2025)
        .order("game_time", { ascending: true });

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error("Error loading games:", error);
    } finally {
      setLoadingGames(false);
    }
  };

  const handlePickChange = async (pickId: string, newTeam: string) => {
    try {
      const { error } = await updateUserPick(pickId, newTeam);
      if (error) throw error;
      loadUserPicks(); // Reload picks
    } catch (error) {
      console.error("Error updating pick:", error);
    }
  };

  const handleCreatePick = async (gameId: string, team: string) => {
    if (!selectedUser) return;

    try {
      const { error } = await createUserPick(selectedUser, gameId, team);
      if (error) throw error;
      loadUserPicks(); // Reload picks
    } catch (error) {
      console.error("Error creating pick:", error);
    }
  };

  const handleDeletePick = async (pickId: string) => {
    try {
      const { error } = await deleteUserPick(pickId);
      if (error) throw error;
      loadUserPicks(); // Reload picks
    } catch (error) {
      console.error("Error deleting pick:", error);
    }
  };

  const formatGameTime = (gameTime: string) => {
    return new Date(gameTime).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
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

  if (loading || loadingUsers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-6xl mx-auto p-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Admin - Manage User Picks
          </h1>
          <p className="text-gray-600">
            Edit any user's picks for testing purposes
          </p>
        </div>

        {/* User Selection */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select User
              </label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a user...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.email})
                  </option>
                ))}
              </select>
            </div>
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
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((week) => (
                  <option key={week} value={week}>
                    Week {week}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Picks Display */}
        {selectedUser && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              Picks for {users.find((u) => u.id === selectedUser)?.username} -{" "}
              {selectedSeasonType === "preseason"
                ? "Preseason"
                : "Regular Season"}{" "}
              Week {selectedWeek}
            </h2>

            {loadingPicks || loadingGames ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading data...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Existing Picks */}
                {picks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Existing Picks
                    </h3>
                    <div className="grid gap-4">
                      {picks.map((pick) => (
                        <Card key={pick.id}>
                          <CardHeader>
                            <CardTitle className="text-lg">
                              {pick.games.away_team} @ {pick.games.home_team}
                            </CardTitle>
                            <CardDescription>
                              {formatGameTime(pick.games.game_time)} • Status:{" "}
                              {pick.games.status}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <p className="text-sm text-gray-600 mb-2">
                                  Current Pick: {pick.picked_team}
                                </p>
                                <p className="text-xs text-gray-500 mb-2">
                                  Picked on: {formatPickTime(pick.created_at)}
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() =>
                                      handlePickChange(
                                        pick.id,
                                        pick.games.away_team
                                      )
                                    }
                                    variant={
                                      pick.picked_team === pick.games.away_team
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                  >
                                    {pick.games.away_team}
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      handlePickChange(
                                        pick.id,
                                        pick.games.home_team
                                      )
                                    }
                                    variant={
                                      pick.picked_team === pick.games.home_team
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                  >
                                    {pick.games.home_team}
                                  </Button>
                                </div>
                              </div>
                              <div className="text-right">
                                <Button
                                  onClick={() => handleDeletePick(pick.id)}
                                  variant="destructive"
                                  size="sm"
                                >
                                  Delete Pick
                                </Button>
                              </div>
                            </div>

                            {pick.games.status === "completed" && (
                              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <div className="text-center">
                                  <div className="text-lg font-semibold">
                                    Final: {pick.games.away_team}{" "}
                                    {pick.games.away_score || 0} -{" "}
                                    {pick.games.home_team}{" "}
                                    {pick.games.home_score || 0}
                                  </div>
                                  <div
                                    className={`text-sm font-medium ${
                                      (pick.picked_team ===
                                        pick.games.away_team &&
                                        (pick.games.away_score || 0) >
                                          (pick.games.home_score || 0)) ||
                                      (pick.picked_team ===
                                        pick.games.home_team &&
                                        (pick.games.home_score || 0) >
                                          (pick.games.away_score || 0))
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {pick.picked_team} -{" "}
                                    {(pick.picked_team ===
                                      pick.games.away_team &&
                                      (pick.games.away_score || 0) >
                                        (pick.games.home_score || 0)) ||
                                    (pick.picked_team ===
                                      pick.games.home_team &&
                                      (pick.games.home_score || 0) >
                                        (pick.games.away_score || 0))
                                      ? "WIN"
                                      : "LOSS"}
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Games for Creating Picks */}
                {games.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      {picks.length > 0 ? "Other Games" : "Available Games"}
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        (Click to create picks)
                      </span>
                    </h3>
                    <div className="grid gap-4">
                      {games
                        .filter(
                          (game) =>
                            !picks.some((pick) => pick.game_id === game.id)
                        )
                        .map((game) => (
                          <Card key={game.id}>
                            <CardHeader>
                              <CardTitle className="text-lg">
                                {game.away_team} @ {game.home_team}
                              </CardTitle>
                              <CardDescription>
                                {formatGameTime(game.game_time)} • Status:{" "}
                                {game.status}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center gap-4">
                                <div className="flex-1">
                                  <p className="text-sm text-gray-600 mb-2">
                                    Create Pick:
                                  </p>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() =>
                                        handleCreatePick(
                                          game.id,
                                          game.away_team
                                        )
                                      }
                                      variant="outline"
                                      size="sm"
                                    >
                                      {game.away_team}
                                    </Button>
                                    <Button
                                      onClick={() =>
                                        handleCreatePick(
                                          game.id,
                                          game.home_team
                                        )
                                      }
                                      variant="outline"
                                      size="sm"
                                    >
                                      {game.home_team}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>
                )}

                {/* No Data Message */}
                {picks.length === 0 && games.length === 0 && (
                  <Card>
                    <CardContent className="text-center py-8">
                      <p className="text-gray-500">
                        No games found for{" "}
                        {selectedSeasonType === "preseason"
                          ? "Preseason"
                          : "Regular Season"}{" "}
                        Week {selectedWeek}.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
