import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './baseQuery';

export const examApi = createApi({
  reducerPath: 'examApi',
  baseQuery: baseQueryWithAuth,
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
