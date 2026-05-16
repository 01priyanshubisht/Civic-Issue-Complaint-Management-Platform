import complaintModel from "../models/complaintModel.js";

/**
 * Middleware to verify that the logged-in user owns the complaint they are trying to access.
 * Admins bypass this check.
 */
export const checkComplaintOwnership = async (req, res, next) => {
  try {
    const complaintId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. Admins can manage all complaints, so let them through immediately
    if (userRole === "admin") {
      return next();
    }

    // 2. Fetch the complaint to check its owner
    const complaint = await complaintModel.getComplaintById(complaintId);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // 3. Check if the logged-in user is the creator of the complaint
    if (complaint.user_id !== userId) {
      return res.status(403).json({ 
        message: "Forbidden: You do not have permission to modify this complaint" 
      });
    }

    // 4. (Optional but recommended) Attach the complaint to the request
    // This saves the controller/service from having to fetch it from the database again!
    req.complaint = complaint;

    next();
  } catch (error) {
    console.error("Ownership Middleware Error:", error);
    res.status(500).json({ message: "Server error verifying ownership" });
  }
};
