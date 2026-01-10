"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/config/supabase";
import {
  Lock,
  Check,
  X,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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

interface BracketPick {
  [gameId: string]: string; // gameId -> predicted winner team name
}

interface TeamSeed {
  team: string;
  seed: number;
}

interface PlayoffBracketProps {
  userId: string;
}

// Team conference mapping
const AFC_TEAMS = [
  "Buffalo Bills",
  "Kansas City Chiefs",
  "Baltimore Ravens",
  "Houston Texans",
  "Los Angeles Chargers",
  "Pittsburgh Steelers",
  "Denver Broncos",
  "Jacksonville Jaguars",
  "Miami Dolphins",
  "Cincinnati Bengals",
  "Indianapolis Colts",
  "Cleveland Browns",
  "New York Jets",
  "Tennessee Titans",
  "New England Patriots",
  "Las Vegas Raiders",
];

const NFC_TEAMS = [
  "Detroit Lions",
  "Philadelphia Eagles",
  "Tampa Bay Buccaneers",
  "Los Angeles Rams",
  "Minnesota Vikings",
  "Green Bay Packers",
  "Washington Commanders",
  "Seattle Seahawks",
  "Atlanta Falcons",
  "Arizona Cardinals",
  "San Francisco 49ers",
  "Chicago Bears",
  "Dallas Cowboys",
  "New Orleans Saints",
  "Carolina Panthers",
  "New York Giants",
];

// NFL Playoff Seeding (7 teams per conference)
// Based on actual 2025-2026 playoff matchups (Wild Card Round: Jan 10-13, 2026)
const AFC_SEEDS: { [team: string]: number } = {
  "Denver Broncos": 1, // BYE (13-3, AFC West)
  "New England Patriots": 2, // vs #7 Chargers (13-3, AFC East)
  "Jacksonville Jaguars": 3, // vs #6 Bills (13-4, AFC South)
  "Pittsburgh Steelers": 4, // vs #5 Texans (10-7, AFC North)
  "Houston Texans": 5, // Wild Card (12-5)
  "Buffalo Bills": 6, // Wild Card (12-5)
  "Los Angeles Chargers": 7, // Wild Card (11-6)
};

const NFC_SEEDS: { [team: string]: number } = {
  "Seattle Seahawks": 1, // BYE (14-3, NFC West)
  "Chicago Bears": 2, // vs #7 Packers (11-6, NFC North)
  "Philadelphia Eagles": 3, // vs #6 49ers (11-6, NFC East)
  "Carolina Panthers": 4, // vs #5 Rams (8-9, NFC South)
  "Los Angeles Rams": 5, // Wild Card (12-5)
  "San Francisco 49ers": 6, // Wild Card (12-5)
  "Green Bay Packers": 7, // Wild Card (9-7-1)
};

// Explicit game mappings using ESPN IDs for proper bracket flow
// This ensures each of the 13 games is handled separately with correct conference isolation
const GAME_MAPPINGS: {
  [espnId: string]: {
    conference: "AFC" | "NFC";
    feedsInto?: string;
    feedsIntoPosition?: "home" | "away";
  };
} = {
  // NFC Wild Card (3 games)
  "401772979": {
    conference: "NFC",
    feedsInto: "401772982",
    feedsIntoPosition: "away",
  }, // Panthers/Rams → NFC Div Game 1 (lower seed)
  "401772981": {
    conference: "NFC",
    feedsInto: "401772982",
    feedsIntoPosition: "away",
  }, // Bears/Packers → NFC Div Game 1 (plays #1 Seahawks)
  "401772980": { conference: "NFC", feedsInto: "401772983" }, // Eagles/49ers → NFC Div Game 2

  // AFC Wild Card (3 games)
  "401772977": {
    conference: "AFC",
    feedsInto: "401772984",
    feedsIntoPosition: "away",
  }, // Jaguars/Bills → AFC Div Game 1 (plays #1 Broncos)
  "401772978": {
    conference: "AFC",
    feedsInto: "401772984",
    feedsIntoPosition: "away",
  }, // Patriots/Chargers → AFC Div Game 1 (lower seed)
  "401772976": { conference: "AFC", feedsInto: "401772985" }, // Steelers/Texans → AFC Div Game 2

  // NFC Divisional (2 games)
  "401772982": { conference: "NFC", feedsInto: "401772986" }, // NFC Div 1 → NFC Championship
  "401772983": { conference: "NFC", feedsInto: "401772986" }, // NFC Div 2 → NFC Championship

  // AFC Divisional (2 games)
  "401772984": { conference: "AFC", feedsInto: "401772987" }, // AFC Div 1 → AFC Championship
  "401772985": { conference: "AFC", feedsInto: "401772987" }, // AFC Div 2 → AFC Championship

  // Conference Championships (2 games)
  "401772986": {
    conference: "NFC",
    feedsInto: "401772988",
    feedsIntoPosition: "home",
  }, // NFC Champ → Super Bowl home
  "401772987": {
    conference: "AFC",
    feedsInto: "401772988",
    feedsIntoPosition: "away",
  }, // AFC Champ → Super Bowl away

  // Super Bowl (1 game)
  "401772988": { conference: "AFC" }, // Super Bowl (neutral site, no feedsInto)
};

export default function PlayoffBracket({ userId }: PlayoffBracketProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [bracketPicks, setBracketPicks] = useState<BracketPick>({});
  const [loading, setLoading] = useState(true);

  // Mobile swipe carousel state
  const [currentRound, setCurrentRound] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const roundNames = ["Wild Card", "Divisional", "Conference", "Super Bowl"];
  const minSwipeDistance = 50;

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
        .in("game_id", gamesData?.map((g) => g.id) || []);

      if (picksError) throw picksError;

      setGames(gamesData || []);
      setPicks(picksData || []);

      // Build bracket picks map from existing picks
      const bracketMap: BracketPick = {};
      picksData?.forEach((pick) => {
        bracketMap[pick.game_id] = pick.picked_team;
      });
      setBracketPicks(bracketMap);
    } catch (error) {
      console.error("Error loading playoff data:", error);
    } finally {
      setLoading(false);
    }
  };

  const isAFC = (teamName: string) => {
    return AFC_TEAMS.includes(teamName);
  };

  const getSeed = (teamName: string): number | null => {
    if (teamName === "TBD") return null;
    return AFC_SEEDS[teamName] || NFC_SEEDS[teamName] || null;
  };

  // Extract just the team name (last word) - e.g., "Buffalo Bills" -> "Bills"
  const getTeamName = (fullName: string) => {
    if (fullName === "TBD") return "TBD";
    const parts = fullName.split(" ");
    return parts[parts.length - 1];
  };

  // Get the predicted winner for a game based on bracket picks
  const getPredictedWinner = (game: Game) => {
    return bracketPicks[game.id];
  };

  // Calculate what team should show in next round based on predictions
  const getDisplayTeam = (game: Game, position: "home" | "away") => {
    const team = position === "home" ? game.home_team : game.away_team;

    // If it's a TBD slot, check if we can fill it with a predicted winner from previous round
    if (team === "TBD" && game.week > 1) {
      // Find the feeding game from previous round
      const feedingWinner = findFeedingWinner(game, position);
      if (feedingWinner) return feedingWinner;
    }

    return team;
  };

  // Find which team should advance to this TBD slot based on bracket picks
  // Uses explicit ESPN ID mappings to ensure proper bracket flow
  const findFeedingWinner = (
    game: Game,
    position: "home" | "away"
  ): string | null => {
    if (game.week === 1 || !game.espn_id) return null;

    const gameMapping = GAME_MAPPINGS[game.espn_id];
    if (!gameMapping) return null;

    const conference = gameMapping.conference;

    // For divisional round (week 2)
    if (game.week === 2) {
      // Find wild card games that feed into this divisional game
      const feedingGames = games.filter((g) => {
        if (g.week !== 1) return false;
        const feedsInto = GAME_MAPPINGS[g.espn_id]?.feedsInto;
        return feedsInto === game.espn_id;
      });

      if (feedingGames.length === 0) return null;

      // Get winners with their seeds
      const winners: TeamSeed[] = feedingGames
        .map((g) => {
          const winner = bracketPicks[g.id];
          if (!winner || winner === "TBD") return null;
          const seed = getSeed(winner);
          if (!seed) return null;
          return { team: winner, seed };
        })
        .filter((w): w is TeamSeed => w !== null);

      if (winners.length === 0) return null;

      // Sort by seed (lower number = better seed)
      winners.sort((a, b) => a.seed - b.seed);

      // If 2 games feed into this divisional game, it's the #1 seed game
      // The #1 seed plays the lowest remaining wild card winner
      if (feedingGames.length === 2) {
        if (position === "home") {
          // #1 seed is always home in divisional
          return conference === "AFC" ? "Denver Broncos" : "Seattle Seahawks";
        } else if (position === "away") {
          // Lowest remaining seed plays #1 seed
          return winners[winners.length - 1]?.team || null;
        }
      } else {
        // If only 1 game feeds in, this is where the other two wild card winners play
        // We need to find the other wild card winners (not the one that plays #1 seed)
        const allWildCardGames = games.filter((g) => g.week === 1);
        const conferenceWildCard = allWildCardGames.filter(
          (g) => GAME_MAPPINGS[g.espn_id]?.conference === conference
        );

        // Get all wild card winners
        const allWinners: TeamSeed[] = conferenceWildCard
          .map((g) => {
            const winner = bracketPicks[g.id];
            if (!winner || winner === "TBD") return null;
            const seed = getSeed(winner);
            if (!seed) return null;
            return { team: winner, seed };
          })
          .filter((w): w is TeamSeed => w !== null);

        if (allWinners.length < 2) return null;

        // Sort by seed
        allWinners.sort((a, b) => a.seed - b.seed);

        // The two higher seeds (excluding the lowest) play each other
        if (position === "home" && allWinners.length >= 2) {
          return allWinners[0]?.team || null; // Highest seed
        } else if (position === "away" && allWinners.length >= 2) {
          return allWinners[1]?.team || null; // Middle seed
        }
      }
    }

    // For conference championship (week 3)
    if (game.week === 3) {
      // Find divisional games that feed into this championship game
      const feedingGames = games.filter((g) => {
        if (g.week !== 2) return false;
        const feedsInto = GAME_MAPPINGS[g.espn_id]?.feedsInto;
        return feedsInto === game.espn_id;
      });

      const winners = feedingGames
        .map((g) => bracketPicks[g.id])
        .filter((w) => w && w !== "TBD");

      if (position === "home" && winners.length > 0) {
        return winners[0];
      } else if (position === "away" && winners.length > 1) {
        return winners[1];
      }
    }

    // For Super Bowl (week 4)
    if (game.week === 4) {
      // Find championship games that feed into Super Bowl
      const afcChamp = games.find((g) => g.espn_id === "401772987"); // AFC Championship
      const nfcChamp = games.find((g) => g.espn_id === "401772986"); // NFC Championship

      if (position === "away" && afcChamp) {
        return bracketPicks[afcChamp.id] || null;
      } else if (position === "home" && nfcChamp) {
        return bracketPicks[nfcChamp.id] || null;
      }
    }

    return null;
  };

  const handlePickWinner = async (gameId: string, team: string) => {
    const game = games.find((g) => g.id === gameId);
    if (!game) return;

    // Check if game has started
    const gameTime = new Date(game.game_time);
    const now = new Date();
    if (now >= gameTime && game.status !== "scheduled") {
      alert("This game has already started!");
      return;
    }

    try {
      const existingPick = picks.find((p) => p.game_id === gameId);

      if (existingPick) {
        // Update existing pick
        const { error } = await supabase
          .from("picks")
          .update({ picked_team: team })
          .eq("id", existingPick.id);

        if (error) throw error;

        setPicks((prev) =>
          prev.map((p) =>
            p.id === existingPick.id ? { ...p, picked_team: team } : p
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
            is_lock: false,
          })
          .select()
          .single();

        if (error) throw error;
        setPicks((prev) => [...prev, data]);
      }

      // Update bracket picks - this will trigger re-render and show team in next round
      setBracketPicks((prev) => ({ ...prev, [gameId]: team }));
    } catch (error) {
      console.error("Error saving pick:", error);
      alert("Failed to save pick. Please try again.");
    }
  };

  const toggleLock = async (gameId: string) => {
    const pick = picks.find((p) => p.game_id === gameId);
    if (!pick) return;

    const game = games.find((g) => g.id === gameId);
    if (!game) return;

    const gameTime = new Date(game.game_time);
    const now = new Date();
    if (now >= gameTime) {
      alert("Game has started - cannot change lock status");
      return;
    }

    try {
      const newLockStatus = !pick.is_lock;

      const { error } = await supabase
        .from("picks")
        .update({ is_lock: newLockStatus })
        .eq("id", pick.id);

      if (error) throw error;

      setPicks((prev) =>
        prev.map((p) =>
          p.id === pick.id ? { ...p, is_lock: newLockStatus } : p
        )
      );
    } catch (error) {
      console.error("Error toggling lock:", error);
    }
  };

  const renderMatchup = (game: Game) => {
    const pick = picks.find((p) => p.game_id === game.id);
    const predictedWinner = bracketPicks[game.id];
    const gameTime = new Date(game.game_time);
    const hasStarted = new Date() >= gameTime;

    // Get display teams (may be predicted from previous rounds)
    const displayAwayTeam = getDisplayTeam(game, "away");
    const displayHomeTeam = getDisplayTeam(game, "home");

    const homeSelected = predictedWinner === displayHomeTeam;
    const awaySelected = predictedWinner === displayAwayTeam;

    const isLocked = pick?.is_lock || false;

    // Determine result for completed games
    let pickResult: "correct" | "incorrect" | null = null;
    if (game.status === "completed" && pick) {
      if (game.home_score !== null && game.away_score !== null) {
        const actualWinner =
          game.home_score > game.away_score ? game.home_team : game.away_team;
        pickResult =
          pick.picked_team === actualWinner ? "correct" : "incorrect";
      }
    }

    return (
      <div className="bg-gray-800 border border-gray-600 rounded overflow-hidden hover:border-gray-500 transition-colors">
        {/* Game Info */}
        <div className="bg-gray-900 px-1 sm:px-2 py-0.5 sm:py-1 text-center border-b border-gray-600">
          <div className="text-[8px] sm:text-[10px] md:text-xs text-gray-400 truncate">
            {gameTime.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
            {game.tv && ` • ${game.tv}`}
          </div>
        </div>

        {/* Teams */}
        <div className="divide-y divide-gray-700">
          {/* Away Team */}
          <button
            onClick={() =>
              !hasStarted &&
              displayAwayTeam !== "TBD" &&
              handlePickWinner(game.id, displayAwayTeam)
            }
            disabled={hasStarted || displayAwayTeam === "TBD"}
            className={`w-full px-1 sm:px-2 py-1 sm:py-1.5 transition-all flex items-center justify-between ${
              awaySelected
                ? "bg-blue-600 text-white"
                : displayAwayTeam === "TBD"
                ? "bg-gray-900 text-gray-600"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            } ${
              hasStarted || displayAwayTeam === "TBD"
                ? "cursor-not-allowed"
                : "cursor-pointer"
            }`}
          >
            <div className="flex items-center gap-1 min-w-0">
              {getSeed(displayAwayTeam) && (
                <span className="text-[8px] sm:text-xs font-bold text-gray-500 flex-shrink-0">
                  {getSeed(displayAwayTeam)}
                </span>
              )}
              <span className="font-medium text-[9px] sm:text-xs md:text-sm truncate">
                {getTeamName(displayAwayTeam)}
              </span>
              {awaySelected && isLocked && (
                <Lock className="w-2 h-2 sm:w-3 sm:h-3 text-yellow-400 flex-shrink-0" />
              )}
              {awaySelected && pickResult === "correct" && (
                <Check className="w-2 h-2 sm:w-3 sm:h-3 text-green-400 flex-shrink-0" />
              )}
              {awaySelected && pickResult === "incorrect" && (
                <X className="w-2 h-2 sm:w-3 sm:h-3 text-red-400 flex-shrink-0" />
              )}
            </div>
            {game.away_score !== null && (
              <span className="text-xs sm:text-sm md:text-lg font-bold flex-shrink-0">
                {game.away_score}
              </span>
            )}
          </button>

          {/* Home Team */}
          <button
            onClick={() =>
              !hasStarted &&
              displayHomeTeam !== "TBD" &&
              handlePickWinner(game.id, displayHomeTeam)
            }
            disabled={hasStarted || displayHomeTeam === "TBD"}
            className={`w-full px-1 sm:px-2 py-1 sm:py-1.5 transition-all flex items-center justify-between ${
              homeSelected
                ? "bg-blue-600 text-white"
                : displayHomeTeam === "TBD"
                ? "bg-gray-900 text-gray-600"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            } ${
              hasStarted || displayHomeTeam === "TBD"
                ? "cursor-not-allowed"
                : "cursor-pointer"
            }`}
          >
            <div className="flex items-center gap-1 min-w-0">
              {getSeed(displayHomeTeam) && (
                <span className="text-[8px] sm:text-xs font-bold text-gray-500 flex-shrink-0">
                  {getSeed(displayHomeTeam)}
                </span>
              )}
              <span className="font-medium text-[9px] sm:text-xs md:text-sm truncate">
                {getTeamName(displayHomeTeam)}
              </span>
              {homeSelected && isLocked && (
                <Lock className="w-2 h-2 sm:w-3 sm:h-3 text-yellow-400 flex-shrink-0" />
              )}
              {homeSelected && pickResult === "correct" && (
                <Check className="w-2 h-2 sm:w-3 sm:h-3 text-green-400 flex-shrink-0" />
              )}
              {homeSelected && pickResult === "incorrect" && (
                <X className="w-2 h-2 sm:w-3 sm:h-3 text-red-400 flex-shrink-0" />
              )}
            </div>
            {game.home_score !== null && (
              <span className="text-xs sm:text-sm md:text-lg font-bold flex-shrink-0">
                {game.home_score}
              </span>
            )}
          </button>
        </div>

        {/* Lock Toggle */}
        {predictedWinner && !hasStarted && (
          <button
            onClick={() => toggleLock(game.id)}
            className={`w-full py-1 text-[8px] sm:text-[10px] md:text-xs font-medium transition-all border-t border-gray-700 ${
              isLocked
                ? "bg-yellow-600 text-white hover:bg-yellow-700"
                : "bg-gray-900 text-gray-400 hover:bg-gray-800"
            }`}
          >
            {isLocked ? "🔒" : "Lock"}
          </button>
        )}

        {/* Points */}
        {game.status === "completed" && pick && pick.pick_points !== null && (
          <div className="bg-gray-900 py-0.5 text-center border-t border-gray-700">
            <span
              className={`text-[8px] sm:text-[10px] md:text-xs font-bold ${
                pickResult === "correct" ? "text-green-400" : "text-red-400"
              }`}
            >
              {(pick.pick_points || 0) + (pick.bonus_points || 0)} pts
            </span>
          </div>
        )}
      </div>
    );
  };

  // Render #1 seed placeholder
  const renderByeTeam = (teamName: string, seed: number) => {
    return (
      <div className="bg-gray-800 border border-yellow-600 rounded p-1 sm:p-2">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-yellow-400 font-bold text-[8px] sm:text-xs flex-shrink-0">
              #{seed}
            </span>
            <span className="font-bold text-white text-[9px] sm:text-xs md:text-sm truncate">
              {getTeamName(teamName)}
            </span>
          </div>
          <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 flex-shrink-0" />
        </div>
        <div className="text-[7px] sm:text-[9px] md:text-xs text-gray-400 mt-0.5">
          BYE
        </div>
      </div>
    );
  };

  // Mobile: Render #1 seed placeholder with full team name
  const renderMobileByeTeam = (teamName: string, seed: number) => {
    return (
      <div className="bg-gray-800 border-2 border-yellow-600 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-yellow-600 text-white font-bold text-sm px-2 py-1 rounded">
              #{seed}
            </span>
            <span className="font-bold text-white text-lg">{teamName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-sm font-medium">BYE</span>
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
        </div>
      </div>
    );
  };

  // Mobile: Render matchup with full team names and large touch targets
  const renderMobileMatchup = (game: Game) => {
    const pick = picks.find((p) => p.game_id === game.id);
    const predictedWinner = bracketPicks[game.id];
    const gameTime = new Date(game.game_time);
    const hasStarted = new Date() >= gameTime;

    // Get display teams (may be predicted from previous rounds)
    const displayAwayTeam = getDisplayTeam(game, "away");
    const displayHomeTeam = getDisplayTeam(game, "home");

    const homeSelected = predictedWinner === displayHomeTeam;
    const awaySelected = predictedWinner === displayAwayTeam;

    const isLocked = pick?.is_lock || false;

    // Determine result for completed games
    let pickResult: "correct" | "incorrect" | null = null;
    if (game.status === "completed" && pick) {
      if (game.home_score !== null && game.away_score !== null) {
        const actualWinner =
          game.home_score > game.away_score ? game.home_team : game.away_team;
        pickResult =
          pick.picked_team === actualWinner ? "correct" : "incorrect";
      }
    }

    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg overflow-hidden">
        {/* Game Info */}
        <div className="bg-gray-900 px-4 py-2 text-center border-b border-gray-600">
          <div className="text-sm text-gray-400">
            {gameTime.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
            {" • "}
            {gameTime.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
            {game.tv && ` • ${game.tv}`}
          </div>
        </div>

        {/* Teams */}
        <div className="divide-y divide-gray-700">
          {/* Away Team */}
          <button
            onClick={() =>
              !hasStarted &&
              displayAwayTeam !== "TBD" &&
              handlePickWinner(game.id, displayAwayTeam)
            }
            disabled={hasStarted || displayAwayTeam === "TBD"}
            className={`w-full px-4 py-4 transition-all flex items-center justify-between ${
              awaySelected
                ? "bg-blue-600 text-white"
                : displayAwayTeam === "TBD"
                ? "bg-gray-900 text-gray-600"
                : "bg-gray-800 text-gray-300 active:bg-gray-700"
            } ${
              hasStarted || displayAwayTeam === "TBD"
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer"
            }`}
          >
            <div className="flex items-center gap-3">
              {getSeed(displayAwayTeam) && (
                <span
                  className={`text-sm font-bold px-2 py-0.5 rounded ${
                    awaySelected
                      ? "bg-blue-700 text-white"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {getSeed(displayAwayTeam)}
                </span>
              )}
              <span className="font-semibold text-base">{displayAwayTeam}</span>
              {awaySelected && isLocked && (
                <Lock className="w-4 h-4 text-yellow-400" />
              )}
              {awaySelected && pickResult === "correct" && (
                <Check className="w-5 h-5 text-green-400" />
              )}
              {awaySelected && pickResult === "incorrect" && (
                <X className="w-5 h-5 text-red-400" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {game.away_score !== null && (
                <span className="text-xl font-bold">{game.away_score}</span>
              )}
              {!hasStarted && displayAwayTeam !== "TBD" && (
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    awaySelected ? "border-white bg-white" : "border-gray-500"
                  }`}
                >
                  {awaySelected && <Check className="w-4 h-4 text-blue-600" />}
                </div>
              )}
            </div>
          </button>

          {/* VS Divider */}
          <div className="bg-gray-900 py-1 text-center">
            <span className="text-xs text-gray-500 font-medium">VS</span>
          </div>

          {/* Home Team */}
          <button
            onClick={() =>
              !hasStarted &&
              displayHomeTeam !== "TBD" &&
              handlePickWinner(game.id, displayHomeTeam)
            }
            disabled={hasStarted || displayHomeTeam === "TBD"}
            className={`w-full px-4 py-4 transition-all flex items-center justify-between ${
              homeSelected
                ? "bg-blue-600 text-white"
                : displayHomeTeam === "TBD"
                ? "bg-gray-900 text-gray-600"
                : "bg-gray-800 text-gray-300 active:bg-gray-700"
            } ${
              hasStarted || displayHomeTeam === "TBD"
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer"
            }`}
          >
            <div className="flex items-center gap-3">
              {getSeed(displayHomeTeam) && (
                <span
                  className={`text-sm font-bold px-2 py-0.5 rounded ${
                    homeSelected
                      ? "bg-blue-700 text-white"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {getSeed(displayHomeTeam)}
                </span>
              )}
              <span className="font-semibold text-base">{displayHomeTeam}</span>
              {homeSelected && isLocked && (
                <Lock className="w-4 h-4 text-yellow-400" />
              )}
              {homeSelected && pickResult === "correct" && (
                <Check className="w-5 h-5 text-green-400" />
              )}
              {homeSelected && pickResult === "incorrect" && (
                <X className="w-5 h-5 text-red-400" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {game.home_score !== null && (
                <span className="text-xl font-bold">{game.home_score}</span>
              )}
              {!hasStarted && displayHomeTeam !== "TBD" && (
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    homeSelected ? "border-white bg-white" : "border-gray-500"
                  }`}
                >
                  {homeSelected && <Check className="w-4 h-4 text-blue-600" />}
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Lock Toggle */}
        {predictedWinner && !hasStarted && (
          <button
            onClick={() => toggleLock(game.id)}
            className={`w-full py-3 text-sm font-medium transition-all border-t border-gray-700 flex items-center justify-center gap-2 ${
              isLocked
                ? "bg-yellow-600 text-white active:bg-yellow-700"
                : "bg-gray-900 text-gray-400 active:bg-gray-800"
            }`}
          >
            <Lock className="w-4 h-4" />
            {isLocked ? "Locked for 2x Points" : "Tap to Lock (2x Points)"}
          </button>
        )}

        {/* Points */}
        {game.status === "completed" && pick && pick.pick_points !== null && (
          <div className="bg-gray-900 py-2 text-center border-t border-gray-700">
            <span
              className={`text-sm font-bold ${
                pickResult === "correct" ? "text-green-400" : "text-red-400"
              }`}
            >
              {(pick.pick_points || 0) + (pick.bonus_points || 0)} points
            </span>
          </div>
        )}
      </div>
    );
  };

  // Mobile: Render a full round slide
  const renderMobileRound = (
    roundIndex: number,
    afcGames: Game[],
    nfcGames: Game[],
    afcByeTeam?: string,
    nfcByeTeam?: string
  ) => {
    const roundName = roundNames[roundIndex];
    const isSuperBowl = roundIndex === 3;

    // Count picks made for this round
    const allGames = [...afcGames, ...nfcGames];
    const picksMade = allGames.filter((g) => bracketPicks[g.id]).length;
    const totalGames = allGames.length;

    return (
      <div className="w-full flex-shrink-0 px-4">
        {/* Round Header */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-white mb-1">
            {roundName} {!isSuperBowl && "Round"}
          </h2>
          <div className="text-sm text-gray-400">
            {picksMade}/{totalGames} picks made
          </div>
        </div>

        {isSuperBowl ? (
          // Super Bowl layout - single game
          <div className="space-y-4">
            <div className="text-center">
              <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <div className="text-sm text-gray-400 mb-4">February 8, 2026</div>
            </div>
            {afcGames[0] && renderMobileMatchup(afcGames[0])}
          </div>
        ) : (
          // Conference layout - AFC and NFC sections
          <div className="space-y-6">
            {/* AFC Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-red-600/50"></div>
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-wide">
                  AFC
                </h3>
                <div className="h-px flex-1 bg-red-600/50"></div>
              </div>
              <div className="space-y-3">
                {afcByeTeam && renderMobileByeTeam(afcByeTeam, 1)}
                {afcGames.map((game) => (
                  <div key={game.id}>{renderMobileMatchup(game)}</div>
                ))}
              </div>
            </div>

            {/* NFC Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-blue-600/50"></div>
                <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wide">
                  NFC
                </h3>
                <div className="h-px flex-1 bg-blue-600/50"></div>
              </div>
              <div className="space-y-3">
                {nfcByeTeam && renderMobileByeTeam(nfcByeTeam, 1)}
                {nfcGames.map((game) => (
                  <div key={game.id}>{renderMobileMatchup(game)}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Swipe navigation handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentRound < 3) {
      setCurrentRound((prev) => prev + 1);
    }
    if (isRightSwipe && currentRound > 0) {
      setCurrentRound((prev) => prev - 1);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  const goToRound = (index: number) => {
    setCurrentRound(index);
  };

  const nextRound = () => {
    if (currentRound < 3) {
      setCurrentRound((prev) => prev + 1);
    }
  };

  const prevRound = () => {
    if (currentRound > 0) {
      setCurrentRound((prev) => prev - 1);
    }
  };

  // Navigation dots component
  const renderNavigationDots = () => {
    return (
      <div className="flex items-center justify-center gap-2 py-3">
        {roundNames.map((name, index) => (
          <button
            key={name}
            onClick={() => goToRound(index)}
            className={`transition-all ${
              index === currentRound
                ? "w-8 h-2 bg-blue-500 rounded-full"
                : "w-2 h-2 bg-gray-600 rounded-full hover:bg-gray-500"
            }`}
            aria-label={`Go to ${name}`}
          />
        ))}
      </div>
    );
  };

  // Mobile navigation bar with arrows and round name
  const renderMobileNav = () => {
    return (
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 backdrop-blur sticky top-0 z-10">
        <button
          onClick={prevRound}
          disabled={currentRound === 0}
          className={`p-2 rounded-full transition-all ${
            currentRound === 0
              ? "text-gray-600 cursor-not-allowed"
              : "text-white bg-gray-700 active:bg-gray-600"
          }`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-sm font-bold text-white">
            {roundNames[currentRound]}
          </span>
          {renderNavigationDots()}
        </div>

        <button
          onClick={nextRound}
          disabled={currentRound === 3}
          className={`p-2 rounded-full transition-all ${
            currentRound === 3
              ? "text-gray-600 cursor-not-allowed"
              : "text-white bg-gray-700 active:bg-gray-600"
          }`}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Organize games by round and conference
  const wildCardGames = games.filter((g) => g.week === 1);
  const divisionalGames = games.filter((g) => g.week === 2);
  const championshipGames = games.filter((g) => g.week === 3);
  const superBowl = games.filter((g) => g.week === 4)[0];

  // Split by conference based on team names
  // AFC Wild Card (in order): Jaguars/Bills, Patriots/Chargers, Steelers/Texans
  const afcWildCard = wildCardGames
    .filter((g) => isAFC(g.home_team) && isAFC(g.away_team))
    .sort(
      (a, b) =>
        new Date(a.game_time).getTime() - new Date(b.game_time).getTime()
    );

  // NFC Wild Card (in order): Panthers/Rams, Bears/Packers, Eagles/49ers
  const nfcWildCard = wildCardGames
    .filter((g) => !isAFC(g.home_team) && !isAFC(g.away_team))
    .sort(
      (a, b) =>
        new Date(a.game_time).getTime() - new Date(b.game_time).getTime()
    );

  // Use explicit ESPN ID mappings to correctly separate AFC and NFC games
  const afcDivisional = divisionalGames
    .filter((g) => g.espn_id && GAME_MAPPINGS[g.espn_id]?.conference === "AFC")
    .sort(
      (a, b) =>
        new Date(a.game_time).getTime() - new Date(b.game_time).getTime()
    );

  const nfcDivisional = divisionalGames
    .filter((g) => g.espn_id && GAME_MAPPINGS[g.espn_id]?.conference === "NFC")
    .sort(
      (a, b) =>
        new Date(a.game_time).getTime() - new Date(b.game_time).getTime()
    );

  const afcChampionship = championshipGames.find(
    (g) => g.espn_id && GAME_MAPPINGS[g.espn_id]?.conference === "AFC"
  );

  const nfcChampionship = championshipGames.find(
    (g) => g.espn_id && GAME_MAPPINGS[g.espn_id]?.conference === "NFC"
  );

  // Top seeds based on actual 2025 season standings
  const afcOneSeed = "Denver Broncos"; // AFC #1 seed
  const nfcOneSeed = "Seattle Seahawks"; // NFC #1 seed (Correct!)

  return (
    <div className="pb-8">
      {/* Header - shown on both mobile and desktop */}
      <div className="text-center mb-4 px-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 inline-block mr-2 text-yellow-400" />
          2025 NFL Playoffs
        </h1>
        <p className="hidden md:block text-xs sm:text-sm md:text-base text-gray-400">
          Click teams to fill out your bracket • Lock picks for 2x points
        </p>
      </div>

      {/* MOBILE: Swipe Carousel Layout */}
      <div className="block md:hidden">
        {/* Mobile Navigation */}
        {renderMobileNav()}

        {/* Swipe Carousel Container */}
        <div
          ref={carouselRef}
          className="overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${currentRound * 100}%)` }}
          >
            {/* Round 0: Wild Card */}
            {renderMobileRound(0, afcWildCard, nfcWildCard)}

            {/* Round 1: Divisional */}
            {renderMobileRound(
              1,
              afcDivisional,
              nfcDivisional,
              afcOneSeed,
              nfcOneSeed
            )}

            {/* Round 2: Conference Championships */}
            {renderMobileRound(
              2,
              afcChampionship ? [afcChampionship] : [],
              nfcChampionship ? [nfcChampionship] : []
            )}

            {/* Round 3: Super Bowl */}
            {renderMobileRound(3, superBowl ? [superBowl] : [], [])}
          </div>
        </div>

        {/* Swipe Hint */}
        <div className="text-center mt-4 text-gray-500 text-xs">
          Swipe left/right to navigate rounds
        </div>
      </div>

      {/* DESKTOP: Traditional Bracket Layout */}
      <div className="hidden md:block">
        <div className="w-full px-2 sm:px-4">
          <div className="w-full mx-auto">
            <div className="grid grid-cols-9 gap-1 sm:gap-2 md:gap-3 lg:gap-4">
              {/* AFC SIDE - Wild Card */}
              <div className="col-span-1 flex flex-col justify-around space-y-1 sm:space-y-2">
                <div className="text-center text-[8px] sm:text-xs md:text-sm font-bold text-red-400 mb-1 uppercase">
                  AFC WC
                </div>
                {afcWildCard.map((game) => (
                  <div key={game.id}>{renderMatchup(game)}</div>
                ))}
              </div>

              {/* AFC - #1 Seed & Divisional */}
              <div className="col-span-1 flex flex-col justify-center space-y-2 sm:space-y-4">
                <div className="text-center text-[8px] sm:text-xs md:text-sm font-bold text-red-400 mb-1 uppercase">
                  AFC Div
                </div>
                <div className="space-y-1 sm:space-y-2">
                  {renderByeTeam(afcOneSeed, 1)}
                  {afcDivisional.map((game) => (
                    <div key={game.id}>{renderMatchup(game)}</div>
                  ))}
                </div>
              </div>

              {/* AFC Championship */}
              <div className="col-span-1 flex flex-col justify-center">
                <div className="text-center text-[8px] sm:text-xs md:text-sm font-bold text-red-400 mb-2 uppercase">
                  AFC Champ
                </div>
                {afcChampionship && renderMatchup(afcChampionship)}
              </div>

              {/* AFC to Super Bowl connector */}
              <div className="col-span-1 flex items-center justify-center">
                <div className="w-full h-px bg-gray-600"></div>
              </div>

              {/* Super Bowl - Center */}
              <div className="col-span-1 flex flex-col justify-center items-center">
                <div className="text-center mb-2">
                  <div className="text-[10px] sm:text-sm md:text-lg font-bold text-white mb-1">
                    SUPER BOWL
                  </div>
                  <div className="text-[8px] sm:text-xs text-gray-400">
                    Feb 8
                  </div>
                </div>
                {superBowl && (
                  <div className="w-full">{renderMatchup(superBowl)}</div>
                )}
              </div>

              {/* NFC to Super Bowl connector */}
              <div className="col-span-1 flex items-center justify-center">
                <div className="w-full h-px bg-gray-600"></div>
              </div>

              {/* NFC Championship */}
              <div className="col-span-1 flex flex-col justify-center">
                <div className="text-center text-[8px] sm:text-xs md:text-sm font-bold text-blue-400 mb-2 uppercase">
                  NFC Champ
                </div>
                {nfcChampionship && renderMatchup(nfcChampionship)}
              </div>

              {/* NFC - #1 Seed & Divisional */}
              <div className="col-span-1 flex flex-col justify-center space-y-2 sm:space-y-4">
                <div className="text-center text-[8px] sm:text-xs md:text-sm font-bold text-blue-400 mb-1 uppercase">
                  NFC Div
                </div>
                <div className="space-y-1 sm:space-y-2">
                  {renderByeTeam(nfcOneSeed, 1)}
                  {nfcDivisional.map((game) => (
                    <div key={game.id}>{renderMatchup(game)}</div>
                  ))}
                </div>
              </div>

              {/* NFC SIDE - Wild Card */}
              <div className="col-span-1 flex flex-col justify-around space-y-1 sm:space-y-2">
                <div className="text-center text-[8px] sm:text-xs md:text-sm font-bold text-blue-400 mb-1 uppercase">
                  NFC WC
                </div>
                {nfcWildCard.map((game) => (
                  <div key={game.id}>{renderMatchup(game)}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions - Desktop only */}
        <div className="text-center mt-8 px-4 text-gray-400 text-sm">
          <p>
            Fill out your entire bracket by clicking team names • Lock up to 3
            picks per round for double points
          </p>
        </div>
      </div>
    </div>
  );
}
