import bcrypt from "bcryptjs";
import supabase from "../config/supabase.js";
import generateToken from "../utils/generateToken.js";

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    const { data: existingUsers, error: findError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .limit(1);

    if (findError) {
      throw findError;
    }

    if (existingUsers?.length > 0) {
      return res
        .status(400)
        .json({ message: "A user with that email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: user, error: insertError } = await supabase
      .from("users")
      .insert({ name, email, password: hashedPassword })
      .select("id,name,email")
      .single();

    if (insertError) {
      throw insertError;
    }

    res.status(201).json({
      user,
      token: generateToken(user),
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        message: "Unable to register user",
        error: error.message || error,
      });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const { data: users, error: findError } = await supabase
      .from("users")
      .select("id,name,email,password")
      .eq("email", email)
      .limit(1);

    if (findError) {
      throw findError;
    }

    const user = users?.[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    res.json({
      user: safeUser,
      token: generateToken(safeUser),
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Unable to log in", error: error.message || error });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    res.json({ user: req.user });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        message: "Unable to retrieve user",
        error: error.message || error,
      });
  }
};
