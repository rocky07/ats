import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../config';
import { getStoredToken } from '../auth/AuthContext';

export const baseQueryWithAuth = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = getStoredToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});
