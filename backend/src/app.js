import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";

dotenv.config();

const app = express();

// Deployment-safe CORS configuration
const frontendUrl = process.env.FRONTEND_URL;
console.log(`[CORS] Initialization - FRONTEND_URL: ${frontendUrl || 'Not Set'}`);

app.use(cors({
  origin: function (origin, callback) {
    // Allow local development and the specific deployed frontend
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      frontendUrl
    ].filter(Boolean);

    // If origin is in allowed list, or if no origin (server-to-server), or if wildcard is intended
    if (!origin || allowedOrigins.includes(origin) || frontendUrl === "*") {
      callback(null, true);
    } else {
      console.error(`[CORS] Rejection - Origin ${origin} not in allowed list:`, allowedOrigins);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);

const PORT = process.env.PORT || 5001;

// Health Check / Welcome
app.get("/", (req, res) => {
  res.json({
    message: "CivicAI Backend API is running",
    status: "healthy",
    docs: "/api/complaints"
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
