import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './baseQuery';

export const settingsApi = createApi({
  reducerPath: 'settingsApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['SystemSettings', 'UserSettings', 'ExamSettings'],

  endpoints: (builder) => ({
    getSystemSettings: builder.query({
      query: () => '/settings/system',
      providesTags: ['SystemSettings'],
    }),
    updateSystemSettings: builder.mutation({
      query: (body) => ({ url: '/settings/system', method: 'PATCH', body }),
      invalidatesTags: ['SystemSettings'],
    }),
    getUserSettings: builder.query({
      query: () => '/settings/user',
      providesTags: ['UserSettings'],
    }),
    updateUserSettings: builder.mutation({
      query: (body) => ({ url: '/settings/user', method: 'PATCH', body }),
      invalidatesTags: ['UserSettings'],
    }),
    // Exam settings are readable/writable by any authenticated user (not admin-gated
    // like the rest of system settings).
    getExamSettings: builder.query({
      query: () => '/settings/exam',
      providesTags: ['ExamSettings'],
    }),
    updateExamSettings: builder.mutation({
      query: (body) => ({ url: '/settings/exam', method: 'PATCH', body }),
      invalidatesTags: ['ExamSettings'],
    }),
  }),
});

export const {
  useGetSystemSettingsQuery,
  useUpdateSystemSettingsMutation,
  useGetUserSettingsQuery,
  useUpdateUserSettingsMutation,
  useGetExamSettingsQuery,
  useUpdateExamSettingsMutation,
} = settingsApi;
