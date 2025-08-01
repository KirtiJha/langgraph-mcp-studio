const { MongoClient } = require("mongodb");

let db = null;
let client = null;

const connectDB = async () => {
  if (db) {
    return db;
  }

  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const dbName = process.env.DB_NAME || "mcp_test_db";

    console.log(`Connecting to MongoDB at ${uri}`);

    client = new MongoClient(uri, {
      useUnifiedTopology: true,
    });

    await client.connect();
    console.log("Connected to MongoDB successfully");

    db = client.db(dbName);
    return db;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

const closeDB = async () => {
  if (client) {
    await client.close();
    console.log("MongoDB connection closed");
  }
};

// Test the connection
const testConnection = async () => {
  try {
    const database = await connectDB();
    await database.command({ ping: 1 });
    console.log("MongoDB connection test successful");
    return true;
  } catch (error) {
    console.error("MongoDB connection test failed:", error);
    return false;
  }
};

module.exports = {
  connectDB,
  closeDB,
  testConnection,
};
