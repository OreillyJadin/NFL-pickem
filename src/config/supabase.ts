import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://whvxcoganvbrriqpynre.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indodnhjb2dhbnZicnJpcXB5bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTUzMDUsImV4cCI6MjA3MjQzMTMwNX0.ACLWT5e3OmsgoWD6mWu33EmhMTznW2IQI9qKYAurlh8";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export for backward compatibility during migration
export { supabaseUrl, supabaseAnonKey };
