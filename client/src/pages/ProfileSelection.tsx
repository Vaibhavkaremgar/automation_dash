import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Modal from '../components/ui/Modal';

interface Profile {
  id: number;
  profile_name: string;
  avatar_color: string;
  last_used_at: string;
}

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', 
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'
];

export default function ProfileSelection() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const navigate = useNavigate();

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const res = await api.get('/api/profiles');
      setProfiles(res.data);
      
      // Auto-select if only one profile
      if (res.data.length === 1) {
        selectProfile(res.data[0]);
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectProfile = async (profile: Profile) => {
    try {
      await api.post(`/api/profiles/${profile.id}/select`);
      localStorage.setItem('selectedProfileId', profile.id.toString());
      localStorage.setItem('selectedProfileName', profile.profile_name);
      // Don't navigate away - just reload profiles to show selection
      loadProfiles();
    } catch (error) {
      console.error('Failed to select profile:', error);
    }
  };

  const createProfile = async () => {
    if (!newProfileName.trim()) {
      alert('Profile name is required');
      return;
    }

    try {
      await api.post('/api/profiles', {
        profile_name: newProfileName.trim(),
        avatar_color: selectedColor
      });
      setShowAddModal(false);
      setNewProfileName('');
      setSelectedColor(AVATAR_COLORS[0]);
      loadProfiles();
    } catch (error) {
      console.error('Failed to create profile:', error);
      alert('Failed to create profile');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold text-white text-center mb-12">
          Who's using the dashboard?
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {profiles.map((profile) => {
            const isSelected = localStorage.getItem('selectedProfileId') === profile.id.toString();
            return (
              <button
                key={profile.id}
                onClick={() => selectProfile(profile)}
                className={`group flex flex-col items-center gap-4 p-6 rounded-lg hover:bg-white/10 transition-all ${
                  isSelected ? 'ring-4 ring-green-400 bg-white/10' : ''
                }`}
              >
                <div
                  className="w-32 h-32 rounded-lg flex items-center justify-center text-4xl font-bold text-white group-hover:scale-110 transition-transform relative"
                  style={{ backgroundColor: profile.avatar_color }}
                >
                  {profile.profile_name.charAt(0).toUpperCase()}
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 bg-green-500 rounded-full w-8 h-8 flex items-center justify-center text-white text-xl">
                      ✓
                    </div>
                  )}
                </div>
                <span className="text-white text-lg font-medium">
                  {profile.profile_name}
                  {isSelected && <span className="text-green-400 ml-2">(Active)</span>}
                </span>
              </button>
            );
          })}

          {profiles.length < 5 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="group flex flex-col items-center gap-4 p-6 rounded-lg hover:bg-white/10 transition-all border-2 border-dashed border-white/30"
            >
              <div className="w-32 h-32 rounded-lg flex items-center justify-center text-6xl text-white/50 group-hover:text-white transition-colors">
                +
              </div>
              <span className="text-white/70 text-lg font-medium group-hover:text-white">
                Add Profile
              </span>
            </button>
          )}
        </div>

        <div className="text-center space-y-3">
          {localStorage.getItem('selectedProfileId') && (
            <Button
              onClick={() => navigate('/')}
              className="mr-3"
            >
              Continue to Dashboard
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              localStorage.removeItem('selectedProfileId');
              localStorage.removeItem('selectedProfileName');
              navigate('/');
            }}
          >
            Skip Profile Selection
          </Button>
        </div>
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Create New Profile">
        <div className="space-y-4">
          <Input
            placeholder="Profile Name"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            maxLength={20}
          />

          <div>
            <label className="block text-sm text-slate-300 mb-2">Choose Avatar Color</label>
            <div className="grid grid-cols-4 gap-3">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-full h-12 rounded-lg transition-all ${
                    selectedColor === color ? 'ring-4 ring-white scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={createProfile}>Create Profile</Button>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
