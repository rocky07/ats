import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../config';

export const requirementsApi = createApi({
  reducerPath: 'requirementsApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  tagTypes: ['Requirement'], // 1. Main tag registration

  endpoints: (builder) => ({
    // 1. Get all requirements
    getRequirements: builder.query({
      query: () => '/requirements',
      providesTags: ['Requirement'], // 2. Attaches the tag to the fetched list cache
    }),
    getRequirementDetails: builder.query({
      query: (requirementId) => `/requirements/${requirementId}`,
      providesTags: ['Requirement'], // 2. Attaches the tag to the fetched list cache
    }),
    updateRequirement: builder.mutation({
      query: ({ requirementId, updatedRequirement }) => ({
        url: `/requirements/${requirementId}`,
        method: 'PUT',
        body: updatedRequirement,
      }),
      invalidatesTags: ['Requirement'], // Invalidate the 'Requirement' tag to refetch the list after editing
    }),
    // 2. Mutation: Create a new requirement
    addRequirement: builder.mutation({
      query: (newRequirement) => ({
        url: '/requirements',
        method: 'POST',
        body: newRequirement,
      }),
      // 3. FIXED: Moved inside the mutation object and changed 'Requirements' to 'Requirement'
      invalidatesTags: ['Requirement'],
    }),
    deleteRequirement: builder.mutation({
      query: (requirementId) => ({
        url: `/requirements/${requirementId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Requirement'], // Invalidate the 'Requirement' tag to refetch the list after deletion
    }),

  }),
});

export const { useGetRequirementsQuery, useGetRequirementDetailsQuery, useAddRequirementMutation, useUpdateRequirementMutation, useDeleteRequirementMutation } = requirementsApi;