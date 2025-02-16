// backend/index.js
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Middleware to parse JSON request bodies

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Define the schema for iTAG data
const itagDataSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  latitude: { type: Number },
  longitude: { type: Number },
  state: { type: String, enum: ["active", "not_active"] },
  timestamp: { type: Date, default: Date.now },
});

const ItagData = mongoose.model("ItagData", itagDataSchema);

// API Endpoint to Save iTAG Data (POST)
app.post("/api/itag_data", async (req, res) => {
  try {
    const { deviceId, latitude, longitude, state } = req.body;

    if (!deviceId) {
      return res.status(400).json({ message: "deviceId is required" });
    }
    if (state !== "active" && state !== "not_active") {
      return res
        .status(400)
        .json({ message: "State must be 'active' or 'not_active'" });
    }

    let itagData = await ItagData.findOneAndUpdate(
      { deviceId: deviceId },
      {
        latitude: latitude,
        longitude: longitude,
        state: state,
        timestamp: Date.now(),
      },
      {
        upsert: true,
        new: true,
      }
    );

    console.log("Data saved/updated:", itagData);
    res
      .status(200)
      .json({ message: "Data saved/updated successfully", data: itagData });
  } catch (error) {
    console.error("Error saving/updating iTAG data:", error);
    res
      .status(500)
      .json({ message: "Failed to save/update data", error: error.message });
  }
});

// API Endpoint to Save iTAG Data (POST)
app.post("/api/itag_data/connect", async (req, res) => {
  try {
    const { scannedDeviceIds } = req.body;
    if (!Array.isArray(scannedDeviceIds)) {
      return res
        .status(400)
        .json({ message: "scannedDeviceIds must be an array" });
    }
    if (scannedDeviceIds.length === 0) {
      return res.status(200).json({ deviceId: null }); // No devices scanned
    }
    // Find the first device ID that exists in the database
    const foundDevice = await ItagData.findOne({
      deviceId: { $in: scannedDeviceIds },
    });

    if (foundDevice) {
      res.status(200).json({ deviceId: foundDevice.deviceId }); // Return the matching device ID
    } else {
      res.status(200).json({ deviceId: null }); // No matching device found
    }
  } catch (error) {
    console.error("Error finding device to connect:", error);
    res
      .status(500)
      .json({
        message: "Failed to find device to connect",
        error: error.message,
      });
  }
});

// API Endpoint to Get iTAG Data (GET)
app.get("/api/itag_data/", async (req, res) => {
  try {
    const itagData = await ItagData.find();
    if (itagData) {
      res
        .status(200)
        .json({ message: "Data retrieved successfully", data: itagData });
    } else {
      res.status(404).json({ message: "Data not found" });
    }
  } catch (error) {
    console.error("Error fetching iTAG data:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch data", error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
