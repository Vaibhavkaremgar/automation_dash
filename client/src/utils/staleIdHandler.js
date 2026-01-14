// FRONTEND PATCH - Add to your API client/interceptor
// This is ADDITIVE - does not change existing logic

// Add this response interceptor to your axios instance
const handleStaleIdError = (error) => {
  if (error.response?.status === 404 && error.response?.data?.shouldRefresh) {
    // Mark this request as needing a retry after refetch
    if (!error.config._retryAfterRefresh) {
      error.config._retryAfterRefresh = true;
      
      // Trigger refetch (implementation depends on your state management)
      // Example for React Query:
      // queryClient.invalidateQueries(['customers']);
      
      // Example for Redux:
      // dispatch(fetchCustomers());
      
      // Example for simple state:
      // window.location.reload(); // Last resort
      
      console.warn('[AUTO-RECOVERY] Stale customer ID detected, triggering refetch');
      
      // Return a promise that rejects with a user-friendly message
      return Promise.reject({
        ...error,
        userMessage: 'Customer data was updated. Please try again.',
        shouldRetry: true
      });
    }
  }
  return Promise.reject(error);
};

// Apply to your axios instance
// axiosInstance.interceptors.response.use(response => response, handleStaleIdError);

// ALTERNATIVE: Wrap your update function
const safeUpdateCustomer = async (customerId, customerData) => {
  try {
    // Always include sheet_row_number if available
    const payload = {
      ...customerData,
      sheet_row_number: customerData.sheet_row_number || customerData.id
    };
    
    const response = await api.put(`/api/insurance/customers/${customerId}`, payload);
    
    // Check if ID was auto-healed
    if (response.data._idChanged) {
      console.log(`[AUTO-HEAL] ID changed: ${response.data._oldId} → ${response.data._newId}`);
      // Update local state with new ID
      return { ...response.data, _wasHealed: true };
    }
    
    return response.data;
  } catch (error) {
    if (error.response?.status === 404 && error.response?.data?.shouldRefresh) {
      // One-time refetch and retry
      console.warn('[AUTO-RECOVERY] Refetching customer list...');
      // await refetchCustomers(); // Your refetch logic here
      throw new Error('Customer data was updated. Please refresh and try again.');
    }
    throw error;
  }
};

export { handleStaleIdError, safeUpdateCustomer };
