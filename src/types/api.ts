// API Request and Response types

// Generic API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Feedback API
export interface FeedbackRequest {
  type: "bug" | "suggestion" | "general";
  message: string;
  timestamp: string;
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
  feedbackId?: string;
}

// Pick API
export interface CreatePickRequest {
  gameId: string;
  team: string;
  isLock: boolean;
}

export interface UpdatePickRequest {
  team?: string;
  isLock?: boolean;
}

// Game Sync API
export interface SyncGameRequest {
  gameId?: string;
  week?: number;
  forceSync?: boolean;
}

export interface SyncGameResponse {
  success: boolean;
  homeScore?: number;
  awayScore?: number;
  status?: string;
  updated?: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

// Scoring API
export interface ScoringResult {
  success: boolean;
  message?: string;
  gamesChecked?: number;
  gamesFixed?: number;
  picksFixed?: number;
  problemGames?: Array<{
    gameId: string;
    week: number;
    matchup: string;
    incorrectPicks: number;
    issues?: string[];
  }>;
}

// Award API
export interface ProcessAwardsResponse {
  success: boolean;
  awardsCreated: number;
  message: string;
}

// User Profile API
export interface UpdateProfileRequest {
  username?: string;
  bio?: string;
}
