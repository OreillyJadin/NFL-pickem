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
import { supabase } from "@/lib/supabase";
import {
  checkAdminAccess,
  syncPreseasonGames,
  syncRegularSeasonGames,
} from "@/lib/admin";
import { processWeeklyAwards } from "@/lib/awards";

interface Game {
  id: string;
  week: number;
  season: number;
  season_type: string;
  home_team: string;
  away_team: string;
  game_time: string;
  home_score?: number;
  away_score?: number;
  status: string;
  espn_id?: string;
}

export default function Admin() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<any[]>([]);
  const [syncingScores, setSyncingScores] = useState(false);

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
          loadGames();
        }
      });
    }
  }, [user, router]);

  const loadGames = async () => {
    try {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .order("game_time", { ascending: true });

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error("Error loading games:", error);
    } finally {
      setLoadingGames(false);
    }
  };

  const syncPreseason = async () => {
    setSyncing(true);
    setSyncResults([]);

    try {
      const results = await syncPreseasonGames(2025);
      setSyncResults(results);
      loadGames();
    } catch (error) {
      console.error("Error syncing preseason:", error);
    } finally {
      setSyncing(false);
    }
  };

  const syncRegularSeason = async () => {
    setSyncing(true);
    setSyncResults([]);

    try {
      const results = await syncRegularSeasonGames(2025, 1, 8);
      setSyncResults(results);
      loadGames();
    } catch (error) {
      console.error("Error syncing regular season:", error);
    } finally {
      setSyncing(false);
    }
  };

  const syncMockGames = async () => {
    try {
      // Load mock data
      const response = await fetch("/data/week1.json");
      const data = await response.json();

      // Insert games into database
      const gamesToInsert = data.games.map(
        (game: {
          home_team: string;
          away_team: string;
          game_time: string;
          status: string;
        }) => ({
          week: data.week,
          season: 2025,
          season_type: "regular",
          home_team: game.home_team,
          away_team: game.away_team,
          game_time: game.game_time,
          status: game.status,
        })
      );

      const { error } = await supabase.from("games").insert(gamesToInsert);

      if (error) throw error;

      // Reload games
      loadGames();
    } catch (error) {
      console.error("Error syncing games:", error);
    }
  };

  const processAwards = async () => {
    try {
      setSyncing(true);
      setSyncResults([]);

      const { data, error } = await processWeeklyAwards(1, 2025, "regular");

      if (error) throw error;

      setSyncResults([
        {
          success: true,
          message: `Processed ${data.length} weekly awards successfully`,
        },
      ]);
    } catch (error) {
      console.error("Error processing awards:", error);
      setSyncResults([
        {
          success: false,
          message: `Error processing awards: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ]);
    } finally {
      setSyncing(false);
    }
  };

  const formatGameTime = (gameTime: string) => {
    return new Date(gameTime).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  const syncGameScore = async (gameId: string) => {
    setSyncingScores(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("No auth token");

      const response = await fetch("/api/admin/sync-scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "sync_game",
          gameId: gameId,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Reload games to show updated scores
        loadGames();
        setSyncResults(prev => [...prev, { 
          success: true, 
          week: "Score Update", 
          message: result.message 
        }]);
      } else {
        setSyncResults(prev => [...prev, { 
          success: false, 
          week: "Score Update", 
          message: result.message 
        }]);
      }
    } catch (error) {
      console.error("Error syncing game score:", error);
      setSyncResults(prev => [...prev, { 
        success: false, 
        week: "Score Update", 
        message: "Failed to sync score" 
      }]);
    } finally {
      setSyncingScores(false);
    }
  };

  const syncWeekScores = async (season: number, week: number, seasonType: string) => {
    setSyncingScores(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("No auth token");

      const response = await fetch("/api/admin/sync-scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "sync_week",
          season: season,
          week: week,
          seasonType: seasonType,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Reload games to show updated scores
        loadGames();
        setSyncResults(prev => [...prev, { 
          success: true, 
          week: `Week ${week} Scores`, 
          message: result.message 
        }]);
      } else {
        setSyncResults(prev => [...prev, { 
          success: false, 
          week: `Week ${week} Scores`, 
          message: result.message 
        }]);
      }
    } catch (error) {
      console.error("Error syncing week scores:", error);
      setSyncResults(prev => [...prev, { 
        success: false, 
        week: `Week ${week} Scores`, 
        message: "Failed to sync scores" 
      }]);
    } finally {
      setSyncingScores(false);
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

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600">Manage games and sync schedule data</p>
          <div className="mt-4">
            <Button
              onClick={() => router.push("/admin/picks")}
              variant="outline"
            >
              Manage User Picks
            </Button>
          </div>
        </div>

        <div className="mb-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real NFL Data Sync</CardTitle>
              <CardDescription>
                Sync real NFL games from ESPN API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={syncPreseason}
                  disabled={syncing}
                  variant="outline"
                >
                  {syncing ? "Syncing..." : "Sync Preseason (3 weeks)"}
                </Button>
                <Button
                  onClick={syncRegularSeason}
                  disabled={syncing}
                  variant="outline"
                >
                  {syncing ? "Syncing..." : "Sync Regular Season (Weeks 1-8)"}
                </Button>
                <Button
                  onClick={syncMockGames}
                  disabled={syncing}
                  variant="secondary"
                >
                  Sync Mock Week 1
                </Button>
                <Button
                  onClick={processAwards}
                  disabled={syncing}
                  variant="outline"
                  className="bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                >
                  {syncing ? "Processing..." : "🏆 Process Weekly Awards"}
                </Button>
              </div>
              
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Real-Time Score Sync</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => syncWeekScores(2025, 1, "regular")}
                    disabled={syncingScores}
                    variant="outline"
                    className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    {syncingScores ? "Syncing..." : "🔄 Sync Week 1 Scores"}
                  </Button>
                  <Button
                    onClick={() => syncWeekScores(2025, 2, "regular")}
                    disabled={syncingScores}
                    variant="outline"
                    className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    {syncingScores ? "Syncing..." : "🔄 Sync Week 2 Scores"}
                  </Button>
                  <Button
                    onClick={() => syncWeekScores(2025, 3, "regular")}
                    disabled={syncingScores}
                    variant="outline"
                    className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    {syncingScores ? "Syncing..." : "🔄 Sync Week 3 Scores"}
                  </Button>
              </div>

              {syncResults.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Sync Results:</h4>
                  <div className="space-y-1 text-sm">
                    {syncResults.map((result, index) => (
                      <div
                        key={index}
                        className={`${
                          result.success ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        Week {result.week}: {result.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Games ({games.length})</h2>
          {games.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">
                  No games found. Sync the schedule to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            games.map((game) => (
              <Card key={game.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">
                      {game.away_team} @ {game.home_team}
                    </CardTitle>
                    <div className="text-sm text-gray-500">
                      {formatGameTime(game.game_time)}
                    </div>
                  </div>
                  <CardDescription>
                    {game.season} • Week {game.week} • {game.season_type} •
                    Status: {game.status}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      {game.status === "completed" ? (
                        <div className="text-lg font-semibold">
                          Final: {game.away_team} {game.away_score} -{" "}
                          {game.home_team} {game.home_score}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          {game.home_score !== null && game.away_score !== null ? (
                            <div>
                              Current: {game.away_team} {game.away_score} - {game.home_team} {game.home_score}
                            </div>
                          ) : (
                            <div>Game not completed yet</div>
                          )}
                        </div>
                      )}
                    </div>
                    {game.espn_id && (
                      <Button
                        onClick={() => syncGameScore(game.id)}
                        disabled={syncingScores}
                        size="sm"
                        variant="outline"
                        className="ml-4"
                      >
                        {syncingScores ? "Syncing..." : "🔄 Sync Score"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
