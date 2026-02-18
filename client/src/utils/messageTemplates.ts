export const getThankYouMessage = (customerName: string) => {
  return `Dear ${customerName},

I hope this message finds you well! 😊

Thank you so much for renewing your insurance policy with us! 🎉 Your trust means the world to us.

✅ *Policy Status:* Active & Fully Covered
✅ *Coverage:* Complete protection as per your plan

We're committed to providing you the best service and support whenever you need it.

Should you have any questions or need assistance, please don't hesitate to reach out. We're always here to help! 🙏

Warm regards,
Your Insurance Advisor`;
};

export const getOverdueMessage = (customerName: string, displayDate: string) => {
  return `Dear ${customerName},

I hope you're doing well! 😊

I wanted to personally reach out regarding your insurance policy that expired on *${displayDate}*.

⚠️ *Important:* Your vehicle/asset is currently unprotected, which could lead to:
• Financial liability in case of accidents
• Legal penalties
• No claim benefits

💡 *Good News:* We can help you renew instantly!

*Benefits of Immediate Renewal:*
✓ Instant coverage activation
✓ Best premium rates available
✓ Hassle-free documentation
✓ Same-day policy issuance

I'd love to assist you with a quick renewal. Can we connect today?

Feel free to reply or call me directly. I'm here to help! 🙏

Warm regards,
Your Insurance Advisor`;
};

export const getUrgentMessage = (customerName: string, displayDate: string) => {
  return `🚨 *URGENT: Policy Expiring Tomorrow!* 🚨

Dear ${customerName},

I hope this message finds you well!

This is a friendly but urgent reminder that your insurance policy expires *TOMORROW (${displayDate})*.

⏰ *Time-Sensitive Action Required*

Without immediate renewal:
❌ Your coverage will lapse
❌ You'll be exposed to financial risks
❌ Legal compliance issues may arise
❌ Claims cannot be processed

✅ *Let's Secure Your Coverage Today!*

*Why Renew Now:*
• Instant policy activation
• Zero coverage gap
• Best available rates
• Quick 10-minute process

I'm personally available to help you complete the renewal right away. Can we connect in the next hour?

Please reply or call me immediately. Your protection is our priority! 🙏

Warm regards,
Your Insurance Advisor`;
};

export const get7DayMessage = (customerName: string, displayDate: string, days: number) => {
  return `Dear ${customerName},

I hope you're doing great! 😊

I wanted to personally remind you that your insurance policy is approaching its renewal date.

📅 *Expiry Date:* ${displayDate} (${days} days remaining)

*Why Renew Early?*
✓ Avoid last-minute rush
✓ Ensure zero coverage gap
✓ Get the best premium rates
✓ Peace of mind for you and your family

💡 *Special Benefits for Early Renewal:*
• Instant policy issuance
• Exclusive discounts available
• Priority customer support
• Hassle-free documentation

I'd be happy to help you complete the renewal process smoothly. It takes just 10 minutes!

Can we schedule a quick call at your convenience?

Feel free to reply to this message or call me directly. I'm here to assist! 🙏

Warm regards,
Your Insurance Advisor`;
};

export const get30DayMessage = (customerName: string, displayDate: string, days: number) => {
  return `Dear ${customerName},

I hope this message finds you in good health! 😊

I wanted to reach out regarding your upcoming policy renewal.

📅 *Renewal Due:* ${displayDate} (${days} days away)

*Planning Ahead = Better Benefits!*

By renewing now, you'll enjoy:
✓ Uninterrupted coverage
✓ Better premium rates
✓ Exclusive early-bird discounts
✓ More time for documentation
✓ Zero stress, maximum protection

💡 *Why Choose Us:*
• Trusted by thousands of families
• Quick & transparent process
• Best rates in the market
• Dedicated personal support

I'd love to help you secure your renewal with the best possible terms. Can we have a brief 10-minute discussion?

Please feel free to reply or call me at your convenience. Your satisfaction is our priority! 🙏

Warm regards,
Your Insurance Advisor`;
};

export const getClaimUpdateMessage = (customerName: string, vehicleNumber: string, company: string, status: string) => {
  return `Dear ${customerName},

I hope you're doing well! 😊

I wanted to personally update you on your insurance claim.

📋 *Claim Details:*
• Vehicle: ${vehicleNumber}
• Insurance Company: ${company}
• Current Status: ${status}

We're actively monitoring your claim and working to ensure a smooth settlement process.

*What's Next:*
✓ We'll keep you updated at every step
✓ Our team is coordinating with the insurance company
✓ You can reach out anytime for updates

Should you have any questions or concerns, please don't hesitate to contact me. I'm here to support you throughout this process! 🙏

Warm regards,
Your Insurance Advisor`;
};

export const getPolicySummaryMessage = (customerName: string, registrationNo: string, company: string, premium: number, renewalDate: string, status: string) => {
  return `Dear ${customerName},

I hope this message finds you well! 😊

Here's a quick summary of your insurance policy:

📋 *Policy Details:*
• Vehicle: ${registrationNo}
• Insurance Company: ${company}
• Premium Amount: ₹${premium}
• Renewal Date: ${renewalDate}
• Status: ${status}

*We're Here to Help:*
✓ Policy renewals
✓ Claim assistance
✓ Coverage upgrades
✓ Any queries or concerns

Feel free to reach out anytime. Your satisfaction and protection are our top priorities! 🙏

Warm regards,
Your Insurance Advisor`;
};
