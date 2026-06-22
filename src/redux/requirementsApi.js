import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const requirementsApi = createApi({
  reducerPath: 'requirementsApi',
  baseQuery: fetchBaseQuery({ baseUrl: process.env.BASE_URL || 'http://localhost:3000/api' }),
  tagTypes: ['Requirement'], // 1. Main tag registration
  
  endpoints: (builder) => ({
    // 1. Get all requirements
    getRequirements: builder.query({
      query: () => '/requirements',
      providesTags: ['Requirement'], // 2. Attaches the tag to the fetched list cache
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
  }),
});

export const { useGetRequirementsQuery, useAddRequirementMutation } = requirementsApi;