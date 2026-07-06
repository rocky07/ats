import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './baseQuery';

export const requirementsApi = createApi({
  reducerPath: 'requirementsApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Requirement', 'Department'],

  endpoints: (builder) => ({
    getDepartments: builder.query({
      query: () => '/requirements/departments',
      providesTags: ['Department'],
    }),
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
    shareRequirement: builder.mutation({
      query: ({ requirementId, ...body }) => ({
        url: `/requirements/${requirementId}/share`,
        method: 'POST',
        body,
      }),
    }),

  }),
});

export const { useGetRequirementsQuery, useGetRequirementDetailsQuery, useAddRequirementMutation, useUpdateRequirementMutation, useDeleteRequirementMutation, useShareRequirementMutation, useGetDepartmentsQuery } = requirementsApi;