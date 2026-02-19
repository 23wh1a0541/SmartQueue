const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema({
    name: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    currentToken: { type: Number, default: 0 },
    servingToken: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Shop", shopSchema);
