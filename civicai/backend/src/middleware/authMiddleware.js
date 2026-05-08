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

    const { data: user, error } = await supabase
      .from("users")
      .select("id,name,email")
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
