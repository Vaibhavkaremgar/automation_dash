// FRONTEND FIX: Add to your API client/axios interceptor

// In your customer update function:
const updateCustomer = async (customer) => {
  try {
    const response = await api.put(`/api/insurance/customers/${customer.id}`, customer);
    
    // Check if backend auto-healed the ID
    if (response.data._idChanged) {
      console.log(`✅ ID auto-healed: ${response.data._oldId} → ${response.data._newId}`);
      
      // Update local state with new ID
      customer.id = response.data._newId;
      
      // Show success message
      toast.success('Customer updated successfully (ID was refreshed)');
    }
    
    return response.data;
  } catch (error) {
    if (error.response?.status === 404 && error.response?.data?.shouldRefresh) {
      // Backend says we need to refresh
      toast.error('Customer data is outdated. Refreshing...');
      
      // Refetch all customers
      await fetchCustomers();
      
      throw new Error('Please try again after refresh');
    }
    throw error;
  }
};

// Add to sync completion handler:
const handleSyncComplete = async () => {
  // CRITICAL: Refetch all customers after sync to get new IDs
  await fetchCustomers();
  toast.success('Sync complete - customer list refreshed');
};
