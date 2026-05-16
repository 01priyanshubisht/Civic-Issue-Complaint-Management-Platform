import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import supabase from "../config/supabase.js";

dotenv.config();

export const protect = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, token missing" });
  }

  const token = authorization.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
//after conforming the token is valid we will attach the user details from db to the req.user body for further use
    const { data: user, error } = await supabase
      .from("users")
      .select("id,name,email,role")
      .eq("id", decoded.id)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    res
      .status(401)
      .json({ message: "Not authorized, token verification failed" });
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: Access is denied" });
    }
    next();
  };
};
