// Backward compatibility: Re-export from config and types
export { supabase, supabaseUrl, supabaseAnonKey } from "@/config/supabase";
export type {
  User,
  Game,
  Pick,
  Award,
  Feedback,
  CreatePickInput,
  CreateFeedbackInput,
  CreateAwardInput,
  UpdateUserInput,
  UpdateGameInput,
  UpdatePickInput,
} from "@/types/database";
