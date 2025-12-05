import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

interface PasswordChangeModalProps {
  isOpen: boolean
  onClose: () => void
  isTemporary?: boolean
}

export default function PasswordChangeModal({ isOpen, onClose, isTemporary = false }: PasswordChangeModalProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match')
      }
      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }
      return (await api.post('/api/auth/change-password', {
        currentPassword: isTemporary ? undefined : currentPassword,
        newPassword
      })).data
    },
    onSuccess: () => {
      onClose()
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setError('')
      alert('Password changed successfully!')
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error || err.message || 'Failed to change password')
    }
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-medium mb-4">
          {isTemporary ? 'Set New Password' : 'Change Password'}
        </h3>
        
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded p-3 mb-4">
            <div className="text-red-300 text-sm">{error}</div>
          </div>
        )}

        <div className="space-y-4">
          {!isTemporary && (
            <div>
              <label className="block text-sm text-slate-300 mb-1">Current Password</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm text-slate-300 mb-1">New Password</label>
            <Input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 6 characters)"
            />
          </div>
          
          <div>
            <label className="block text-sm text-slate-300 mb-1">Confirm New Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          {!isTemporary && (
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={changePassword.isPending}
            >
              Cancel
            </Button>
          )}
          <Button 
            onClick={() => changePassword.mutate()}
            disabled={changePassword.isPending || !newPassword || (!isTemporary && !currentPassword)}
            className="flex-1"
          >
            {changePassword.isPending ? 'Changing...' : 'Change Password'}
          </Button>
        </div>
      </div>
    </div>
  )
}