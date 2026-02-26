// Insurance client-specific configurations
const VALID_COMPANIES = ['OTHERS', 'Liberty General Insurance', 'ICICI Lombard', 'Bajaj Allianz', 'HDFC ERGO', 'Reliance General', 'Royal Sundaram', 'Cholamandalam', 'Digit Insurance', 'Bharti AXA', 'Edelweiss General', 'Acko', 'Shriram General', 'Tata AIG', 'United India', 'Oriental Insurance', 'National Insurance', 'New India Assurance', 'Go Digit', 'Niva Bupa', 'Star Health', 'Apollo Munich', 'Aditya Birla Health', 'Care Health', 'Manipal Cigna', 'Max Bupa', 'Religare', 'Bajaj Health', 'ICICI Lombard Health', 'HDFC ERGO Health'];

const insuranceClients = {
  kmg: {
    identifier: ['kmg', 'kmginsurance'],
    name: 'KMG Insurance Agency',
    spreadsheetId: '1qV6K3t7zpQl2pild6q2i1iS6ga9Zd6QQgu3nvyIEmN0',
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
          od_expiry_date: 'Policy Expiry Date',
          tp_expiry_date: 'TP Expiry Date',
          payment_date: 'DEPOSITED/ PAYMENT DATE',
          policy_start_date: 'Policy start date',
          paid_by: 'Paid by',
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
          g_code: 'G CODE',
          dob: 'DOB',
          gst_no: 'GST NO'
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
      },
      leads: {
        tab: 'Lead_Management',
        tabName: 'Lead_Management',
        schema: {
          s_no: 'S No',
          name: 'Name',
          mobile_number: 'Mobile No',
          email: 'Email ID',
          interested_in: 'Interested In',
          policy_expiry_date: 'Policy Expiry Date',
          follow_up_date: 'Follow Up Date',
          lead_status: 'Lead Status',
          priority: 'Priority',
          notes: 'Notes',
          referral_by: 'Referral By'
        }
      }
    }
  },
  joban: {
    identifier: ['joban', 'jobanputra', 'joban putra'],
    name: 'Joban Putra Insurance',
    spreadsheetId: '1SJY8rPUbhr1NUhKELpuLPU9dhlhz86ZWQ0AI5s4dj40',
    tabs: {
      general: {
        tab: 'general_ins',
        tabName: 'general_ins',
        schema: {
          s_no: 'S NO',
          name: 'NAME',
          current_policy_no: 'POLICY NO',
          g_code: 'G CODE',
          last_year_premium: 'LAST YEAR PREMIUM',
          od_expiry_date: 'Policy Expiry Date',
          renewal_date: 'MODIFIED EXPIRY DATE',
          company: 'COMPANY',
          vertical: 'TYPE',
          payment_date: 'DEPOSITED/ PAYMENT DATE',
          policy_start_date: 'Policy start date',
          paid_by: 'Paid by',
          chq_no_date: 'CHQ NO & DATE',
          bank_name: 'BANK NAME',
          customer_id: 'CUSTOMER ID',
          agent_code: 'AGENT CODE',
          premium: 'AMOUNT',
          new_policy_no: 'NEW POLICY NO',
          new_company: 'NEW POLICY COMPANY',
          product_type: 'Product Type',
          product_model: 'Product Model',
          registration_no: 'VEH NO',
          tp_expiry_date: 'TP Expiry Date',
          premium_mode: 'Premium mode',
          email: 'EMAIL ID',
          mobile_number: 'MOBILE NO',
          status: 'STATUS',
          thank_you_sent: 'Thankyou message sent yes/no',
          notes: 'REMARKS',
          pancard: 'PANCARD',
          aadhar_card: 'AADHAR CARD',
          others: 'OTHERS - VI/DL/PP',
          dob: 'DOB',
          gst_no: 'GST NO'
        }
      },
      life: {
        tab: 'Life_ins',
        tabName: 'Life_ins',
        schema: {
          status: 'STATUS',
          thank_you_sent: 'THANKYOU MESSAGE SENT',
          payment_date: 'PAYMENT DATE',
          renewal_date: 'DATE OF EXPIRY',
          current_policy_no: 'POLICY NO',
          name: 'NAME',
          email: 'EMAIL ID',
          mobile_number: 'MOBILE NO',
          premium: 'PREMIUM',
          company: 'INSURER',
          ag: 'AG',
          pol: 'POL',
          pt: 'PT',
          ppt: 'PPT',
          md: 'MD',
          br: 'BR',
          summ: 'SUMM',
          payment_type: 'PAYMENT TYPE',
          phone_call: 'PHONE CALL',
          sort: 'SORT',
          com: 'COM',
          i_magic: 'I MAGIC',
          true_field: 'TRUE',
          prev_status: '_PREVSTATUS',
          prev_rank: '_PREVRANK',
          fam_earliest: '_FAMEARLIEST',
          notes: 'REMARKS',
          fc: 'FC'
        }
      },
      leads: {
        tab: 'Lead_Management',
        tabName: 'Lead_Management',
        schema: {
          s_no: 'S No',
          name: 'Name',
          mobile_number: 'Mobile No',
          email: 'Email ID',
          interested_in: 'Interested In',
          policy_expiry_date: 'Policy Expiry Date',
          follow_up_date: 'Follow Up Date',
          lead_status: 'Lead Status',
          priority: 'Priority',
          notes: 'Notes',
          referral_by: 'Referral By'
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

module.exports = { insuranceClients, getClientConfig, VALID_COMPANIES };
