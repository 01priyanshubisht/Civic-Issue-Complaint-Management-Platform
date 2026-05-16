import complaintModel from "../models/complaintModel.js";
import storageService from "./storageService.js";
import * as aiService from "./aiService.js";
import { v4 as uuidv4 } from "uuid";

class ComplaintService {
  /**
   * Create a new complaint with full AI pipeline orchestration.
   *
   * Pipeline:
   *   1. Upload image to Supabase Storage
   *   2. Geo-query Supabase for nearby complaints (~50m radius)
   *   3. Semantic duplicate detection via ChromaDB (FastAPI)
   *      → If duplicate: increment report_count and return existing complaint
   *   4. Multimodal category prediction (CNN + TF-IDF) via FastAPI
   *   5. AI summary + routing via Gemini API (FastAPI)
   *   6. Insert new complaint into Supabase with all AI fields
   *   7. Index new complaint in ChromaDB for future duplicate checks
   *
   * Design principle: if the ML service is down at any step, we
   * continue without AI enrichment (graceful degradation).
   */
  async createComplaint(userId, data, file) {
    const lat = data.latitude ? parseFloat(data.latitude) : null;
    const lng = data.longitude ? parseFloat(data.longitude) : null;
    const text = `${data.title}. ${data.description}`;

    // ── Step 1: Upload image ─────────────────────────────────────────────────
    let imageUrl = null;
    let imageBuffer = null;
    let imageMimetype = null;

    if (file) {
      try {
        imageUrl = await storageService.uploadImage(file);
        imageBuffer = file.buffer;
        imageMimetype = file.mimetype;
      } catch (uploadError) {
        // If upload fails, throw a custom error to be caught by the controller
        const err = new Error(`Image upload failed: ${uploadError.message}`);
        err.statusCode = 400; // Bad Request
        throw err;
      }
    }

    // ── Step 2: Geo-query nearby complaints ──────────────────────────────────
    let nearbyComplaints = [];
    if (lat !== null && lng !== null) {
      try {
        nearbyComplaints = await complaintModel.getComplaintsByLocation(lat, lng);
      } catch (err) {
        console.warn("[complaintService] Geo query failed:", err.message);
      }
    }

    // ── Step 3: Duplicate detection ──────────────────────────────────────────
    if (nearbyComplaints.length > 0) {
      const tempId = uuidv4();
      const duplicateResult = await aiService.checkDuplicate(
        tempId,
        text,
        lat,
        lng,
        nearbyComplaints
      );

      if (duplicateResult.is_duplicate && duplicateResult.duplicate_of) {
        // MERGE PATH: increment report_count on the existing complaint
        console.log(
          `[complaintService] Duplicate detected (similarity: ${duplicateResult.similarity_score}). ` +
          `Merging into complaint ${duplicateResult.duplicate_of}`
        );
        const existingComplaint = await complaintModel.incrementReportCount(
          duplicateResult.duplicate_of
        );
        return {
          ...existingComplaint,
          _ai_action: "merged_duplicate",
          _similarity_score: duplicateResult.similarity_score,
        };
      }
    }

    // ── Step 4: Multimodal category prediction ───────────────────────────────
    let aiCategory = data.category || null;
    let aiConfidence = null;

    const prediction = await aiService.predictCategory(text, imageBuffer, imageMimetype);
    if (prediction) {
      aiCategory = prediction.final_category;
      aiConfidence = prediction.final_confidence;
    }

    // ── Step 5: AI summary + routing ────────────────────────────────────────
    let aiSummary = null;
    let aiRouting = null;

    const summary = await aiService.summarizeComplaint(
      data.title,
      data.description,
      aiCategory || data.category || "general",
      data.location_name || null
    );
    if (summary) {
      aiSummary = summary.summary;
      aiRouting = summary.routing_suggestion;
    }

    // ── Step 5.5: Severity & Priority Assessment ─────────────────────────────
    let aiSeverity = "Medium";
    let aiPriority = "Normal";

    const severityResult = await aiService.assessSeverity(
      aiCategory || data.category || "general",
      text,
      nearbyComplaints.length,
      aiConfidence || 0.0
    );
    if (severityResult) {
      aiSeverity = severityResult.severity;
      aiPriority = severityResult.priority;
    }

    // ── Step 6: Save complaint ───────────────────────────────────────────────
    const complaintData = {
      user_id: userId,
      title: data.title,
      description: data.description,
      category: data.category || aiCategory,   // User's choice takes priority
      latitude: lat,
      longitude: lng,
      image_url: imageUrl,
      status: "pending",
      // AI-enriched fields
      ai_category: aiCategory,
      ai_confidence: aiConfidence,
      ai_summary: aiSummary,
      ai_routing: aiRouting,
      severity: aiSeverity,
      priority: aiPriority,
      report_count: 1,
      is_duplicate: false,
    };

    const savedComplaint = await complaintModel.insertComplaint(complaintData);

    // ── Step 7: Index in ChromaDB ────────────────────────────────────────────
    // Fire-and-forget: don't await, don't block the response
    aiService.addToEmbeddingStore(savedComplaint.id, text).catch((err) =>
      console.warn("[complaintService] ChromaDB indexing failed:", err.message)
    );

    return savedComplaint;
  }

  async getComplaints(filters = {}) {
    return await complaintModel.getAllComplaints(filters);
  }

  async getComplaintById(id, user) {
    const complaint = await complaintModel.getComplaintById(id);

    if (!complaint) {
      const error = new Error("Complaint not found");
      error.statusCode = 404;
      throw error;
    }

    // Authorization check
    if (user.role === "user" && complaint.user_id !== user.id) {
      const error = new Error("Forbidden: You do not own this complaint");
      error.statusCode = 403;
      throw error;
    }

    return complaint;
  }

  async updateComplaintStatus(id, newStatus, changedByUserId) {
    const validStatuses = ["pending", "in_progress", "resolved", "rejected"];
    if (!validStatuses.includes(newStatus)) {
      const error = new Error("Invalid status");
      error.statusCode = 400;
      throw error;
    }

    // 1. Get current complaint to find the previous status
    const complaint = await complaintModel.getComplaintById(id);
    if (!complaint) {
      const error = new Error("Complaint not found");
      error.statusCode = 404;
      throw error;
    }

    const previousStatus = complaint.status;

    // 2. Only update if the status is actually changing
    if (previousStatus === newStatus) {
      return complaint;
    }

    // 3. Update the status in the main table
    const updatedComplaint = await complaintModel.updateComplaint(id, { status: newStatus });

    // 4. Log the change in the audit table
    await complaintModel.insertComplaintLog({
      complaint_id: id,
      old_status: previousStatus,
      new_status: newStatus,
      updated_by: changedByUserId
    });

    return updatedComplaint;
  }

  async updateComplaint(id, user, updates) {
    // Ensure complaint exists and user owns it
    await this.getComplaintById(id, user);

    // Prevent users from updating certain fields directly
    delete updates.status;
    delete updates.user_id;

    return await complaintModel.updateComplaint(id, updates);
  }

  async deleteComplaint(id, user) {
    // Admin can delete any, user can only delete their own
    if (user.role !== "admin") {
       await this.getComplaintById(id, user); // Validates ownership
    }

    return await complaintModel.deleteComplaint(id);
  }
}

export default new ComplaintService();
