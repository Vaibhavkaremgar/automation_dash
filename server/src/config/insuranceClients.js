// Insurance client-specific configurations
const insuranceClients = {
  kmg: {
    identifier: ['kmg', 'kmginsurance'],
    name: 'KMG Insurance Agency',
    spreadsheetId: process.env.KMG_INSURANCE_SHEETS_SPREADSHEET_ID,
    tabName: process.env.KMG_INSURANCE_SHEETS_TAB,
    schema: {
      name: 'name',
      mobile_number: 'mobile_number',
      email: 'email',
      product: 'product',
      vertical: 'vertical',
      current_policy_no: 'current_policy_no',
      company: 'company',
      registration_no: 'registration_no',
      premium: 'premium',
      premium_mode: 'premium_mode',
      renewal_date: 'od_expiry_date', // Use OD expiry as renewal date
      od_expiry_date: 'od_expiry_date',
      tp_expiry_date: 'tp_expiry_date',
      insurance_activated_date: 'insurance_activated_date',
      status: 'status',
      thank_you_sent: 'thank_you_sent',
      new_policy_no: 'new_policy_no',
      new_company: 'new_company',
      policy_doc_link: 'policy_doc_link',
      reason: 'reason'
    }
  },
  joban: {
    identifier: ['joban', 'jobanputra', 'joban putra'],
    name: 'Joban Putra Insurance',
    spreadsheetId: process.env.JOBAN_INSURANCE_SHEETS_SPREADSHEET_ID,
    tabName: process.env.JOBAN_INSURANCE_SHEETS_TAB,
    schema: {
      name: 'name',
      mobile_number: 'mobile_number',
      email: 'email',
      product: 'product',
      vertical: 'vertical',
      current_policy_no: 'policy_no',
      company: 'company',
      registration_no: 'registration_no',
      premium: 'premium_amount',
      premium_mode: 'premium_mode',
      last_year_premium: 'last_year_premium',
      renewal_date: 'date_of_expiry',
      tp_expiry_date: 'tp_expiry_date',
      insurance_activated_date: 'activated_date',
      status: 'status',
      thank_you_sent: 'thank_you_sent',
      cheque_hold: 'cheque_hold',
      payment_date: 'payment_date',
      cheque_no: 'cheque_no',
      cheque_bounce: 'cheque_bounce',
      new_policy_no: 'new_policy_no',
      new_company: 'new_policy_company',
      policy_doc_link: 'policy_doc_link',
      owner_alert_sent: 'owner_alert_sent'
    }
  }
};

function getClientConfig(identifier) {
  const searchStr = (identifier || '').toLowerCase();
  
  for (const [key, config] of Object.entries(insuranceClients)) {
    if (config.identifier.some(id => searchStr.includes(id))) {
      return { key, ...config };
    }
  }
  
  // Default to KMG
  return { key: 'kmg', ...insuranceClients.kmg };
}

module.exports = { insuranceClients, getClientConfig };
