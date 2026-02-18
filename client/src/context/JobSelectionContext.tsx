import { createContext, useContext, useState, ReactNode } from 'react'

interface Job {
  id: number
  title: string
  department?: string
  description?: string
  status: string
}

interface JobSelectionContextType {
  selectedJob: Job | null
  selectJob: (job: Job) => void
  clearSelection: () => void
}

const JobSelectionContext = createContext<JobSelectionContextType | undefined>(undefined)

export function JobSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  const selectJob = (job: Job) => {
    setSelectedJob(job)
  }

  const clearSelection = () => {
    setSelectedJob(null)
  }

  return (
    <JobSelectionContext.Provider value={{ selectedJob, selectJob, clearSelection }}>
      {children}
    </JobSelectionContext.Provider>
  )
}

export function useJobSelection() {
  const context = useContext(JobSelectionContext)
  if (context === undefined) {
    throw new Error('useJobSelection must be used within a JobSelectionProvider')
  }
  return context
}