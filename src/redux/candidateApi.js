import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../config';
export const candidateApi = createApi({
  reducerPath: 'candidateApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  tagTypes: ['Candidates'], // 1. Main tag registration
  

  endpoints: (builder) => ({
    // 1. Get all candidates
    getAllCandidates: builder.query({
      query: () => '/candidates',
      providesTags: ['Candidates'], // 2. Attaches the tag to the fetched list cache
    }),
    getCandidatesDetails: builder.query({
      query: (candidateId) => `/candidates/${candidateId}`,
      providesTags: ['Candidates'], // 2. Attaches the tag to the fetched list cache
    }),
    // 2. Mutation: Create a new CandidateProfile
    addCandidate: builder.mutation({
      query: (newCandidate) => ({
        url: '/candidates',
        method: 'POST',
        body: newCandidate,
      }),
      // 3. FIXED: Moved inside the mutation object and changed 'Requirements' to 'Requirement'
      invalidatesTags: ['Candidates'], 
    }),
    editCandidate: builder.mutation({
      query: ({ candidateId, updatedCandidate }) => ({
        url: `/candidates/${candidateId}`,
        method: 'PUT',
        body: updatedCandidate,
      }),
      invalidatesTags: ['Candidates'], // Invalidate the 'Candidates' tag to refetch the list after editing
    }),
    deleteCandidate: builder.mutation({
      query: (candidateId) => ({
        url: `/candidates/${candidateId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Candidates'], // Invalidate the 'Candidates' tag to refetch the list after deletion
    }),
  }),
});

export const { useGetAllCandidatesQuery, useGetCandidatesDetailsQuery, useAddCandidateMutation, useEditCandidateMutation, useDeleteCandidateMutation } = candidateApi;
