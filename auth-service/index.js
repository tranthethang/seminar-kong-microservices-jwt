const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");
const { promisify } = require("util");

const app = express();
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "YOUR_GLOBAL_JWT_SECRET";

app.use(express.json());

const db = new sqlite3.Database("users.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
    process.exit(1);
  } else {
    console.log("Connected to SQLite database");
  }
});

const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));

const initializeDatabase = async () => {
  try {
    await dbRun(
      "CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT, email TEXT)"
    );

    const user = await dbGet(`SELECT id FROM users WHERE username = 'testuser'`);
    if (!user) {
      await dbRun(
        `INSERT INTO users (username, password, email) VALUES ('testuser', '123456', 'test@example.com')`
      );
      console.log("Created default user: testuser");
    }
  } catch (err) {
    console.error("Database initialization error:", err.message);
  }
};

const validateUsername = (username) => {
  return username && typeof username === "string" && username.trim().length > 0;
};

app.post("/api/auth/login", async (req, res) => {
  try {
    const username = req.body.username || "testuser";

    if (!validateUsername(username)) {
      return res.status(400).json({ message: "Invalid username format" });
    }

    const user = await dbGet(
      `SELECT id, username FROM users WHERE username = ?`,
      [username]
    );

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        aud: username,
        iss: "auth-service",
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token, expiresIn: "1h" });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await dbGet(
      `SELECT id, username, email FROM users WHERE id = ?`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Get user error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

const server = app.listen(port, async () => {
  await initializeDatabase();
  console.log(`Auth Service listening on port ${port}`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("HTTP server closed");
    db.close((err) => {
      if (err) {
        console.error("Error closing database:", err.message);
      } else {
        console.log("Database closed");
      }
      process.exit(0);
    });
  });
});
