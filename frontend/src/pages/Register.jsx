import React, { useState } from "react";
import api from "../api";

const Register = () => {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = async () => {
    try {
      // Step 1: Get Registration Challenge
      const { data: options } = await api.post("/auth/register-challenge", {
        name,
      });

      // Step 2: Convert challenge to Uint8Array
      options.challenge = Uint8Array.from(atob(options.challenge), (c) =>
        c.charCodeAt(0)
      );
      options.user.id = Uint8Array.from(name, (c) => c.charCodeAt(0));

      // Step 3: Call WebAuthn API to register
      const credential = await navigator.credentials.create({
        publicKey: options,
      });

      // Step 4: Decode attestation object and client data
      const attestationObject = credential.response.attestationObject;
      const clientDataJSON = credential.response.clientDataJSON;

      // Step 5: Send response back to server
      await api.post("/auth/register", {
        name,
        attestationResponse: {
          id: credential.id,
          rawId: Array.from(new Uint8Array(credential.rawId)),
          type: credential.type,
          response: {
            attestationObject: Array.from(new Uint8Array(attestationObject)),
            clientDataJSON: Array.from(new Uint8Array(clientDataJSON)),
          },
        },
      });

      setMessage("Registration successful! You can now log in.");
    } catch (error) {
      console.error(error);
      setMessage("Registration failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4">Register</h2>
        <input
          type="text"
          className="w-full p-2 mb-4 border rounded"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          onClick={handleRegister}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Register with Fingerprint
        </button>
        {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
      </div>
    </div>
  );
};

export default Register;
