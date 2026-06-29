import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './baseQuery';

export const settingsApi = createApi({
  reducerPath: 'settingsApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['SystemSettings', 'UserSettings'],

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
  }),
});

export const {
  useGetSystemSettingsQuery,
  useUpdateSystemSettingsMutation,
  useGetUserSettingsQuery,
  useUpdateUserSettingsMutation,
} = settingsApi;
