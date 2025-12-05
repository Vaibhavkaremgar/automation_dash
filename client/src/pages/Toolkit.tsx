import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import Button from '../components/ui/Button'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ToolkitPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [role, setRole] = useState('')
  const [questions, setQuestions] = useState<string[]>([])

  // Fetch anonymized pricing & usage data
  const { data: pricing } = useQuery({
    queryKey: ['tools', 'pricing'],
    queryFn: async () => (await api.get('/api/tools/pricing')).data.pricing as any[],
  })

  const { data: usage } = useQuery({
    queryKey: ['tools', 'usage'],
    queryFn: async () => (await api.get('/api/tools/usage')).data.usage as any[],
  })

  const { data: balance } = useQuery({
    queryKey: ['user', 'balance'],
    queryFn: async () => (await api.get('/api/user/balance')).data.balance as number,
  })

  // Interview question generator (LLM API)
  const interviewGen = useMutation({
    mutationFn: async (role: string) =>
      (await api.post('/api/tools/interview-questions', { role })).data,
    onSuccess: (res) => {
      if (res.questions) setQuestions(res.questions)
      qc.invalidateQueries({ queryKey: ['tools', 'usage'] })
    },
    onError: (e: any) =>
      alert(e?.response?.data?.message || 'Failed to generate interview questions'),
  })

  // Anonymized usage data for chart
  const usageData =
    usage?.map((u, i) => ({
      name: `Service ${i + 1}`,
      value: (u.credits_used_cents / 100).toFixed(2),
    })) || []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
        AI Toolkit
      </h1>

      {/* === Credit & Usage Overview === */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pricing */}
        <section className="card p-4 hover:scale-[1.02] transition-transform duration-200 shadow-lg shadow-indigo-500/10">
          <h2 className="font-medium mb-2">Service Pricing Overview</h2>
          <ul className="text-sm space-y-1">
            {pricing?.length ? (
              pricing.map((_, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>Service {idx + 1}</span>
                  <span>${((_.price_per_unit_cents ?? 0) / 100).toFixed(2)} / {_.unit_type || 'unit'}</span>
                </li>
              ))
            ) : (
              <p className="text-gray-400 text-sm">Loading...</p>
            )}
          </ul>
        </section>

        {/* Usage Analytics */}
        <section className="card p-4 hover:scale-[1.02] transition-transform duration-200 shadow-lg shadow-indigo-500/10">
          <h2 className="font-medium mb-2">Usage Overview</h2>
          {usageData.length > 0 ? (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageData}>
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#818cf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No usage data available</p>
          )}
        </section>
      </div>

      {/* === Interview Question Generator === */}
      <div className="grid grid-cols-1 gap-4">
        <section className="card p-4 hover:scale-[1.02] transition-transform duration-200 shadow-lg shadow-indigo-500/10">
          <h2 className="font-medium mb-2">AI Interview Question Generator</h2>
          <p className="text-sm text-gray-400 mb-3">
            Generate smart, AI-powered interview questions for specific roles.
          </p>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Enter a role (e.g., Data Analyst)"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 w-full text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button
              onClick={() => interviewGen.mutate(role)}
              disabled={!role || interviewGen.isPending}
            >
              {interviewGen.isPending ? 'Generating...' : 'Generate'}
            </Button>
          </div>

          {questions.length > 0 && (
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
              {questions.map((q, idx) => (
                <li key={idx}>{q}</li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* === Credit, Insights & Support === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance */}
        <section className="card p-4 hover:scale-[1.02] transition-transform duration-200 shadow-lg shadow-indigo-500/10">
          <h2 className="font-medium mb-2">Account Overview</h2>
          <div className="text-sm space-y-2">
            <p>
              Available Balance:{' '}
              <span className="text-green-400 font-medium">
                ${balance?.toFixed(2) || '0.00'}
              </span>
            </p>
            <p>
              Estimated Monthly Spend:{' '}
              <span className="text-yellow-400">$42.30</span>
            </p>
            <p>
              Optimization Tip:{' '}
              <span className="text-blue-400">
                Combine short sessions to save credit usage.
              </span>
            </p>
          </div>
        </section>

        {/* AI Insights */}
        <section className="card p-4 hover:scale-[1.02] transition-transform duration-200 shadow-lg shadow-indigo-500/10">
          <h2 className="font-medium mb-2">AI Insights & Recommendations</h2>
          <p className="text-sm text-gray-400 mb-3">
            Get smart recommendations to optimize your workflow and costs.
          </p>
          <ul className="text-sm space-y-2 text-gray-300 list-disc pl-4">
            <li>Use automated scheduling for repetitive tasks.</li>
            <li>Review recent activity to identify performance trends.</li>
            <li>Leverage AI-driven summaries for faster decision-making.</li>
          </ul>
        </section>

        {/* Support */}
        <section className="card p-4 hover:scale-[1.02] transition-transform duration-200 shadow-lg shadow-indigo-500/10">
          <h2 className="font-medium mb-2">Support & Help</h2>
          <p className="text-sm text-gray-400 mb-3">
            Need help or want to report an issue? Reach out to our support team.
          </p>
          <Button onClick={() => navigate('/support')}>Contact Support</Button>
        </section>
      </div>
    </div>
  )
}
