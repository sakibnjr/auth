const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true }, // User's name
  credentialID: { type: Buffer, required: true }, // Credential ID (unique for each biometric registration)
  publicKey: { type: String, required: true }, // Public key from WebAuthn registration
  currentChallenge: { type: String }, // Challenge for authentication (used during login)
});

const User = mongoose.model("User", userSchema);

module.exports = User;
