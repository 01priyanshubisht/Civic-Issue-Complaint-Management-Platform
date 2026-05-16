import supabase from "../config/supabase.js";

class ComplaintModel {
  async insertComplaint(complaintData) {
    const { data, error } = await supabase
      .from("complaints")
      .insert([complaintData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Find complaints within a bounding box around the given coordinates.
   *
   * Interview note:
   *   We use a simple degree-based bounding box instead of PostGIS for simplicity.
   *   1 degree latitude ≈ 111,000 meters, so for 50m:
   *     delta = 50 / 111000 ≈ 0.00045 degrees
   *   This gives a square bounding box, not a perfect circle, but it's
   *   fast (uses indexed range queries), good enough for a 50m radius,
   *   and requires no PostGIS extension.
   *
   * @param {number} lat          - Center latitude
   * @param {number} lng          - Center longitude
   * @param {number} radiusMeters - Search radius in meters (default: 50)
   * @returns {Array<{id, description}>} Nearby complaints
   */
  async getComplaintsByLocation(lat, lng, radiusMeters = 50) {
    const delta = radiusMeters / 111000; // Convert meters to degrees

    const { data, error } = await supabase
      .from("complaints")
      .select("id, description, title")
      .gte("latitude", lat - delta)
      .lte("latitude", lat + delta)
      .gte("longitude", lng - delta)
      .lte("longitude", lng + delta)
      .neq("status", "rejected"); // Don't compare against rejected complaints

    if (error) throw error;
    return data || [];
  }

  /**
   * Increment report_count for a complaint that's been identified as a duplicate.
   * This merges the new report into the existing complaint.
   */
  async incrementReportCount(id) {
    // Fetch current count, then increment manually.
    // This avoids the need for a custom supabase.rpc("increment") function.
    const current = await this.getComplaintById(id);
    const { data, error } = await supabase
      .from("complaints")
      .update({ report_count: (current.report_count || 1) + 1 })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getAllComplaints(filters = {}) {
    let query = supabase.from("complaints").select("*, users(name, email)");

    if (filters.user_id) {
      query = query.eq("user_id", filters.user_id);
    }
    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    // Sort by most recent
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getComplaintById(id) {
    const { data, error } = await supabase
      .from("complaints")
      .select("*, users(name, email)")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  }

  async updateComplaint(id, updates) {
    const { data, error } = await supabase
      .from("complaints")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteComplaint(id) {
    const { data, error } = await supabase
      .from("complaints")
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async insertComplaintLog(logData) {
    const { data, error } = await supabase
      .from("complaint_logs")
      .insert([logData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export default new ComplaintModel();
