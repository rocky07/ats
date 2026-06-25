import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../config';

// Live Dice market intelligence + AI job-summary generation.
export const intelligenceApi = createApi({
  reducerPath: 'intelligenceApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),

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
  }),
});

export const { useGetMarketIntelligenceMutation, useGenerateJobSummaryMutation } = intelligenceApi;
