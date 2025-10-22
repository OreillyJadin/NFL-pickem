import { FeedbackModel } from "@/models/FeedbackModel";
import { Feedback } from "@/types/database";

export class FeedbackController {
  /**
   * Create new feedback with validation
   */
  static async createFeedback(
    type: string,
    message: string,
    metadata: {
      userId?: string | null;
      userAgent?: string;
      ipAddress?: string;
      timestamp?: string;
    }
  ): Promise<Feedback> {
    // Validate feedback type
    if (!["bug", "suggestion", "general"].includes(type)) {
      throw new Error("Invalid feedback type");
    }

    // Validate message
    if (!message || message.trim().length === 0) {
      throw new Error("Message is required");
    }

    if (message.trim().length > 5000) {
      throw new Error("Message is too long (max 5000 characters)");
    }

    // Create feedback
    const feedback = await FeedbackModel.create({
      user_id: metadata.userId || null,
      type: type as "bug" | "suggestion" | "general",
      message: message,
      user_agent: metadata.userAgent,
      ip_address: metadata.ipAddress,
      created_at: metadata.timestamp,
    });

    if (!feedback) {
      throw new Error("Failed to create feedback");
    }

    return feedback;
  }

  /**
   * Get all feedback (admin only)
   */
  static async getAllFeedback(): Promise<Feedback[]> {
    return await FeedbackModel.findAll();
  }

  /**
   * Get feedback by user
   */
  static async getUserFeedback(userId: string): Promise<Feedback[]> {
    return await FeedbackModel.findByUser(userId);
  }

  /**
   * Get feedback by type
   */
  static async getFeedbackByType(
    type: "bug" | "suggestion" | "general"
  ): Promise<Feedback[]> {
    return await FeedbackModel.findByType(type);
  }
}
