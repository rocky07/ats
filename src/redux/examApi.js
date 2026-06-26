import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../config';

export const examApi = createApi({
  reducerPath: 'examApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  tagTypes: ['Exam'],

  endpoints: (builder) => ({
    generateExam: builder.mutation({
      query: (requirementId) => ({
        url: '/exams/generate',
        method: 'POST',
        body: { requirementId },
      }),
      invalidatesTags: ['Exam'],
    }),
    getExamByRequirement: builder.query({
      query: (reqId) => `/exams/by-requirement/${reqId}`,
      providesTags: ['Exam'],
    }),
    getExamPublic: builder.query({
      query: (examId) => `/exams/${examId}`,
    }),
    submitExam: builder.mutation({
      query: ({ examId, ...body }) => ({
        url: `/exams/${examId}/submit`,
        method: 'POST',
        body,
      }),
    }),
    getSubmission: builder.query({
      query: ({ examId, candidateId }) => `/exams/${examId}/submission/${candidateId}`,
    }),
    sendExamInvite: builder.mutation({
      query: (body) => ({
        url: '/exams/send-invite',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGenerateExamMutation,
  useGetExamByRequirementQuery,
  useGetExamPublicQuery,
  useSubmitExamMutation,
  useGetSubmissionQuery,
  useSendExamInviteMutation,
} = examApi;
