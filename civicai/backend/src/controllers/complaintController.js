import complaintService from "../services/complaintService.js";

class ComplaintController {
  async createComplaint(req, res) {
    try {
      const { title, description, category, latitude, longitude } = req.body;

      // 1. Validation
      if (!title || !description || !category) {
        return res.status(400).json({ 
          success: false, 
          message: "Title, description, and category are required." 
        });
      }

      // 2. Pass data to service
      const complaint = await complaintService.createComplaint(
        req.user.id,
        req.body,
        req.file
      );
      
      // 3. Return clean JSON response
      res.status(201).json({ success: true, data: complaint });
    } catch (error) {
      console.error("Create complaint error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getAllComplaints(req, res) {
    try {
      const filters = {
        status: req.query.status,
      };
      
      const complaints = await complaintService.getComplaints(filters);
      res.status(200).json({ success: true, data: complaints });
    } catch (error) {
      console.error("Get all complaints error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getMyComplaints(req, res) {
    try {
      const filters = {
        status: req.query.status,
        user_id: req.user.id, // Enforce fetching only own complaints
      };
      
      const complaints = await complaintService.getComplaints(filters);
      res.status(200).json({ success: true, data: complaints });
    } catch (error) {
      console.error("Get my complaints error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getComplaintById(req, res) {
    try {
      const complaint = await complaintService.getComplaintById(
        req.params.id,
        req.user
      );
      res.status(200).json({ success: true, data: complaint });
    } catch (error) {
      console.error("Get complaint by ID error:", error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async updateComplaintStatus(req, res) {
    try {
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ success: false, message: "Status is required." });
      }

      const complaint = await complaintService.updateComplaintStatus(
        req.params.id,
        status,
        req.user.id // Pass the admin/officer ID making the change
      );
      
      res.status(200).json({ success: true, data: complaint });
    } catch (error) {
      console.error("Update complaint status error:", error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async updateComplaint(req, res) {
    try {
      const complaint = await complaintService.updateComplaint(
        req.params.id,
        req.user,
        req.body
      );
      res.status(200).json({ success: true, data: complaint });
    } catch (error) {
      console.error("Update complaint error:", error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async deleteComplaint(req, res) {
    try {
      await complaintService.deleteComplaint(req.params.id, req.user);
      res.status(200).json({ success: true, message: "Complaint deleted successfully" });
    } catch (error) {
      console.error("Delete complaint error:", error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }
}

export default new ComplaintController();
