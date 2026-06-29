import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './baseQuery';

export const interviewApi = createApi({
  reducerPath: 'interviewApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Panel', 'Interview'],

  endpoints: (builder) => ({
    getPanelMembers: builder.query({
      query: (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.department) params.set('department', filters.department);
        if (filters.region && filters.region !== 'global') params.set('region', filters.region);
        const qs = params.toString();
        return qs ? `/interviews/panel?${qs}` : '/interviews/panel';
      },
      providesTags: ['Panel'],
    }),
    addPanelMember: builder.mutation({
      query: (body) => ({ url: '/interviews/panel', method: 'POST', body }),
      invalidatesTags: ['Panel'],
    }),
    updatePanelMember: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/interviews/panel/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Panel'],
    }),
    removePanelMember: builder.mutation({
      query: (id) => ({ url: `/interviews/panel/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Panel'],
    }),
    checkConflicts: builder.mutation({
      query: (body) => ({ url: '/interviews/check-conflicts', method: 'POST', body }),
    }),
    scheduleInterview: builder.mutation({
      query: (body) => ({ url: '/interviews/schedule', method: 'POST', body }),
      invalidatesTags: ['Interview'],
    }),
    getCandidateInterviews: builder.query({
      query: (candidateId) => `/interviews/candidate/${candidateId}`,
      providesTags: ['Interview'],
    }),
  }),
});

export const {
  useGetPanelMembersQuery,
  useAddPanelMemberMutation,
  useUpdatePanelMemberMutation,
  useRemovePanelMemberMutation,
  useCheckConflictsMutation,
  useScheduleInterviewMutation,
  useGetCandidateInterviewsQuery,
} = interviewApi;
