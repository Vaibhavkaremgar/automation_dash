import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface VoiceInterview {
  id: number
  candidateName: string
  jobTitle: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  duration: number
  cost: number
  score: number
  recommendation: 'hire' | 'reject' | 'shortlist'
  createdAt: string
}

export const useVoiceInterview = () => {
  const [activeInterview, setActiveInterview] = useState<number | null>(null)
  const queryClient = useQueryClient()

  // Start voice interview
  const startInterview = useMutation({
    mutationFn: async ({ candidateId, jobId, phoneNumber }: {
      candidateId: number
      jobId: number
      phoneNumber: string
    }) => {
      const response = await api.post('/api/voice/start-interview', {
        candidateId,
        jobId,
        phoneNumber
      })
      return response.data
    },
    onSuccess: (data) => {
      setActiveInterview(data.data.interviewId)
      queryClient.invalidateQueries({ queryKey: ['voice-interviews'] })
    }
  })

  // Get interview status
  const { data: interviewStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['voice-interview-status', activeInterview],
    queryFn: async () => {
      if (!activeInterview) return null
      const response = await api.get(`/api/voice/interview/${activeInterview}/status`)
      return response.data.data
    },
    enabled: !!activeInterview,
    refetchInterval: (data) => {
      // Poll every 3 seconds if interview is in progress
      return data?.status === 'in_progress' ? 3000 : false
    }
  })

  // End interview
  const endInterview = useMutation({
    mutationFn: async (interviewId: number) => {
      const response = await api.post(`/api/voice/interview/${interviewId}/end`)
      return response.data
    },
    onSuccess: () => {
      setActiveInterview(null)
      queryClient.invalidateQueries({ queryKey: ['voice-interviews'] })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
    }
  })

  // Get interview history
  const { data: interviews } = useQuery({
    queryKey: ['voice-interviews'],
    queryFn: async () => {
      const response = await api.get('/api/voice/interviews')
      return response.data.data as VoiceInterview[]
    }
  })

  // Get interview transcript
  const getTranscript = useMutation({
    mutationFn: async (interviewId: number) => {
      const response = await api.get(`/api/voice/interview/${interviewId}/transcript`)
      return response.data.data
    }
  })

  return {
    startInterview,
    endInterview,
    getTranscript,
    interviews: interviews || [],
    activeInterview,
    interviewStatus,
    refetchStatus,
    isStarting: startInterview.isPending,
    isEnding: endInterview.isPending,
    setActiveInterview
  }
}