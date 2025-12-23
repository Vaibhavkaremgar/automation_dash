// Professional & WhatsApp-compliant insurance message templates
// Suitable for Utility category (Renewal, Confirmation, Claim Updates)

interface MessageParams {
  customerName: string;
  renewalDate: string;
  daysRemaining?: number;
  companyName?: string;
  vehicleNumber?: string;
  policyNumber?: string;
  policyType?: string;
  premiumAmount?: string;
  supportContact?: string;
  clientKey?: string;
}

const getSignature = (clientKey?: string): string => {
  if (clientKey === 'joban') {
    return `Warm regards,\nJobanputra's Insurance Shoppe\nYour Trusted Insurance Partner`;
  } else if (clientKey === 'kmg') {
    return `Warm regards,\nKrishna Mohan Gupta\nCertified Insurance & Mutual Funds Advisor`;
  }
  return `Warm regards,\nInsurance Services Team`;
};

/**
 * INSURANCE RENEWAL REMINDER
 */
export const generateRenewalReminder = (params: MessageParams): string => {
  const {
    customerName,
    renewalDate,
    daysRemaining,
    policyNumber,
    companyName,
    premiumAmount,
    supportContact,
  } = params;

  const commonDetails = `
${policyNumber ? `Policy No: ${policyNumber}\n` : ''}${companyName ? `Insurer: ${companyName}\n` : ''}${premiumAmount ? `Premium Amount: ₹${premiumAmount}\n` : ''}
`;

  if (daysRemaining !== undefined && daysRemaining < 0) {
    return `Dear ${customerName},

We hope you are doing well.

This is to inform you that your insurance policy expired on ${renewalDate}. To avoid any risk due to lapse in coverage, we kindly request you to proceed with the renewal at the earliest.

${commonDetails}
Our team will be happy to assist you with the renewal process and address any queries you may have.

${supportContact ? `For assistance, please contact us at ${supportContact}.\n` : ''}
Thank you for your continued trust in our services.

${getSignature(params.clientKey)}`;
  }

  if (daysRemaining === 0 || daysRemaining === 1) {
    return `Dear ${customerName},

This is an important reminder regarding your insurance policy.

Your policy is scheduled to expire ${daysRemaining === 0 ? 'today' : 'tomorrow'} on ${renewalDate}. To ensure uninterrupted coverage, we recommend completing the renewal at your earliest convenience.

${commonDetails}
Please let us know if you would like our assistance in completing the renewal process.

${supportContact ? `You may reach us at ${supportContact} for immediate support.\n` : ''}
Thank you for your prompt attention.

${getSignature(params.clientKey)}`;
  }

  if (daysRemaining && daysRemaining <= 7) {
    return `Dear ${customerName},

Greetings from our Insurance Services Team.

This is a gentle reminder that your insurance policy is due for renewal on ${renewalDate}, which is in ${daysRemaining} days.

${commonDetails}
We recommend planning the renewal in advance to ensure continuous protection without any interruption.

${supportContact ? `For any assistance, please contact us at ${supportContact}.\n` : ''}
Thank you for choosing our services.

${getSignature(params.clientKey)}`;
  }

  return `Dear ${customerName},

We hope this message finds you well.

We would like to inform you that your insurance policy is scheduled for renewal on ${renewalDate}${daysRemaining ? ` (${daysRemaining} days remaining)` : ''}.

${commonDetails}
Our team is available to assist you with the renewal process whenever convenient.

${supportContact ? `Please feel free to reach us at ${supportContact} for support.\n` : ''}
Thank you for your continued association with us.

${getSignature(params.clientKey)}`;
};

/**
 * THANK YOU / RENEWAL CONFIRMATION MESSAGE
 */
export const generateThankYouMessage = (params: MessageParams): string => {
  const {
    customerName,
    policyNumber,
    companyName,
    premiumAmount,
  } = params;

  return `Dear ${customerName},

Thank you for renewing your insurance policy with us.

We are pleased to confirm that your policy is now active and your coverage is in force.

${policyNumber ? `Policy No: ${policyNumber}\n` : ''}${companyName ? `Insurer: ${companyName}\n` : ''}${premiumAmount ? `Premium Paid: ₹${premiumAmount}\n` : ''}
Your policy documents will be shared with you shortly for your records.

We sincerely appreciate your trust and look forward to serving you in the future.

${getSignature(params.clientKey)}`;
};

/**
 * POLICY DETAILS MESSAGE
 */
export const generatePolicyDetailsMessage = (params: MessageParams): string => {
  const {
    customerName,
    vehicleNumber,
    companyName,
    renewalDate,
    policyNumber,
    policyType,
    premiumAmount,
  } = params;

  return `Dear ${customerName},

Thank you for reaching out to us.

As requested, please find your insurance policy details below:

${policyNumber ? `Policy No: ${policyNumber}\n` : ''}${policyType ? `Policy Type: ${policyType}\n` : ''}${vehicleNumber ? `Vehicle No: ${vehicleNumber}\n` : ''}${companyName ? `Insurer: ${companyName}\n` : ''}${renewalDate ? `Renewal Date: ${renewalDate}\n` : ''}${premiumAmount ? `Premium Amount: ₹${premiumAmount}\n` : ''}
If you need any clarification or further assistance, please feel free to contact us.

Thank you for choosing our services.

${getSignature(params.clientKey)}`;
};

/**
 * CLAIM STATUS UPDATE MESSAGE
 */
export const generateClaimUpdateMessage = (
  customerName: string,
  vehicleNumber: string,
  status: string,
  clientKey?: string,
): string => {
  return `Dear ${customerName},

We would like to provide you with an update regarding your insurance claim for the vehicle ${vehicleNumber}.

Current Claim Status: ${status.replace(/_/g, ' ').toUpperCase()}

Our claims team is actively working on your request and will keep you informed of any further progress.

Should you require any additional information or assistance, please do not hesitate to contact us.

Thank you for your patience and cooperation.

${getSignature(clientKey)}`;
};
