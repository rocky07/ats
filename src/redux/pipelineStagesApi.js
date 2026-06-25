import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../config';

// Persists the per-requirement pipeline stages (ingested / ranked / l1 / l2 / l3).
export const pipelineStagesApi = createApi({
  reducerPath: 'pipelineStagesApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  tagTypes: ['PipelineStages'],

  endpoints: (builder) => ({
    // Load the saved stages for a given requirement.
    getPipelineStages: builder.query({
      query: (requirementId) => `/pipelines/${requirementId}`,
      providesTags: (result, error, requirementId) => [
        { type: 'PipelineStages', id: requirementId },
      ],
    }),
    // Replace the stored stages for a requirement.
    savePipelineStages: builder.mutation({
      query: ({ requirementId, stages }) => ({
        url: `/pipelines/${requirementId}`,
        method: 'PUT',
        body: { stages },
      }),
      invalidatesTags: (result, error, { requirementId }) => [
        { type: 'PipelineStages', id: requirementId },
      ],
    }),
  }),
});

export const { useGetPipelineStagesQuery, useLazyGetPipelineStagesQuery, useSavePipelineStagesMutation } =
  pipelineStagesApi;
