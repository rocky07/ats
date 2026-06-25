import { configureStore } from '@reduxjs/toolkit';
import { requirementsApi } from './requirementsApi';
import { candidateApi } from './candidateApi';
import { pipelineStagesApi } from './pipelineStagesApi';
import { intelligenceApi } from './intelligenceApi';

export const store = configureStore({
  reducer: {
    // Mount the API sub-reducers
    [requirementsApi.reducerPath]: requirementsApi.reducer,
    [candidateApi.reducerPath]: candidateApi.reducer,
    [pipelineStagesApi.reducerPath]: pipelineStagesApi.reducer,
    [intelligenceApi.reducerPath]: intelligenceApi.reducer,
  },
  // Adding the api middleware enables caching, invalidation, and polling features
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      requirementsApi.middleware,
      candidateApi.middleware,
      pipelineStagesApi.middleware,
      intelligenceApi.middleware,
    ),
});
