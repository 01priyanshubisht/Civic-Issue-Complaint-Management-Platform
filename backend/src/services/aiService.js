/**
 * aiService.js — HTTP client for all ML service calls from the Express backend.
 *
 * Architecture principle:
 *   ALL communication with the FastAPI ML service goes through this file.
 *   The rest of the Express backend never imports axios or knows the ML URL.
 *   This makes it trivial to:
 *     - Change the ML service URL (just update .env)
 *     - Mock the ML service in tests
 *     - Add retries / circuit breakers later
 *
 * Error handling strategy:
 *   Every function catches errors and returns a safe fallback instead of
 *   throwing. This means if the ML service is down, complaints can still
 *   be created — they just won't have AI enrichment.
 *   This is called "graceful degradation" — a key production engineering concept.
 */

import axios from "axios";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// Axios instance with default config
const mlClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: 30000, // 30s timeout (model inference can be slow)
  headers: { "Content-Type": "application/json" },
});

// ─── Health Check ─────────────────────────────────────────────────────────────

/**
 * Verify the ML service is running.
 * Express calls this on startup to warn if ML service is unavailable.
 */
export async function checkMLServiceHealth() {
  try {
    const response = await mlClient.get("/health", { timeout: 5000 });
    return response.data.status === "healthy";
  } catch {
    return false;
  }
}

// ─── Text Classification ──────────────────────────────────────────────────────

/**
 * Predict complaint category from text using TF-IDF + Logistic Regression.
 *
 * @param {string} text - The complaint description
 * @returns {{ category: string, confidence: number, all_scores: object } | null}
 */
export async function predictFromText(text) {
  try {
    const response = await mlClient.post("/predict/text", { text });
    return response.data;
  } catch (error) {
    console.warn("[aiService] Text prediction failed:", error.message);
    return null; // Graceful degradation
  }
}

// ─── Image + Text Combined Prediction ─────────────────────────────────────────

/**
 * Multimodal prediction: combine CNN (image) + LogReg (text).
 *
 * @param {string} text          - Complaint description text
 * @param {Buffer|null} imageBuffer - Raw image bytes (optional)
 * @param {string} imageMimetype  - Image MIME type (e.g., "image/jpeg")
 * @returns {{ final_category: string, final_confidence: number, ... } | null}
 */
export async function predictCategory(text, imageBuffer = null, imageMimetype = "image/jpeg") {
  try {
    if (imageBuffer) {
      // Multimodal: send as multipart/form-data
      const FormData = (await import("form-data")).default;
      const form = new FormData();
      form.append("text", text);
      form.append("file", imageBuffer, {
        filename: "image.jpg",
        contentType: imageMimetype,
      });

      const response = await mlClient.post("/predict/combined", form, {
        headers: form.getHeaders(),
        timeout: 30000,
      });
      return response.data;
    } else {
      // Text-only fallback
      const result = await predictFromText(text);
      if (!result) return null;
      return {
        final_category: result.category,
        final_confidence: result.confidence,
        text_result: result,
        fusion_method: "text_only",
        models_agree: true,
      };
    }
  } catch (error) {
    console.warn("[aiService] Combined prediction failed:", error.message);
    return null;
  }
}

// ─── Duplicate Detection ──────────────────────────────────────────────────────

/**
 * Check if a new complaint is a semantic duplicate of any nearby complaint.
 *
 * @param {string} complaintId       - Temporary ID for the new complaint
 * @param {string} text              - New complaint description
 * @param {number} latitude          - GPS latitude
 * @param {number} longitude         - GPS longitude
 * @param {Array<{id, text}>} nearbyComplaints - Pre-filtered nearby complaints from Supabase
 *
 * @returns {{
 *   is_duplicate: boolean,
 *   duplicate_of: string|null,
 *   similarity_score: number|null,
 *   action: "merge"|"create_new"
 * }}
 */
export async function checkDuplicate(complaintId, text, latitude, longitude, nearbyComplaints) {
  try {
    const response = await mlClient.post("/similarity/check", {
      complaint_id: complaintId,
      text,
      latitude,
      longitude,
      nearby_complaints: nearbyComplaints.map((c) => ({ id: c.id, text: c.text || c.description })),
    });
    return response.data;
  } catch (error) {
    console.warn("[aiService] Duplicate check failed:", error.message);
    // Fail open: if the ML service is down, don't block complaint creation
    return { is_duplicate: false, duplicate_of: null, similarity_score: null, action: "create_new" };
  }
}

// ─── Embedding Store ──────────────────────────────────────────────────────────

/**
 * Add a confirmed new complaint to the ChromaDB embedding store.
 * Called AFTER the complaint is saved to Supabase.
 *
 * @param {string} complaintId - The Supabase UUID of the saved complaint
 * @param {string} text        - The complaint description text
 */
export async function addToEmbeddingStore(complaintId, text) {
  try {
    await mlClient.post("/similarity/add", {
      complaint_id: complaintId,
      text,
    });
  } catch (error) {
    // Non-critical: log and continue. The complaint is already saved to Supabase.
    console.warn("[aiService] Failed to add embedding to ChromaDB:", error.message);
  }
}

// ─── Summarization ────────────────────────────────────────────────────────────

/**
 * Generate a concise AI summary and department routing suggestion.
 *
 * @param {string} title       - Complaint title
 * @param {string} description - Full complaint description
 * @param {string} category    - Predicted or user-selected category
 * @param {string|null} location - Human-readable location (optional)
 *
 * @returns {{ summary: string, routing_suggestion: string|null } | null}
 */
export async function summarizeComplaint(title, description, category, location = null) {
  try {
    const response = await mlClient.post("/summarize", {
      title,
      description,
      category,
      location,
    });
    return response.data;
  } catch (error) {
    console.warn("[aiService] Summarization failed:", error.message);
    return null;
  }
}

// ─── Severity Assessment ──────────────────────────────────────────────────────

/**
 * Assess the severity and priority of a complaint.
 * 
 * @param {string} category - The predicted or selected category.
 * @param {string} text - Full complaint text.
 * @param {number} duplicateCount - Number of nearby duplicate complaints.
 * @param {number} imageConfidence - Confidence from image classification.
 * 
 * @returns {{ severity: string, priority: string, reason: string[] } | null}
 */
export async function assessSeverity(category, text, duplicateCount, imageConfidence) {
  try {
    const response = await mlClient.post("/severity/assess", {
      category: category || "",
      text: text || "",
      duplicate_count: duplicateCount || 0,
      image_confidence: imageConfidence || 0.0
    });
    return response.data;
  } catch (error) {
    console.warn("[aiService] Severity assessment failed:", error.message);
    return null;
  }
}
