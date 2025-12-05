import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useJobSelection } from '../context/JobSelectionContext'
import AnimatedCard from '../components/ui/AnimatedCard'
import AnimatedButton from '../components/ui/AnimatedButton'

export default function JobsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { selectedJob, selectJob } = useJobSelection()
  const { data } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/jobs')
        return response.data.jobs as any[]
      } catch (err) {
        console.error('Failed to fetch jobs:', err)
        return []
      }
    },
  })

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [department, setDepartment] = useState('')
  const [requiredSkills, setRequiredSkills] = useState('')
  const [experienceRequired, setExperienceRequired] = useState('')
  const [editModal, setEditModal] = useState<{ job: any } | null>(null)
  const [editForm, setEditForm] = useState({ title: '', department: '', description: '', requiredSkills: '', experienceRequired: '', status: 'open' })
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filteredJobs = useMemo(() => {
    if (!data) return []
    let jobs = data
    if (filter === 'active') jobs = jobs.filter(j => j.status === 'open')
    if (filter === 'closed') jobs = jobs.filter(j => j.status === 'closed')
    if (search) jobs = jobs.filter(j => j.title?.toLowerCase().includes(search.toLowerCase()))
    return jobs
  }, [data, filter, search])

  const createJob = useMutation({
    mutationFn: async () => {
      try {
        const response = await api.post('/api/jobs', { title, description, department, requiredSkills, experienceRequired })
        return response.data
      } catch (err) {
        console.error('Failed to create job:', err)
        throw err
      }
    },
    onSuccess: () => { 
      console.log('Job created, invalidating analytics queries...')
      setTitle('')
      setDescription('')
      setDepartment('')
      setRequiredSkills('')
      setExperienceRequired('')
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['analytics', 'client'] })
      qc.invalidateQueries({ queryKey: ['analytics-client'] })
      qc.invalidateQueries({ queryKey: ['analytics-client-dashboard'] })
      qc.invalidateQueries({ queryKey: ['analytics-client-page'] })
    },
  })

  const deleteJob = useMutation({
    mutationFn: async (id: number) => {
      try {
        const response = await api.delete(`/api/jobs/${id}`)
        return response.data
      } catch (err) {
        console.error('Failed to delete job:', err)
        throw err
      }
    },
    onSuccess: () => {
      console.log('Job deleted, invalidating analytics queries...')
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['analytics', 'client'] })
      qc.invalidateQueries({ queryKey: ['analytics-client'] })
      qc.invalidateQueries({ queryKey: ['analytics-client-dashboard'] })
      qc.invalidateQueries({ queryKey: ['analytics-client-page'] })
    },
  })

  const updateJob = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      try {
        const response = await api.put(`/api/jobs/${id}`, payload)
        return response.data
      } catch (err) {
        console.error('Failed to update job:', err)
        throw err
      }
    },
    onSuccess: () => { 
      console.log('Job updated, invalidating analytics queries...')
      setEditModal(null)
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['analytics', 'client'] })
      qc.invalidateQueries({ queryKey: ['analytics-client'] })
      qc.invalidateQueries({ queryKey: ['analytics-client-dashboard'] })
      qc.invalidateQueries({ queryKey: ['analytics-client-page'] })
    },
  })

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
        💼 Jobs Management
      </motion.h1>

      <AnimatedCard className="p-6">
        <motion.h2 
          className="text-xl font-semibold mb-4 text-cyan-300"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Create New Job
        </motion.h2>
        <motion.div 
          className="grid gap-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <motion.input 
            value={title} 
            onChange={e=>setTitle(e.target.value)} 
            placeholder="Job title" 
            className="bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all backdrop-blur-sm" 
            whileFocus={{ scale: 1.02 }}
          />
          <motion.input 
            value={department} 
            onChange={e=>setDepartment(e.target.value)} 
            placeholder="Department" 
            className="bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all backdrop-blur-sm" 
            whileFocus={{ scale: 1.02 }}
          />
          <motion.textarea 
            value={description} 
            onChange={e=>setDescription(e.target.value)} 
            placeholder="Job description" 
            className="bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all backdrop-blur-sm h-24 resize-none" 
            whileFocus={{ scale: 1.02 }}
          />
          <motion.input 
            value={requiredSkills} 
            onChange={e=>setRequiredSkills(e.target.value)} 
            placeholder="Required skills (e.g., Python, React, SQL)" 
            className="bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all backdrop-blur-sm" 
            whileFocus={{ scale: 1.02 }}
          />
          <motion.input 
            value={experienceRequired} 
            onChange={e=>setExperienceRequired(e.target.value)} 
            placeholder="Experience required (e.g., 2-5 years)" 
            className="bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all backdrop-blur-sm" 
            whileFocus={{ scale: 1.02 }}
          />
          <AnimatedButton 
            onClick={()=>createJob.mutate()} 
            disabled={!title || !department || !requiredSkills || createJob.isPending} 
            className="self-start"
          >
            {createJob.isPending ? '✨ Creating...' : '🚀 Create Job'}
          </AnimatedButton>
        </motion.div>
      </AnimatedCard>

      <AnimatedCard className="p-6">
        <motion.div 
          className="flex flex-wrap gap-4 items-center"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex gap-2">
            {['all', 'active', 'closed'].map((filterType, index) => (
              <motion.button 
                key={filterType}
                onClick={() => setFilter(filterType)} 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === filterType 
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg' 
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                }`}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
              >
                {filterType === 'all' ? '📋 All Jobs' : 
                 filterType === 'active' ? '✅ Active Jobs' : 
                 '❌ Closed Jobs'}
              </motion.button>
            ))}
          </div>
          <motion.input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="🔍 Search jobs..." 
            className="bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all backdrop-blur-sm" 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
            whileFocus={{ scale: 1.02 }}
          />
        </motion.div>
      </AnimatedCard>

      <AnimatedCard className="overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-800/60">
              <tr>
                <th className="text-left p-4 font-semibold text-slate-300">Title</th>
                <th className="text-left p-4 font-semibold text-slate-300">Department</th>
                <th className="text-left p-4 font-semibold text-slate-300">Status</th>
                <th className="text-left p-4 font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredJobs?.map((job, index) => (
                  <motion.tr 
                    key={job.id} 
                    className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ backgroundColor: "rgba(51, 65, 85, 0.3)" }}
                  >
                    <td className="p-4 font-medium text-white">{job.title}</td>
                    <td className="p-4 text-slate-300">{job.department || '-'}</td>
                    <td className="p-4">
                      <motion.span 
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          job.status === 'open' 
                            ? 'bg-green-900/50 text-green-300 border border-green-700' 
                            : 'bg-red-900/50 text-red-300 border border-red-700'
                        }`}
                        whileHover={{ scale: 1.05 }}
                      >
                        {job.status === 'open' ? '✅ Open' : '❌ Closed'}
                      </motion.span>
                    </td>
                    <td className="p-4 space-x-2">
                      <motion.button 
                        onClick={() => {
                          setEditForm({ 
                            title: job.title, 
                            department: job.department || '', 
                            description: job.description || '',
                            requiredSkills: job.requiredSkills || '',
                            experienceRequired: job.experienceRequired || '',
                            status: job.status 
                          })
                          setEditModal({ job })
                        }}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        ✏️ Edit
                      </motion.button>
                      <motion.button 
                        onClick={() => {
                          if (confirm(`Delete job "${job.title}"?`)) {
                            deleteJob.mutate(job.id)
                          }
                        }}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        🗑️ Delete
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </AnimatedCard>



      {/* Edit Modal */}
      <AnimatePresence>
        {editModal && (
          <motion.div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditModal(null)}
          >
            <motion.div 
              className="bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 border border-slate-700"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold mb-4 text-cyan-300">Edit Job</h3>
              <div className="space-y-4">
                <input 
                  value={editForm.title} 
                  onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Job title" 
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all backdrop-blur-sm text-white" 
                />
                <input 
                  value={editForm.department} 
                  onChange={e => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="Department" 
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all backdrop-blur-sm text-white" 
                />
                <textarea 
                  value={editForm.description} 
                  onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Job description" 
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all backdrop-blur-sm h-24 resize-none text-white" 
                />
                <input 
                  value={editForm.requiredSkills} 
                  onChange={e => setEditForm(prev => ({ ...prev, requiredSkills: e.target.value }))}
                  placeholder="Required skills" 
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all backdrop-blur-sm text-white" 
                />
                <input 
                  value={editForm.experienceRequired} 
                  onChange={e => setEditForm(prev => ({ ...prev, experienceRequired: e.target.value }))}
                  placeholder="Experience required" 
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all backdrop-blur-sm text-white" 
                />
                <select 
                  value={editForm.status} 
                  onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all backdrop-blur-sm text-white"
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <AnimatedButton 
                  onClick={() => {
                    updateJob.mutate({ 
                      id: editModal.job.id, 
                      payload: editForm 
                    })
                  }}
                  disabled={!editForm.title || updateJob.isPending}
                  className="flex-1"
                >
                  {updateJob.isPending ? '✨ Updating...' : '💾 Save Changes'}
                </AnimatedButton>
                <AnimatedButton 
                  onClick={() => setEditModal(null)}
                  className="flex-1 bg-slate-600 hover:bg-slate-500"
                >
                  ❌ Cancel
                </AnimatedButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}