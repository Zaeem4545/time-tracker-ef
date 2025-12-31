require("dotenv").config();
const db = require("./config/db");

async function testConnection() {
  try {
    const [rows] = await db.query("SELECT 1");
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  }
}

testConnection();
