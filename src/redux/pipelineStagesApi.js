import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './baseQuery';

// Persists the per-requirement pipeline stages (ingested / ranked / l1 / l2 / l3).
export const pipelineStagesApi = createApi({
  reducerPath: 'pipelineStagesApi',
  baseQuery: baseQueryWithAuth,
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
