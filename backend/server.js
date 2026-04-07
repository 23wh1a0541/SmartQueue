const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

dotenv.config();

const app = express();

const allowedOrigins = [
    process.env.CLIENT_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173"
].filter(Boolean);

app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error("CORS not allowed for this origin."));
        },
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "SmartQueue API"
    });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/queue", require("./routes/queueRoutes"));
app.use("/api/shops", require("./routes/shopRoutes"));

const PORT = process.env.PORT || 5000;

app.use((err, _req, res, _next) => {
    console.error("Server error:", err.message);
    res.status(500).json({ message: err.message || "Internal server error." });
});

const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`SmartQueue API running on port ${PORT}`);
        });
    } catch (error) {
        console.error("DB connection failed:", error.message);
        process.exit(1);
    }
};

startServer();
