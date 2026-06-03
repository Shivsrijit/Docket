import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "/api");
const api = axios.create({
    baseURL : BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("docket-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers["x-client-time"] = new Date().toString();
  return config;
});

export default api;