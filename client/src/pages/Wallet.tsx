import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib/api'
import { useRazorpay } from '../hooks/useRazorpay'
import AnimatedCard from '../components/ui/AnimatedCard'
import AnimatedButton from '../components/ui/AnimatedButton'

export default function WalletPage() {
  const [rechargeAmount, setRechargeAmount] = useState(500)
  const { processPayment, isProcessing } = useRazorpay()

  const { data: wallet, isLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const response = await api.get('/api/wallet')
      return response.data
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const response = await api.get('/api/wallet/transactions')
      return response.data.transactions || []
    },
  })

  const handlePayment = async (amount: number) => {
    const result = await processPayment(amount) as { success: boolean; message: string }
    if (result.success) {
      alert(result.message)
    } else if (result.message !== 'Payment cancelled') {
      alert(result.message)
    }
  }

  if (isLoading) return (
    <div className="p-6">
      <div className="card p-6 inline-flex items-center gap-2">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent"/> 
        Loading wallet...
      </div>
    </div>
  )

  const balance = (wallet?.balance_cents || 0) / 100

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <motion.h1 
        className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        💰 Wallet
      </motion.h1>

      {/* Balance Card */}
      <AnimatedCard className="p-8 text-center bg-gradient-to-br from-indigo-900/50 to-cyan-900/50 border-indigo-700/50">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-sm text-slate-400 mb-2">Current Balance</div>
          <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400 mb-4">
            ₹{balance.toFixed(2)}
          </div>
          <div className={`text-sm ${balance < 50 ? 'text-red-400' : 'text-slate-400'}`}>
            {balance < 50 ? '⚠️ Low balance - Consider recharging' : '✅ Sufficient balance'}
          </div>
        </motion.div>
      </AnimatedCard>

      {/* Recharge Section */}
      <AnimatedCard className="p-6">
        <motion.h2 
          className="text-xl font-semibold mb-4 text-cyan-300"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          💳 Recharge Wallet
        </motion.h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Recharge Amount (₹)</label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(Number(e.target.value))}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {[500, 1000, 2000].map((amount) => (
                  <motion.button
                    key={amount}
                    onClick={() => setRechargeAmount(amount)}
                    className={`p-2 rounded-lg text-sm font-medium transition-all ${
                      rechargeAmount === amount
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    ₹{amount}
                  </motion.button>
                ))}
              </div>

              <AnimatedButton
                onClick={() => handlePayment(rechargeAmount)}
                disabled={isProcessing || rechargeAmount < 100}
                className="w-full"
              >
                {isProcessing ? '🔄 Processing...' : `💳 Pay ₹${rechargeAmount} with Razorpay`}
              </AnimatedButton>
              
              <div className="text-xs text-slate-400 text-center mt-2 space-y-1">
                <div>💳 UPI • Cards • NetBanking • Wallets</div>
                <div className="text-yellow-400">🧪 Test Mode: Use card 4111 1111 1111 1111</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-slate-800/30 rounded-lg p-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <h3 className="font-semibold text-white mb-3">💡 Usage Rates</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-300">Voice Assistant Calls</span>
                <span className="text-cyan-400">₹5.10/min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Resume Processing</span>
                <span className="text-green-400">Free</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Google Sheets Sync</span>
                <span className="text-green-400">Free</span>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatedCard>

      {/* Transaction History */}
      <AnimatedCard className="overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-cyan-300">📊 Transaction History</h2>
        </div>
        
        <div className="overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-800/60">
              <tr>
                <th className="text-left p-4 font-semibold text-slate-300">Date</th>
                <th className="text-left p-4 font-semibold text-slate-300">Type</th>
                <th className="text-left p-4 font-semibold text-slate-300">Description</th>
                <th className="text-right p-4 font-semibold text-slate-300">Amount</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {transactions?.map((transaction: any, index: number) => (
                  <motion.tr 
                    key={transaction.id} 
                    className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <td className="p-4 text-slate-300">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        transaction.type === 'recharge' 
                          ? 'bg-green-900/50 text-green-300' 
                          : 'bg-red-900/50 text-red-300'
                      }`}>
                        {transaction.type === 'recharge' ? '💳 Recharge' : '💸 Usage'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">{transaction.description}</td>
                    <td className={`p-4 text-right font-medium ${
                      transaction.type === 'recharge' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {transaction.type === 'recharge' ? '+' : '-'}₹{(transaction.amount_cents / 100).toFixed(2)}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          
          {(!transactions || transactions.length === 0) && (
            <motion.div 
              className="text-center py-12 text-slate-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="text-4xl mb-4">📊</div>
              <div className="text-lg">No transactions yet</div>
              <div className="text-sm">Your recharges and usage will appear here</div>
            </motion.div>
          )}
        </div>
      </AnimatedCard>
    </motion.div>
  )
}