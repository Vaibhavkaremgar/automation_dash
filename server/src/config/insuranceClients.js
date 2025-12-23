// Insurance client-specific configurations
const insuranceClients = {
  kmg: {
    identifier: ['kmg', 'kmginsurance'],
    name: 'KMG Insurance Agency',
    spreadsheetId: '1eg0JT8a1SR7PcwS3EnuVQlFUUwTRPdEfQtfLynpJfNg',
    tabs: {
      general: {
        tab: 'kmg_general_ins',
        tabName: 'kmg_general_ins',
        schema: {
          name: 'NAME',
          mobile_number: 'MOBILE NO',
          email: 'EMAIL ID',
          current_policy_no: 'POLICY NO',
          company: 'COMPANY',
          registration_no: 'VEH NO',
          premium: 'AMOUNT',
          premium_mode: 'Premium mode',
          last_year_premium: 'LAST YEAR PREMIUM',
          renewal_date: 'MODIFIED EXPIRY DATE',
          od_expiry_date: 'DATE OF EXPIRY',
          tp_expiry_date: 'TP Expiry Date',
          payment_date: 'DEPOSITED/ PAYMENT DATE',
          status: 'STATUS',
          thank_you_sent: 'Thankyou message sent yes/no',
          new_policy_no: 'NEW POLICY NO',
          new_company: 'NEW POLICY COMPANY',
          product_type: 'Product Type',
          product_model: 'Product Model',
          vertical: 'TYPE',
          notes: 'REMARKS',
          cheque_no: 'CHQ NO & DATE',
          bank_name: 'BANK NAME',
          customer_id: 'CUSTOMER ID',
          agent_code: 'AGENT CODE',
          pancard: 'PANCARD',
          aadhar_card: 'AADHAR CARD',
          others_doc: 'OTHERS - VI/DL/PP',
          g_code: 'G CODE'
        }
      },
      life: {
        tab: 'kmg_Life_ins',
        tabName: 'kmg_Life_ins',
        schema: {
          name: 'NAME',
          mobile_number: 'MOBILE NO',
          email: 'EMAIL ID',
          current_policy_no: 'POLICY NO',
          company: 'INSURER',
          premium: 'PREMIUM',
          premium_mode: 'MD',
          renewal_date: 'DATE OF EXPIRY',
          payment_date: 'PAYMENT DATE',
          status: 'STATUS',
          thank_you_sent: 'THANKYOU MESSAGE SENT',
          notes: 'REMARKS'
        }
      }
    }
  },
  joban: {
    identifier: ['joban', 'jobanputra', 'joban putra'],
    name: 'Joban Putra Insurance',
    spreadsheetId: '1CE5TFC5bFx7WixVLoVOzdiMntwgRISO9YVR_cWZhku4',
    tabs: {
      general: {
        tab: 'general_ins',
        tabName: 'general_ins',
        schema: {
          name: 'NAME',
          mobile_number: 'MOBILE NO',
          email: 'EMAIL ID',
          current_policy_no: 'POLICY NO',
          company: 'COMPANY',
          registration_no: 'VEH NO',
          premium: 'AMOUNT',
          premium_mode: 'Premium mode',
          last_year_premium: 'LAST YEAR PREMIUM',
          renewal_date: 'MODIFIED EXPIRY DATE',
          od_expiry_date: 'DATE OF EXPIRY',
          tp_expiry_date: 'TP Expiry Date',
          payment_date: 'DEPOSITED/ PAYMENT DATE',
          status: 'STATUS',
          thank_you_sent: 'Thankyou message sent yes/no',
          new_policy_no: 'NEW POLICY NO',
          new_company: 'NEW POLICY COMPANY',
          product_type: 'Product TYPE',
          product_model: 'Product Model',
          vertical: 'TYPE',
          notes: 'REMARKS',
          cheque_no: 'CHQ NO & DATE',
          bank_name: 'BANK NAME',
          customer_id: 'CUSTOMER ID',
          agent_code: 'AGENT CODE',
          pancard: 'PANCARD',
          aadhar_card: 'AADHAR CARD',
          others_doc: 'OTHERS - VI/DL/PP',
          g_code: 'G CODE'
        }
      },
      life: {
        tab: 'Life_ins',
        tabName: 'Life_ins',
        schema: {
          name: 'NAME',
          mobile_number: 'MOBILE NO',
          email: 'EMAIL ID',
          current_policy_no: 'POLICY NO',
          company: 'INSURER',
          premium: 'PREMIUM',
          premium_mode: 'MD',
          renewal_date: 'DATE OF EXPIRY',
          payment_date: 'PAYMENT DATE',
          status: 'STATUS',
          thank_you_sent: 'THANKYOU MESSAGE SENT',
          notes: 'REMARKS'
        }
      }
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
