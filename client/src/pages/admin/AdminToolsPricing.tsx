import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function AdminToolsPricingPage() {
  const qc = useQueryClient()
  const [vapiPrice, setVapiPrice] = useState('')

  const { data: pricing } = useQuery({
    queryKey: ['tools', 'pricing'],
    queryFn: async () => (await api.get('/api/tools/pricing')).data.pricing as any[],
  })

  const updatePricing = useMutation({
    mutationFn: async () => {
      const pricePerMin = parseFloat(vapiPrice)
      if (isNaN(pricePerMin) || pricePerMin <= 0) throw new Error('Invalid price')
      return await api.put('/api/admin/tools/pricing', {
        tool_name: 'vapi',
        price_per_unit_cents: Math.round(pricePerMin * 100),
        unit_type: 'minute'
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tools', 'pricing'] })
      alert('Voice Assistant pricing updated successfully')
      setVapiPrice('')
    },
    onError: (e: any) => {
      alert(e?.response?.data?.message || e.message || 'Failed to update pricing')
    }
  })

  const vapiTool = pricing?.find(p => p.tool_name === 'vapi')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
        Tools Pricing
      </h1>

      <div className="card p-6 space-y-4">
        <div>
          <h2 className="font-medium text-lg mb-2">Voice Assistant</h2>
          <p className="text-sm text-slate-400 mb-4">Configure pricing per minute for voice assistant calls</p>
          
          {vapiTool && (
            <div className="mb-4 p-3 bg-slate-800/50 rounded">
              <p className="text-sm text-slate-300">
                Current Price: <span className="font-semibold text-indigo-400">${(vapiTool.price_per_unit_cents / 100).toFixed(2)}</span> per {vapiTool.unit_type}
              </p>
            </div>
          )}

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm text-slate-400 mb-1.5 block">Price per Minute ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={vapiPrice}
                onChange={e => setVapiPrice(e.target.value)}
                placeholder="e.g. 0.05"
                className="bg-slate-800/50 border-slate-700"
              />
            </div>
            <Button
              onClick={() => updatePricing.mutate()}
              disabled={!vapiPrice || updatePricing.isPending}
              className="bg-gradient-to-r from-indigo-500 to-cyan-500"
            >
              {updatePricing.isPending ? 'Updating...' : 'Update Price'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
