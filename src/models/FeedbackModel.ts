import { supabase } from "@/config/supabase";
import { Feedback, CreateFeedbackInput } from "@/types/database";

export class FeedbackModel {
  /**
   * Create new feedback
   */
  static async create(data: CreateFeedbackInput): Promise<Feedback | null> {
    const { data: newFeedback, error } = await supabase
      .from("feedback")
      .insert({
        user_id: data.user_id || null,
        type: data.type,
        message: data.message.trim(),
        user_agent: data.user_agent,
        ip_address: data.ip_address,
        created_at: data.created_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating feedback:", error);
      return null;
    }

    return newFeedback as Feedback;
  }

  /**
   * Find all feedback (admin only)
   */
  static async findAll(): Promise<Feedback[]> {
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all feedback:", error);
      return [];
    }

    return data as Feedback[];
  }

  /**
   * Find feedback by user
   */
  static async findByUser(userId: string): Promise<Feedback[]> {
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching feedback by user:", error);
      return [];
    }

    return data as Feedback[];
  }

  /**
   * Find feedback by type
   */
  static async findByType(type: Feedback["type"]): Promise<Feedback[]> {
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .eq("type", type)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching feedback by type:", error);
      return [];
    }

    return data as Feedback[];
  }
}
