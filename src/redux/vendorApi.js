import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './baseQuery';

export const vendorApi = createApi({
  reducerPath: 'vendorApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Vendor', 'VendorGroup'],
  endpoints: (build) => ({
    getVendors: build.query({
      query: () => '/vendors',
      providesTags: ['Vendor'],
    }),
    createVendor: build.mutation({
      query: (body) => ({ url: '/vendors', method: 'POST', body }),
      invalidatesTags: ['Vendor'],
    }),
    updateVendor: build.mutation({
      query: ({ id, ...body }) => ({ url: `/vendors/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Vendor'],
    }),
    deleteVendor: build.mutation({
      query: (id) => ({ url: `/vendors/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Vendor'],
    }),
    bulkImportVendors: build.mutation({
      query: (vendors) => ({ url: '/vendors/bulk-import', method: 'POST', body: { vendors } }),
      invalidatesTags: ['Vendor'],
    }),
    getGroups: build.query({
      query: () => '/vendors/groups',
      providesTags: ['VendorGroup'],
    }),
    createGroup: build.mutation({
      query: (name) => ({ url: '/vendors/groups', method: 'POST', body: { name } }),
      invalidatesTags: ['VendorGroup'],
    }),
    updateGroup: build.mutation({
      query: ({ oldName, newName }) => ({ url: `/vendors/groups/${encodeURIComponent(oldName)}`, method: 'PUT', body: { name: newName } }),
      invalidatesTags: ['VendorGroup', 'Vendor'],
    }),
    deleteGroup: build.mutation({
      query: (name) => ({ url: `/vendors/groups/${encodeURIComponent(name)}`, method: 'DELETE' }),
      invalidatesTags: ['VendorGroup'],
    }),
  }),
});

export const {
  useGetVendorsQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
  useBulkImportVendorsMutation,
  useGetGroupsQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
} = vendorApi;
