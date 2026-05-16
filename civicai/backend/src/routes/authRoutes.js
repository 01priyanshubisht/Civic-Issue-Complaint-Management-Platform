import express from "express";
import { register, login, profile } from "../controllers/authController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", protect, profile);
router.get("/admin", protect, authorizeRoles("admin"), (req, res) => {
  res.json({ message: "Admin area accessed successfully" });
});

export default router;
