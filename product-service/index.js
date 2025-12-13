const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const { promisify } = require("util");

const app = express();
const port = process.env.PORT || 3002;

app.use(express.json());

const db = new sqlite3.Database("products.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
    process.exit(1);
  } else {
    console.log("Connected to SQLite database");
  }
});

const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

const initializeDatabase = async () => {
  try {
    await dbRun(
      "CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY, name TEXT, price REAL)"
    );

    const product = await dbGet(`SELECT id FROM products WHERE id = 1`);
    if (!product) {
      await dbRun(
        `INSERT INTO products (name, price) VALUES ('Laptop', 1200.00)`
      );
      await dbRun(
        `INSERT INTO products (name, price) VALUES ('Mouse', 25.00)`
      );
      console.log("Created default products");
    }
  } catch (err) {
    console.error("Database initialization error:", err.message);
  }
};

const validateOrderData = (data) => {
  return (
    data &&
    typeof data === "object" &&
    data.product_id &&
    typeof data.quantity === "number" &&
    data.quantity > 0
  );
};

app.get("/api/products", async (req, res) => {
  try {
    const products = await dbAll(`SELECT * FROM products`);
    res.json({ products, access: "PUBLIC" });
  } catch (err) {
    console.error("Get products error:", err.message);
    res.status(500).json({ message: "Database error" });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const consumerId = req.headers["x-consumer-id"];
    const consumerUsername = req.headers["x-consumer-custom-id"];

    if (!consumerId || !consumerUsername) {
      return res.status(401).json({
        message: "Unauthorized: Missing Kong Consumer Headers",
      });
    }

    if (!validateOrderData(req.body)) {
      return res.status(400).json({
        message: "Invalid order data. Required: product_id (number), quantity (positive number)",
      });
    }

    const product = await dbGet(
      `SELECT id, name, price FROM products WHERE id = ?`,
      [req.body.product_id]
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const totalPrice = product.price * req.body.quantity;

    res.status(201).json({
      message: "Order created successfully",
      order: {
        product_id: product.id,
        product_name: product.name,
        quantity: req.body.quantity,
        unit_price: product.price,
        total_price: totalPrice,
      },
      user_info: {
        id: consumerId,
        username: consumerUsername,
      },
    });
  } catch (err) {
    console.error("Create order error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

const server = app.listen(port, async () => {
  await initializeDatabase();
  console.log(`Product Service listening on port ${port}`);
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
