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
  productModel?: string;
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
    companyName,
    vehicleNumber,
    productModel,
    clientKey,
  } = params;

  const vehicleInfo = vehicleNumber ? `Vehicle No. ${vehicleNumber}` : '';
  const productInfo = productModel ? `Product Model. ${productModel}` : '';
  const details = [vehicleInfo, productInfo].filter(Boolean).join(', ');

  return `Dear ${customerName},

This is to inform you that your insurance policy with ${companyName || 'your insurer'}${details ? ` (${details})` : ''} expires on ${renewalDate}.

You are kindly requested to proceed with the renewal of the same at the earliest, to avoid any risk arising from a lapse in coverage.

Our team will be happy to assist you with the renewal process and address any queries you may have.

${getSignature(clientKey)}`;
};

/**
 * THANK YOU / RENEWAL CONFIRMATION MESSAGE
 */
export const generateThankYouMessage = (params: MessageParams): string => {
  const {
    customerName,
    companyName,
    vehicleNumber,
    productModel,
    clientKey,
  } = params;

  const vehicleInfo = vehicleNumber ? `Vehicle No. ${vehicleNumber}` : '';
  const productInfo = productModel ? `Product Model. ${productModel}` : '';
  const details = [vehicleInfo, productInfo].filter(Boolean).join(', ');

  return `Dear ${customerName},

This is to inform that your ${companyName || 'insurance'} insurance policy${details ? ` for (${details})` : ''} has been renewed and is now active.

The policy documents will be shared with you shortly for your records.

${getSignature(clientKey)}`;
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

  const isMotor = policyType?.toLowerCase().includes('motor') || policyType === '2-wheeler';

  return `Dear ${customerName},

Thank you for reaching out to us.

As requested, please find your insurance policy details below:

${policyNumber ? `Policy No: ${policyNumber}\n` : ''}${policyType ? `Policy Type: ${policyType}\n` : ''}${isMotor && vehicleNumber ? `Vehicle No: ${vehicleNumber}\n` : ''}${companyName ? `Insurer: ${companyName}\n` : ''}${renewalDate ? `Renewal Date: ${renewalDate}\n` : ''}${premiumAmount ? `Premium Amount: ₹${premiumAmount}\n` : ''}
If you need any clarification or further assistance, please feel free to contact us.

Thank you for choosing our services.

${getSignature(params.clientKey)}`;
};

/**
 * CLAIM STATUS UPDATE MESSAGE
 */
export const generateClaimUpdateMessage = (
  customerName: string,
  vehicleOrPolicy: string,
  status: string,
  clientKey?: string,
  isMotor: boolean = true,
): string => {
  const referenceText = isMotor ? `vehicle ${vehicleOrPolicy}` : vehicleOrPolicy;
  
  return `Dear ${customerName},

We would like to provide you with an update regarding your insurance claim for the ${referenceText}.

Current Claim Status: ${status.replace(/_/g, ' ').toUpperCase()}

Our claims team is actively working on your request and will keep you informed of any further progress.

Should you require any additional information or assistance, please do not hesitate to contact us.

Thank you for your patience and cooperation.

${getSignature(clientKey)}`;
};
