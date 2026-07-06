import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './baseQuery';
export const candidateApi = createApi({
  reducerPath: 'candidateApi',
  baseQuery: baseQueryWithAuth,
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
    // Fetch a presigned S3 download URL for a candidate's resume.
    getResumeUrl: builder.query({
      query: (candidateId) => `/candidates/${candidateId}/resume`,
    }),
    // Upload a resume file; the backend parses it and creates a candidate.
    uploadResume: builder.mutation({
      query: (file) => {
        const formData = new FormData();
        formData.append('resume', file);
        return {
          url: '/candidates/upload',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Candidates'],
    }),
    // Re-parse an already-uploaded resume with Claude to fill in summary/experience/etc.
    reparseWithAi: builder.mutation({
      query: (candidateId) => ({
        url: `/candidates/${candidateId}/reparse`,
        method: 'POST',
      }),
      invalidatesTags: ['Candidates'],
    }),
  }),
});

export const { useGetAllCandidatesQuery, useGetCandidatesDetailsQuery, useAddCandidateMutation, useEditCandidateMutation, useDeleteCandidateMutation, useUploadResumeMutation, useGetResumeUrlQuery, useReparseWithAiMutation } = candidateApi;
