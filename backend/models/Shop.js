const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        category: { type: String, required: true, trim: true },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        queuePrefix: { type: String, default: "SQ", trim: true },
        currentTokenNumber: { type: Number, default: 0 },
        currentlyServingToken: { type: Number, default: 0 },
        averageServiceTime: { type: Number, default: 5 },
        status: { type: String, enum: ["open", "closed"], default: "open" },
        lastCalledAt: { type: Date, default: null }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Shop", shopSchema);
