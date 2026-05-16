import express from "express";
import complaintController from "../controllers/complaintController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { uploadImage } from "../middleware/uploadMiddleware.js";
import { checkComplaintOwnership } from "../middleware/ownershipMiddleware.js";

const router = express.Router();

// Apply auth middleware to all routes below
router.use(protect);

// Routes
router.post(
  "/",
  uploadImage,
  complaintController.createComplaint.bind(complaintController)
);

// Get my complaints (must be before /:id)
router.get(
  "/my",
  complaintController.getMyComplaints.bind(complaintController)
);

// Get all complaints (Admin/Officer only)
router.get(
  "/",
  authorizeRoles("admin", "officer"),
  complaintController.getAllComplaints.bind(complaintController)
);

router.get(
  "/:id",
  complaintController.getComplaintById.bind(complaintController)
);

router.put(
  "/:id",
  checkComplaintOwnership,
  complaintController.updateComplaint.bind(complaintController)
);

router.delete(
  "/:id",
  checkComplaintOwnership,
  complaintController.deleteComplaint.bind(complaintController)
);

// Admin / Officer only route for updating status
// We use PATCH because we are only modifying a single field (status)
router.patch(
  "/:id",
  authorizeRoles("admin", "officer"),
  complaintController.updateComplaintStatus.bind(complaintController)
);

export default router;
