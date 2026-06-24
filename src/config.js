// API base URL.
// In Amplify (or any build), set the VITE_API_BASE_URL environment variable.
// Falls back to the local dev backend when the variable is not provided.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
