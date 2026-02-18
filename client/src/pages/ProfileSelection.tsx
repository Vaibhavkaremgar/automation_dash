import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { api } from '../lib/api';

interface Profile {
  id: number;
  profile_name: string;
  role: string;
  created_at: string;
}

export default function ProfileSelection() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [password, setPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);
  const [newProfile, setNewProfile] = useState({ profile_name: '', profile_password: '', role: 'user' });
  const [editProfile, setEditProfile] = useState({ profile_name: '', password: '' });
  const [deletePassword, setDeletePassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetData, setResetData] = useState({ admin_password: '', new_password: '', confirm_password: '' });
  const navigate = useNavigate();

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const res = await api.get('/api/profiles');
      setProfiles(res.data);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };



  const handleProfileClick = (profile: Profile) => {
    setSelectedProfile(profile);
    setPassword('');
    setError('');
    setShowPasswordModal(true);
  };

  const handleVerifyPassword = async () => {
    try {
      const res = await api.post('/api/profiles/verify', {
        profile_id: selectedProfile?.id,
        password
      });

      if (res.data.success) {
        const profileData = { ...res.data.profile, is_admin: res.data.profile.role === 'admin' ? 1 : 0 };
        localStorage.setItem('activeProfile', JSON.stringify(profileData));
        localStorage.setItem('user', JSON.stringify({ ...JSON.parse(localStorage.getItem('user') || '{}'), is_admin: profileData.is_admin }));
        navigate('/insurance');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Invalid password');
    }
  };

  const handleEditProfile = async () => {
    try {
      await api.put(`/api/profiles/${editingProfile?.id}`, {
        profile_name: editProfile.profile_name,
        password: editProfile.password
      });
      setShowEditModal(false);
      setEditProfile({ profile_name: '', password: '' });
      setEditingProfile(null);
      loadProfiles();
      alert('Profile updated successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleDeleteProfile = async () => {
    try {
      await api.delete(`/api/profiles/${deletingProfile?.id}`, {
        data: { admin_password: deletePassword }
      });
      setShowDeleteModal(false);
      setDeletePassword('');
      setDeletingProfile(null);
      loadProfiles();
      alert('Profile deleted successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete profile');
    }
  };

  const handleCreateProfile = async () => {
    try {
      if (!newProfile.profile_name || !newProfile.profile_password) {
        alert('Profile name and password are required');
        return;
      }

      if (profiles.length >= 5) {
        alert('Maximum 5 profiles allowed');
        return;
      }

      await api.post('/api/profiles', newProfile);
      setShowCreateModal(false);
      setNewProfile({ profile_name: '', profile_password: '', role: 'user' });
      loadProfiles();
      alert('Profile created successfully');
    } catch (error: any) {
      console.error('Create profile error:', error);
      alert(error.response?.data?.error || 'Failed to create profile');
    }
  };



  const hasAdminProfile = profiles.some(p => p.role === 'admin');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Select Profile</h1>
          <p className="text-slate-300">Choose a profile to continue</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              onClick={() => handleProfileClick(profile)}
              className="bg-slate-800/50  border border-slate-700/50 rounded-xl p-6 cursor-pointer hover:bg-slate-800/70 transition-all hover:scale-105"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-2xl font-bold text-white">
                  {profile.profile_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center gap-2">
                  {profile.role === 'admin' && (
                    <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-300 rounded-full border border-yellow-500/30">
                      Admin
                    </span>
                  )}
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProfile(profile);
                        setEditProfile({ profile_name: profile.profile_name, password: '' });
                        setShowEditModal(true);
                      }}
                      className="p-1 text-cyan-400 hover:text-cyan-300 text-sm"
                      title="Edit Profile"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingProfile(profile);
                        setDeletePassword('');
                        setShowDeleteModal(true);
                      }}
                      className="p-1 text-red-400 hover:text-red-300 text-sm"
                      title="Delete Profile (Admin Only)"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-1">{profile.profile_name}</h3>
              <p className="text-sm text-slate-400">Click to access</p>
            </div>
          ))}

          {profiles.length < 5 && (
            <div
              onClick={() => setShowCreateModal(true)}
              className="bg-slate-800/30  border-2 border-dashed border-slate-600/50 rounded-xl p-6 cursor-pointer hover:bg-slate-800/50 transition-all hover:scale-105 flex flex-col items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center text-3xl text-slate-400 mb-4">
                +
              </div>
              <h3 className="text-lg font-semibold text-slate-300">Create Profile</h3>
              <p className="text-sm text-slate-500 text-center mt-2">
                {profiles.length}/5 profiles used
              </p>
            </div>
          )}
        </div>

        <div className="text-center">
          <Button variant="outline" onClick={() => navigate('/login')}>
            Back to Login
          </Button>
        </div>
      </div>

      {/* Password Verification Modal */}
      <Modal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} title={`Enter Password for ${selectedProfile?.profile_name}`}>
        <div className="space-y-4">
          <Input
            type="password"
            placeholder="Enter profile or admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleVerifyPassword()}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <Button onClick={handleVerifyPassword}>Unlock</Button>
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
          </div>
          <div className="text-center pt-2 border-t border-slate-600">
            <button
              onClick={() => {
                setShowPasswordModal(false);
                setShowForgotPasswordModal(true);
              }}
              className="text-sm text-cyan-400 hover:text-cyan-300"
            >
              Forgot Password?
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Profile Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Profile">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Profile Name</label>
            <Input
              placeholder="Enter profile name"
              value={newProfile.profile_name}
              onChange={(e) => setNewProfile({...newProfile, profile_name: e.target.value})}
            />
          </div>
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Profile Password</label>
            <Input
              type="password"
              placeholder="Enter password for this profile"
              value={newProfile.profile_password}
              onChange={(e) => setNewProfile({...newProfile, profile_password: e.target.value})}
            />
          </div>
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Profile Type</label>
            <select
              className="w-full p-2 border rounded bg-slate-700 text-white"
              value={newProfile.role}
              onChange={(e) => setNewProfile({...newProfile, role: e.target.value})}
              disabled={hasAdminProfile}
            >
              <option value="user">User Profile</option>
              {!hasAdminProfile && <option value="admin">Admin Profile (Master)</option>}
            </select>
            {!hasAdminProfile && (
              <p className="text-xs text-yellow-400 mt-1">⚠️ Create Admin Profile first. Its password will be the master password.</p>
            )}
            {hasAdminProfile && (
              <p className="text-xs text-slate-400 mt-1">Admin profile already exists. Only user profiles can be created.</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={handleCreateProfile} disabled={!newProfile.profile_name || !newProfile.profile_password}>Create Profile</Button>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title={`Edit Profile: ${editingProfile?.profile_name}`}>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Profile Name</label>
            <Input
              placeholder="Enter new profile name"
              value={editProfile.profile_name}
              onChange={(e) => setEditProfile({...editProfile, profile_name: e.target.value})}
            />
          </div>
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Profile Password (for verification)</label>
            <Input
              type="password"
              placeholder="Enter current profile password"
              value={editProfile.password}
              onChange={(e) => setEditProfile({...editProfile, password: e.target.value})}
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleEditProfile} disabled={!editProfile.profile_name || !editProfile.password}>
              Update Profile
            </Button>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Profile Modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title={`Delete Profile: ${deletingProfile?.profile_name}`}>
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-300 text-sm">⚠️ This action cannot be undone. Enter admin password to confirm deletion.</p>
          </div>
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Admin Password</label>
            <Input
              type="password"
              placeholder="Enter admin password to confirm"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleDeleteProfile} disabled={!deletePassword} className="bg-red-600 hover:bg-red-700">
              Delete Profile
            </Button>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Forgot Password Modal */}
      <Modal open={showForgotPasswordModal} onClose={() => setShowForgotPasswordModal(false)} title="Reset Profile Password">
        <div className="space-y-4">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-yellow-300 text-sm">Enter your admin password to reset this profile's password</p>
          </div>
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Admin Password</label>
            <Input
              type="password"
              placeholder="Enter admin password"
              value={resetData.admin_password}
              onChange={(e) => setResetData({...resetData, admin_password: e.target.value})}
            />
          </div>
          <div>
            <label className="text-sm text-slate-300 mb-1 block">New Password</label>
            <Input
              type="password"
              placeholder="Enter new password"
              value={resetData.new_password}
              onChange={(e) => setResetData({...resetData, new_password: e.target.value})}
            />
          </div>
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Confirm Password</label>
            <Input
              type="password"
              placeholder="Confirm new password"
              value={resetData.confirm_password}
              onChange={(e) => setResetData({...resetData, confirm_password: e.target.value})}
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={async () => {
              if (resetData.new_password !== resetData.confirm_password) {
                alert('Passwords do not match');
                return;
              }
              try {
                await api.post('/api/profiles/reset-password', {
                  profile_id: selectedProfile?.id,
                  admin_password: resetData.admin_password,
                  new_password: resetData.new_password
                });
                alert('Password reset successfully');
                setShowForgotPasswordModal(false);
                setResetData({ admin_password: '', new_password: '', confirm_password: '' });
              } catch (error: any) {
                alert(error.response?.data?.error || 'Failed to reset password');
              }
            }}>Reset Password</Button>
            <Button variant="outline" onClick={() => setShowForgotPasswordModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>


    </div>
  );
}
