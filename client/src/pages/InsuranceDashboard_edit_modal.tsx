{/* Edit Customer Modal */}
<Modal
  open={!!editingCustomer}
  onClose={() => setEditingCustomer(null)}
  title="Edit Customer"
>
  {editingCustomer && (
    <div className="space-y-3 max-h-[75vh] overflow-y-auto p-1">
      <div>
        <label className="text-sm text-slate-300 mb-1 block">Name *</label>
        <Input
          type="text"
          placeholder="Name"
          value={editingCustomer.name || ''}
          onChange={(e) => setEditingCustomer({...editingCustomer, name: e.target.value})}
          required
        />
      </div>
      <div>
        <label className="text-sm text-slate-300 mb-1 block">DOB</label>
        <Input
          type="date"
          value={editingCustomer.dob?.includes('/') ? editingCustomer.dob.split('/').reverse().join('-') : editingCustomer.dob || ''}
          onChange={(e) => setEditingCustomer({...editingCustomer, dob: e.target.value})}
        />
      </div>
      <div>
        <label className="text-sm text-slate-300 mb-1 block">G Code</label>
        <Input
          type="text"
          placeholder="G Code"
          value={editingCustomer.g_code || ''}
          onChange={(e) => setEditingCustomer({...editingCustomer, g_code: e.target.value})}
        />
      </div>
      <div>
        <label className="text-sm text-slate-300 mb-1 block">Mobile No *</label>
        <Input
          type="text"
          placeholder="Mobile No"
          value={editingCustomer.mobile_number || ''}
          onChange={(e) => setEditingCustomer({...editingCustomer, mobile_number: e.target.value})}
          required
        />
      </div>
      <div>
        <label className="text-sm text-slate-300 mb-1 block">Email</label>
        <Input
          type="email"
          placeholder="Email"
          value={editingCustomer.email || ''}
          onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})}
        />
      </div>
      <div>
        <label className="text-sm text-slate-300 mb-1 block">PAN Number</label>
        <Input
          type="text"
          placeholder="PAN Number"
          value={editingCustomer.pancard || ''}
          onChange={(e) => setEditingCustomer({...editingCustomer, pancard: e.target.value})}
        />
      </div>
      <div>
        <label className="text-sm text-slate-300 mb-1 block">Aadhar Number</label>
        <Input
          type="text"
          placeholder="Aadhar Number"
          value={editingCustomer.aadhar_card || ''}
          onChange={(e) => setEditingCustomer({...editingCustomer, aadhar_card: e.target.value})}
        />
      </div>
      <div>
        <label className="text-sm text-slate-300 mb-1 block">GST No</label>
        <Input
          type="text"
          placeholder="GST No"
          value={editingCustomer.gst_no || ''}
          onChange={(e) => setEditingCustomer({...editingCustomer, gst_no: e.target.value})}
        />
      </div>
      
      <div className="flex gap-3 pt-4 border-t border-slate-600">
        <Button onClick={handleUpdateCustomer}>Update Customer</Button>
        <Button variant="outline" onClick={() => setEditingCustomer(null)}>Cancel</Button>
      </div>
    </div>
  )}
</Modal>
