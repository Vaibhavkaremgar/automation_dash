import { useState } from 'react';
import { api } from '../lib/api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const useRazorpay = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const processPayment = async (amount: number) => {
    setIsProcessing(true);
    
    try {
      console.log('💳 Creating Razorpay order for ₹', amount);
      
      // Create order on backend
      const response = await api.post('/api/billing/razorpay/create-order', { amount });
      const orderData = response.data;
      
      console.log('✅ Order created:', orderData);

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      return new Promise((resolve) => {
        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'Automation Dashboard',
          description: 'Wallet Recharge',
          order_id: orderData.order_id,
          handler: async function (response: any) {
            try {
              console.log('✅ Payment successful:', response);
              
              // Get user data from localStorage
              const userStr = localStorage.getItem('user');
              const user = userStr ? JSON.parse(userStr) : null;
              
              // Verify payment on backend
              const verifyResponse = await api.post('/api/billing/razorpay/verify', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                user_id: user?.id
              });
              
              console.log('✅ Payment verified:', verifyResponse.data);
              resolve({ success: true, message: verifyResponse.data.message });
            } catch (error: any) {
              console.error('❌ Payment verification failed:', error);
              resolve({ 
                success: false, 
                message: error.response?.data?.error || 'Payment verification failed' 
              });
            } finally {
              setIsProcessing(false);
            }
          },
          prefill: {
            name: 'User',
            email: 'user@example.com',
            contact: '9999999999'
          },
          theme: {
            color: '#06b6d4'
          },
          modal: {
            ondismiss: function() {
              console.log('⚠️ Payment cancelled by user');
              setIsProcessing(false);
              resolve({ success: false, message: 'Payment cancelled' });
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      });
      
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      setIsProcessing(false);
      return { 
        success: false, 
        message: error.response?.data?.error || 'Failed to initiate payment' 
      };
    }
  };

  return { processPayment, isProcessing };
};