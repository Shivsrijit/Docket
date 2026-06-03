import User from "../models/User.js";
import Folder from "../models/Folder.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production"
  ? crypto.randomBytes(64).toString("hex")
  : "docket_jwt_secret_key_98765");

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: "7d",
  });
};

export { JWT_SECRET };

export const signupUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    // Backend Sanitization & Validations
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({ message: "Name must be at least 2 characters long" });
    }

    const nameRegex = /^[a-zA-Z\s\-]+$/;
    if (!nameRegex.test(name.trim())) {
      return res.status(400).json({ message: "Name can only contain letters, spaces, and hyphens" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[@$!%*?&#]/.test(password)) {
      return res.status(400).json({ message: "Password must contain at least one uppercase, one lowercase, one number, and one special character" });
    }

    const userExists = await User.findOne({ email: email.trim().toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });

    // Auto-provision 2 default folders for the new user
    await Folder.create([
      { name: "Personal", color: "#B386FF", user: user._id },
      { name: "Ideas", color: "#FDB851", user: user._id }
    ]);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const googleAuth = async (req, res) => {
  try {
    let { email, name, googleId, avatar } = req.body;

    if (req.body.credential) {
      // Decode Google JWT token natively using jsonwebtoken
      const decoded = jwt.decode(req.body.credential);
      if (decoded) {
        email = decoded.email;
        name = decoded.name;
        googleId = decoded.sub;
        avatar = decoded.picture;
      } else {
        return res.status(400).json({ message: "Invalid Google credential token" });
      }
    }

    if (!email || !name) {
      return res.status(400).json({ message: "Insufficient profile data from Google" });
    }

    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // If user exists, but doesn't have a googleId set, set it
      if (!user.googleId) {
        user.googleId = googleId || "simulated_google_id_" + Date.now();
        if (avatar && !user.avatar) user.avatar = avatar;
        await user.save();
      }
    } else {
      // Create new user for google oauth
      user = await User.create({
        name,
        email,
        googleId: googleId || "simulated_google_id_" + Date.now(),
        avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
      });

      // Auto-provision 2 default folders for the new Google user
      await Folder.create([
        { name: "Personal", color: "#B386FF", user: user._id },
        { name: "Ideas", color: "#FDB851", user: user._id }
      ]);
    }

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Google Auth error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMe = async (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.error("GetMe error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
