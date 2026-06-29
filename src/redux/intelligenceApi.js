import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './baseQuery';

// Live Dice market intelligence + AI job-summary generation.
export const intelligenceApi = createApi({
  reducerPath: 'intelligenceApi',
  baseQuery: baseQueryWithAuth,

  endpoints: (builder) => ({
    // Fetch market intelligence for the in-progress requirement form.
    getMarketIntelligence: builder.mutation({
      query: (criteria) => ({
        url: '/intelligence/market',
        method: 'POST',
        body: criteria,
      }),
    }),
    // Generate a job description from the collected form fields.
    generateJobSummary: builder.mutation({
      query: (form) => ({
        url: '/intelligence/job-summary',
        method: 'POST',
        body: form,
      }),
    }),
    // Rank a list of candidates against a job requirement using Claude.
    rankCandidates: builder.mutation({
      query: ({ candidates, requirement }) => ({
        url: '/intelligence/rank',
        method: 'POST',
        body: { candidates, requirement },
      }),
    }),
  }),
});

export const { useGetMarketIntelligenceMutation, useGenerateJobSummaryMutation, useRankCandidatesMutation } = intelligenceApi;
