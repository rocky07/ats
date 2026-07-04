import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './baseQuery';

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: baseQueryWithAuth,
  endpoints: (build) => ({
    getDashboard: build.query({
      query: (region = 'global') => `/dashboard?region=${region}`,
    }),
  }),
});

export const { useGetDashboardQuery } = dashboardApi;
