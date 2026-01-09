"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/config/supabase";
import { Lock, Check, X, Trophy } from "lucide-react";

interface Game {
  id: string;
  week: number;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  game_time: string;
  status: string;
  tv: string | null;
  espn_id: string;
}

interface Pick {
  id: string;
  game_id: string;
  picked_team: string;
  is_lock: boolean;
  pick_points: number | null;
  bonus_points: number | null;
}

interface PlayoffBracketProps {
  userId: string;
}

export default function PlayoffBracket({ userId }: PlayoffBracketProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [locksUsed, setLocksUsed] = useState(0);

  useEffect(() => {
    loadPlayoffData();
  }, [userId]);

  const loadPlayoffData = async () => {
    try {
      setLoading(true);

      // Load all playoff games
      const { data: gamesData, error: gamesError } = await supabase
        .from("games")
        .select("*")
        .eq("season", 2025)
        .eq("season_type", "playoffs")
        .order("week", { ascending: true })
        .order("game_time", { ascending: true });

      if (gamesError) throw gamesError;

      // Load user picks for playoff games
      const { data: picksData, error: picksError } = await supabase
        .from("picks")
        .select("*")
        .eq("user_id", userId)
        .in(
          "game_id",
          gamesData?.map((g) => g.id) || []
        );

      if (picksError) throw picksError;

      setGames(gamesData || []);
      setPicks(picksData || []);
      setLocksUsed(picksData?.filter((p) => p.is_lock).length || 0);
    } catch (error) {
      console.error("Error loading playoff data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickTeam = async (gameId: string, team: string, isLock: boolean = false) => {
    const game = games.find((g) => g.id === gameId);
    if (!game) return;

    // Check if game has started
    const gameTime = new Date(game.game_time);
    const now = new Date();
    if (now >= gameTime) {
      alert("This game has already started!");
      return;
    }

    // Check lock limit for playoff (allow 3 locks per round)
    if (isLock) {
      const currentPick = picks.find((p) => p.game_id === gameId);
      const roundLocks = picks.filter(
        (p) => {
          const pickGame = games.find((g) => g.id === p.game_id);
          return pickGame?.week === game.week && p.is_lock;
        }
      ).length;

      // If not currently locked and would exceed limit
      if (!currentPick?.is_lock && roundLocks >= 3) {
        alert("You can only lock 3 picks per playoff round!");
        return;
      }
    }

    try {
      const existingPick = picks.find((p) => p.game_id === gameId);

      if (existingPick) {
        // Update existing pick
        const { error } = await supabase
          .from("picks")
          .update({ picked_team: team, is_lock: isLock })
          .eq("id", existingPick.id);

        if (error) throw error;

        setPicks((prev) =>
          prev.map((p) =>
            p.id === existingPick.id ? { ...p, picked_team: team, is_lock: isLock } : p
          )
        );
      } else {
        // Create new pick
        const { data, error } = await supabase
          .from("picks")
          .insert({
            user_id: userId,
            game_id: gameId,
            picked_team: team,
            is_lock: isLock,
          })
          .select()
          .single();

        if (error) throw error;

        setPicks((prev) => [...prev, data]);
      }

      // Recalculate locks used
      const newPicks = picks.map((p) =>
        p.game_id === gameId ? { ...p, picked_team: team, is_lock: isLock } : p
      );
      setLocksUsed(newPicks.filter((p) => p.is_lock).length);
    } catch (error) {
      console.error("Error saving pick:", error);
      alert("Failed to save pick. Please try again.");
    }
  };

  const renderGame = (game: Game) => {
    const pick = picks.find((p) => p.game_id === game.id);
    const gameTime = new Date(game.game_time);
    const hasStarted = new Date() >= gameTime;
    const isPicked = !!pick;
    const isLocked = pick?.is_lock || false;

    const homeSelected = pick?.picked_team === game.home_team;
    const awaySelected = pick?.picked_team === game.away_team;

    // Determine if pick was correct (for completed games)
    let pickResult: "correct" | "incorrect" | null = null;
    if (game.status === "completed" && isPicked) {
      if (game.home_score !== null && game.away_score !== null) {
        const winner =
          game.home_score > game.away_score ? game.home_team : game.away_team;
        pickResult = pick.picked_team === winner ? "correct" : "incorrect";
      }
    }

    return (
      <Card
        key={game.id}
        className="bg-gray-800 border-gray-600 hover:border-gray-500 transition-colors"
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-400">
              {gameTime.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
            {game.tv && (
              <div className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                {game.tv}
              </div>
            )}
          </div>

          {/* Away Team */}
          <button
            onClick={() => !hasStarted && handlePickTeam(game.id, game.away_team, false)}
            disabled={hasStarted}
            className={`w-full p-3 rounded-lg mb-2 transition-all ${
              awaySelected
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            } ${hasStarted ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {awaySelected && pickResult === "correct" && (
                  <Check className="w-4 h-4 text-green-400" />
                )}
                {awaySelected && pickResult === "incorrect" && (
                  <X className="w-4 h-4 text-red-400" />
                )}
                <span className="font-medium">
                  {game.away_team === "TBD" ? "TBD" : game.away_team}
                </span>
              </div>
              {game.away_score !== null && (
                <span className="text-2xl font-bold">{game.away_score}</span>
              )}
            </div>
          </button>

          {/* Home Team */}
          <button
            onClick={() => !hasStarted && handlePickTeam(game.id, game.home_team, false)}
            disabled={hasStarted}
            className={`w-full p-3 rounded-lg mb-2 transition-all ${
              homeSelected
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            } ${hasStarted ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {homeSelected && pickResult === "correct" && (
                  <Check className="w-4 h-4 text-green-400" />
                )}
                {homeSelected && pickResult === "incorrect" && (
                  <X className="w-4 h-4 text-red-400" />
                )}
                <span className="font-medium">
                  {game.home_team === "TBD" ? "TBD" : game.home_team}
                </span>
              </div>
              {game.home_score !== null && (
                <span className="text-2xl font-bold">{game.home_score}</span>
              )}
            </div>
          </button>

          {/* Lock Button */}
          {isPicked && !hasStarted && (
            <button
              onClick={() =>
                handlePickTeam(game.id, pick.picked_team, !isLocked)
              }
              className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
                isLocked
                  ? "bg-yellow-600 text-white hover:bg-yellow-700"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                {isLocked ? "Locked (2x Points)" : "Lock This Pick"}
              </div>
            </button>
          )}

          {/* Points Display (for completed games) */}
          {game.status === "completed" && isPicked && (
            <div className="mt-2 text-center">
              <span
                className={`text-sm font-medium ${
                  pickResult === "correct" ? "text-green-400" : "text-red-400"
                }`}
              >
                {pick.pick_points !== null &&
                  `${(pick.pick_points || 0) + (pick.bonus_points || 0)} pts`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const wildCardGames = games.filter((g) => g.week === 1);
  const divisionalGames = games.filter((g) => g.week === 2);
  const championshipGames = games.filter((g) => g.week === 3);
  const superBowl = games.filter((g) => g.week === 4);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          <Trophy className="w-8 h-8 inline-block mr-2 text-yellow-400" />
          2025 NFL Playoffs
        </h1>
        <p className="text-gray-400">
          Make your picks for each playoff round. Lock up to 3 picks per round for double points!
        </p>
      </div>

      {/* Wild Card Round */}
      {wildCardGames.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">
            🏈 Wild Card Round (Week 1)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wildCardGames.map((game) => renderGame(game))}
          </div>
        </div>
      )}

      {/* Divisional Round */}
      {divisionalGames.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">
            🏈 Divisional Round (Week 2)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {divisionalGames.map((game) => renderGame(game))}
          </div>
        </div>
      )}

      {/* Conference Championships */}
      {championshipGames.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">
            🏆 Conference Championships (Week 3)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {championshipGames.map((game) => renderGame(game))}
          </div>
        </div>
      )}

      {/* Super Bowl */}
      {superBowl.length > 0 && (
        <div>
          <h2 className="text-3xl font-bold text-white mb-4 text-center">
            🏆 Super Bowl LX (Week 4)
          </h2>
          <div className="max-w-md mx-auto">
            {superBowl.map((game) => renderGame(game))}
          </div>
        </div>
      )}
    </div>
  );
}

