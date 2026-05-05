import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem("executive-console-token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
