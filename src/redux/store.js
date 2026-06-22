import { configureStore } from '@reduxjs/toolkit';
import { requirementsApi } from './requirementsApi';

export const store = configureStore({
  reducer: {
    // Mount the API sub-reducer
    [requirementsApi.reducerPath]: requirementsApi.reducer,
  },
  // Adding the api middleware enables caching, invalidation, and polling features
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(requirementsApi.middleware),
});