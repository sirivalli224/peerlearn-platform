const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const express = require("express");
const mongoose = require("mongoose");
// Student account schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const peerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subject: { type: String, required: true },
  skill: { type: String, required: true },
  rating: { type: Number, default: 5 }
}, { timestamps: true });

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  link: { type: String, default: "" }
}, { timestamps: true });

const requestSchema = new mongoose.Schema({
  peer: { type: String, required: true },
  subject: { type: String, required: true },
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected"],
    default: "Pending"
  }
}, { timestamps: true });

const reviewSchema = new mongoose.Schema({
  peer: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, required: true }
}, { timestamps: true });

const Peer = mongoose.model("Peer", peerSchema);
const Resource = mongoose.model("Resource", resourceSchema);
const TutoringRequest = mongoose.model("TutoringRequest", requestSchema);
const Review = mongoose.model("Review", reviewSchema);


/* STUDENT SIGNUP */
app.post("/api/auth/signup", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Name, email and password are required."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
    });

    res.status(201).json({
      message: "Account created successfully!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }
    next(err);
  }
});

/* STUDENT LOGIN */
app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "Server authentication is not configured."
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    next(err);
  }
});

/* VERIFY LOGIN TOKEN */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      message: "Please log in first."
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      message: "Server authentication is not configured."
    });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      message: "Your session is invalid or expired. Please log in again."
    });
  }
};

/* GET LOGGED-IN STUDENT PROFILE */
app.get("/api/auth/me", authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("name email");

    if (!user) {
      return res.status(404).json({
        message: "Student account not found."
      });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

app.get("/", (req, res) => {
  res.send("PeerLearn API is running!");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", project: "PeerLearn" });
});

// Get peers and add demo peers on the first request
app.get("/api/peers", async (req, res, next) => {
  try {
    if (await Peer.countDocuments() === 0) {
      await Peer.insertMany([
        { name: "Aarav Sharma", subject: "Python", skill: "Programming", rating: 4.8 },
        { name: "Ananya Reddy", subject: "Machine Learning", skill: "AI & ML", rating: 4.9 },
        { name: "Rahul Kumar", subject: "Web Development", skill: "React", rating: 4.7 },
        { name: "Priya Singh", subject: "Data Structures", skill: "Java", rating: 4.6 }
      ]);
    }

    const peers = await Peer.find().sort({ name: 1 });
    res.json(peers);
  } catch (err) {
    next(err);
  }
});

// Get and create resources
app.get("/api/resources", async (req, res, next) => {
  try {
    res.json(await Resource.find().sort({ createdAt: -1 }));
  } catch (err) {
    next(err);
  }
});

app.post("/api/resources", async (req, res, next) => {
  try {
    const { title, subject, link } = req.body;
    if (!title?.trim() || !subject?.trim()) {
      return res.status(400).json({ message: "Title and subject are required." });
    }

    const resource = await Resource.create({
      title: title.trim(),
      subject: subject.trim(),
      link: link || ""
    });

    res.status(201).json(resource);
  } catch (err) {
    next(err);
  }
});

// Get and create tutoring requests
app.get("/api/requests", async (req, res, next) => {
  try {
    res.json(await TutoringRequest.find().sort({ createdAt: -1 }));
  } catch (err) {
    next(err);
  }
});

app.post("/api/requests", async (req, res, next) => {
  try {
    const { peer, subject } = req.body;
    if (!peer?.trim() || !subject?.trim()) {
      return res.status(400).json({ message: "Peer and subject are required." });
    }

    const request = await TutoringRequest.create({
      peer: peer.trim(),
      subject: subject.trim()
    });

    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
});

// Update tutoring request status
app.patch("/api/requests/:id", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["Pending", "Accepted", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const request = await TutoringRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!request) {
      return res.status(404).json({ message: "Request not found." });
    }

    res.json(request);
  } catch (err) {
    next(err);
  }
});

// Get and create reviews
app.get("/api/reviews", async (req, res, next) => {
  try {
    res.json(await Review.find().sort({ createdAt: -1 }));
  } catch (err) {
    next(err);
  }
});

app.post("/api/reviews", async (req, res, next) => {
  try {
    const { peer, rating, comment } = req.body;
    const numericRating = Number(rating);

    if (!peer?.trim() || !comment?.trim() ||
        !Number.isInteger(numericRating) ||
        numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        message: "Enter a student name, feedback, and a rating from 1 to 5."
      });
    }

    const review = await Review.create({
      peer: peer.trim(),
      rating: numericRating,
      comment: comment.trim()
    });

    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
});

// Return readable API errors
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ message: "Server error. Please try again." });
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
