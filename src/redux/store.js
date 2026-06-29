import { configureStore } from '@reduxjs/toolkit';
import { requirementsApi } from './requirementsApi';
import { candidateApi } from './candidateApi';
import { pipelineStagesApi } from './pipelineStagesApi';
import { intelligenceApi } from './intelligenceApi';
import { examApi } from './examApi';
import { interviewApi } from './interviewApi';
import { settingsApi } from './settingsApi';

export const store = configureStore({
  reducer: {
    [requirementsApi.reducerPath]: requirementsApi.reducer,
    [candidateApi.reducerPath]: candidateApi.reducer,
    [pipelineStagesApi.reducerPath]: pipelineStagesApi.reducer,
    [intelligenceApi.reducerPath]: intelligenceApi.reducer,
    [examApi.reducerPath]: examApi.reducer,
    [interviewApi.reducerPath]: interviewApi.reducer,
    [settingsApi.reducerPath]: settingsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      requirementsApi.middleware,
      candidateApi.middleware,
      pipelineStagesApi.middleware,
      intelligenceApi.middleware,
      examApi.middleware,
      interviewApi.middleware,
      settingsApi.middleware,
    ),
});
