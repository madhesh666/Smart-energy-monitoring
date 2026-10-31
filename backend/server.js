
const express = require("express");
const http = require("http");
const cors = require("cors");
const mqtt = require("mqtt");
const path = require("path");
const { Server } = require("socket.io");

// Initialize Express
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend HTML
app.use(express.static(path.join(__dirname, "../frontend")));

// Initialize Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// MQTT Configuration
const MQTT_BROKER = "mqtt://broker.hivemq.com";
const MQTT_TOPIC = "madhesh/smart-energy/telemetry";

// Store latest readings
let latestReadings = null;

// Connect to MQTT Broker
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on("connect", () => {
    console.log("MQTT Broker Connected!");

    mqttClient.subscribe(MQTT_TOPIC, (error) => {
        if (error) {
            console.error("MQTT Subscription Error:", error.message);
        } else {
            console.log("Subscribed to:", MQTT_TOPIC);
        }
    });
});

// MQTT Error Handling
mqttClient.on("error", (error) => {
    console.error("MQTT Error:", error.message);
});

// Receive ESP32 / Wokwi Sensor Data
mqttClient.on("message", (topic, message) => {
    try {
        const readings = JSON.parse(message.toString());

        console.log("MQTT DATA RECEIVED:", readings);

        // Save latest readings
        latestReadings = readings;

        // Send data to connected dashboard
        io.emit("energyData", readings);

        console.log("Data forwarded to dashboard!");

    } catch (error) {
        console.error("Invalid MQTT Message:", error.message);
    }
});

// Socket.IO Dashboard Connection
io.on("connection", (socket) => {
    console.log("Dashboard Connected:", socket.id);

    // Send latest data immediately to new dashboard connection
    if (latestReadings !== null) {
        socket.emit("energyData", latestReadings);
        console.log("Latest data sent to dashboard!");
    }

    socket.on("disconnect", () => {
        console.log("Dashboard Disconnected:", socket.id);
    });
});

// Backend Test Route
app.get("/", (req, res) => {
    res.send("Smart Energy Monitoring Backend is Running!");
});

// Start Server
const PORT = 3000;

server.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});
