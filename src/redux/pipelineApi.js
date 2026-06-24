import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const pipelineApi = createApi({
  reducerPath: 'pipelineApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:3000/api' }),
  tagTypes: ['Pipelines'], // 1. Main tag registration
  

  endpoints: (builder) => ({
    // 1. Get all pipelines
    getAllPipelines: builder.query({
      query: () => '/pipelines',
      providesTags: ['Pipelines'], // 2. Attaches the tag to the fetched list cache
    }),
    getPipelineDetails: builder.query({
      query: (pipelineId) => `/pipelines/${pipelineId}`,
      providesTags: ['Pipelines'], // 2. Attaches the tag to the fetched list cache
    }),
    // 2. Mutation: Create a new Pipeline
    addPipeline: builder.mutation({
      query: (newPipeline) => ({
        url: '/pipelines',
        method: 'POST',
        body: newPipeline,
      }),
      // 3. FIXED: Moved inside the mutation object and changed 'Requirements' to 'Requirement'
      invalidatesTags: ['Pipelines'], 
    }),
    editPipeline: builder.mutation({
      query: ({ pipelineId, updatedPipeline }) => ({
        url: `/pipelines/${pipelineId}`,
        method: 'PUT',
        body: updatedPipeline,
      }),
      invalidatesTags: ['Pipelines'], // Invalidate the 'Pipelines' tag to refetch the list after editing
    }),
    deletePipeline: builder.mutation({
      query: (pipelineId) => ({
        url: `/pipelines/${pipelineId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Pipelines'], // Invalidate the 'Pipelines' tag to refetch the list after deletion
    }),
  }),
});

export const { useGetAllPipelinesQuery, useGetPipelineDetailsQuery, useAddPipelineMutation, useEditPipelineMutation, useDeletePipelineMutation } = pipelineApi;
