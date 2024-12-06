import axios from "axios";

const api = axios.create({
  baseURL: "https://auth-1qap.onrender.com/api", // Backend URL
});

export default api;
