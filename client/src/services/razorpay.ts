import { api } from '../lib/api'

declare global {
  interface Window {
    Razorpay: any
  }
}

export interface RazorpayOrder {
  id: string
  amount: number
  currency: string
  key: string
}

export interface RazorpayPaymentData {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

class RazorpayService {
  private scriptLoaded = false

  async loadScript(): Promise<boolean> {
    if (this.scriptLoaded) return true

    return new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => {
        this.scriptLoaded = true
        resolve(true)
      }
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  async createOrder(amount: number): Promise<RazorpayOrder> {
    const response = await api.post('/api/billing/razorpay/create-order', { amount })
    return response.data.order
  }

  async verifyPayment(paymentData: RazorpayPaymentData): Promise<any> {
    const response = await api.post('/api/billing/razorpay/verify', paymentData)
    return response.data
  }

  async openCheckout(order: RazorpayOrder, userEmail: string): Promise<RazorpayPaymentData> {
    const scriptLoaded = await this.loadScript()
    if (!scriptLoaded) {
      throw new Error('Razorpay SDK failed to load')
    }

    return new Promise((resolve, reject) => {
      const options = {
        key: order.key, // Razorpay key from backend
        amount: order.amount,
        currency: order.currency,
        name: 'Automation Dashboard',
        description: `Wallet Recharge ₹${order.amount / 100}`,
        order_id: order.id,
        prefill: {
          email: userEmail,
        },
        theme: {
          color: '#0891b2', // Cyan color matching the theme
        },
        handler: (response: RazorpayPaymentData) => {
          resolve(response)
        },
        modal: {
          ondismiss: () => {
            reject(new Error('Payment cancelled by user'))
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    })
  }
}

export const razorpayService = new RazorpayService()