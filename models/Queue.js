const mongoose = require("mongoose");

const queueSchema = new mongoose.Schema({
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    tokenNumber: Number,
    status: { type: String, enum: ["waiting", "served"], default: "waiting" }
}, { timestamps: true });

module.exports = mongoose.model("Queue", queueSchema);
