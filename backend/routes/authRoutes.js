const express = require("express");
const base64url = require("base64url");
const crypto = require("crypto");
const cbor = require("cbor");
const User = require("../models/User");
const router = express.Router();

// Helper to generate a random challenge
function generateChallenge() {
  return base64url(crypto.randomBytes(32));
}

// Register Challenge
router.post("/register-challenge", async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const user = await User.findOne({ name });
  if (user) {
    return res.status(400).json({ error: "User already exists" });
  }

  const challenge = generateChallenge();

  const publicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: "Biometric Auth App",
      id: "localhost",
    },
    user: {
      id: base64url(crypto.randomBytes(16)),
      name,
      displayName: name,
    },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256
    timeout: 60000,
    authenticatorSelection: {
      authenticatorAttachment: "cross-platform",
    },
    attestation: "direct",
  };

  res.json(publicKeyCredentialCreationOptions);
});

router.post("/register", async (req, res) => {
  const { name, attestationResponse } = req.body;

  if (!name || !attestationResponse) {
    return res.status(400).json({ error: "Missing registration data" });
  }

  const { response } = attestationResponse;

  try {
    // Decode attestationObject
    const attestationObjectBuffer = Buffer.from(
      response.attestationObject,
      "base64"
    );

    // Add size validation
    if (attestationObjectBuffer.length > 1024 * 1024) {
      return res.status(400).json({ error: "attestationObject too large" });
    }

    const decodedAttestation = cbor.decodeAllSync(attestationObjectBuffer)[0];
    const { authData } = decodedAttestation;

    // Process credentialId and publicKey as before
    const dataView = new DataView(new ArrayBuffer(2));
    const idLenBytes = authData.slice(53, 55);
    idLenBytes.forEach((value, index) => dataView.setUint8(index, value));
    const credentialIdLength = dataView.getUint16();

    const credentialId = authData.slice(55, 55 + credentialIdLength);
    const publicKeyBytes = authData.slice(55 + credentialIdLength);

    const publicKeyObject = cbor.decodeAllSync(publicKeyBytes.buffer)[0];

    // Save user in database
    const user = new User({
      name,
      credentialId: base64url(credentialId),
      publicKey: base64url(publicKeyBytes),
    });

    await user.save();
    res.json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error decoding attestationObject:", error);
    res.status(400).json({ error: "Invalid attestation data" });
  }
});

// Login Challenge
router.post("/login-challenge", async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const user = await User.findOne({ name });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const challenge = generateChallenge();

  const publicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials: [
      {
        id: base64url.toBuffer(user.credentialId),
        type: "public-key",
      },
    ],
    timeout: 60000,
  };

  res.json(publicKeyCredentialRequestOptions);
});

// Login
router.post("/login", async (req, res) => {
  const { name, assertionResponse } = req.body;

  if (!name || !assertionResponse) {
    return res.status(400).json({ error: "Missing login data" });
  }

  const user = await User.findOne({ name });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const { id, response } = assertionResponse;

  // Decode clientDataJSON
  const clientDataJSON = Buffer.from(response.clientDataJSON).toString("utf-8");
  const clientData = JSON.parse(clientDataJSON);

  if (clientData.type !== "webauthn.get") {
    return res.status(400).json({ error: "Invalid login type" });
  }

  // Validate authenticatorData and signature (omitted for simplicity)
  // You should verify the signature using the stored public key.

  res.json({ message: "Login successful" });
});

module.exports = router;
