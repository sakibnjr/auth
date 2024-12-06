import React, { useState } from "react";
import api from "../api";

const Login = () => {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    try {
      // Step 1: Get Login Challenge
      const { data: options } = await api.post("/auth/login-challenge", {
        name,
      });

      // Step 2: Convert challenge and allowCredentials.id to Uint8Array
      options.challenge = Uint8Array.from(atob(options.challenge), (c) =>
        c.charCodeAt(0)
      );
      options.allowCredentials = options.allowCredentials.map((cred) => ({
        ...cred,
        id: Uint8Array.from(atob(cred.id), (c) => c.charCodeAt(0)),
      }));

      // Step 3: Call WebAuthn API for authentication
      const assertion = await navigator.credentials.get({ publicKey: options });

      // Step 4: Decode authenticator data and client data
      const authenticatorData = assertion.response.authenticatorData;
      const clientDataJSON = assertion.response.clientDataJSON;
      const signature = assertion.response.signature;
      const userHandle = assertion.response.userHandle;

      // Step 5: Send response back to server
      const { data } = await api.post("/auth/login", {
        name,
        assertionResponse: {
          id: assertion.id,
          rawId: Array.from(new Uint8Array(assertion.rawId)),
          type: assertion.type,
          response: {
            authenticatorData: Array.from(new Uint8Array(authenticatorData)),
            clientDataJSON: Array.from(new Uint8Array(clientDataJSON)),
            signature: Array.from(new Uint8Array(signature)),
            userHandle: userHandle
              ? Array.from(new Uint8Array(userHandle))
              : null,
          },
        },
      });

      setMessage(`Welcome, ${name}! Login successful.`);
    } catch (error) {
      console.error(error);
      setMessage("Login failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4">Login</h2>
        <input
          type="text"
          className="w-full p-2 mb-4 border rounded"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          onClick={handleLogin}
          className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
        >
          Login with Fingerprint
        </button>
        {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
      </div>
    </div>
  );
};

export default Login;
