const mongoose = require("mongoose");

const queueSchema = new mongoose.Schema(
    {
        shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
        customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        tokenNumber: { type: Number, required: true },
        tokenLabel: { type: String, required: true, trim: true },
        status: {
            type: String,
            enum: ["waiting", "called", "served", "skipped", "cancelled"],
            default: "waiting"
        },
        estimatedWaitMinutes: { type: Number, default: 0 },
        notificationSent: { type: Boolean, default: false },
        calledAt: { type: Date, default: null },
        servedAt: { type: Date, default: null }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Queue", queueSchema);
