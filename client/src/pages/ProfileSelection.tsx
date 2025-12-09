import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import '../styles/profile-animations.css';

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

interface EditingProfile {
  id: number;
  profile_name: string;
  avatar_color: string;
}

export default function ProfileSelection() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [editingProfile, setEditingProfile] = useState<EditingProfile | null>(null);
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
    } finally {
      setLoading(false);
    }
  };

  const selectProfile = async (profile: Profile) => {
    try {
      await api.post(`/api/profiles/${profile.id}/select`);
      localStorage.setItem('selectedProfileId', profile.id.toString());
      localStorage.setItem('selectedProfileName', profile.profile_name);
      navigate('/insurance');
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

  const updateProfile = async () => {
    if (!editingProfile || !editingProfile.profile_name.trim()) {
      alert('Profile name is required');
      return;
    }

    try {
      await api.put(`/api/profiles/${editingProfile.id}`, {
        profile_name: editingProfile.profile_name.trim(),
        avatar_color: editingProfile.avatar_color
      });
      setEditingProfile(null);
      loadProfiles();
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile');
    }
  };

  const deleteProfile = async (profileId: number) => {
    if (!confirm('Delete this profile? All activity history will be kept.')) return;

    try {
      await api.delete(`/api/profiles/${profileId}`);
      if (localStorage.getItem('selectedProfileId') === profileId.toString()) {
        localStorage.removeItem('selectedProfileId');
        localStorage.removeItem('selectedProfileName');
      }
      loadProfiles();
    } catch (error) {
      console.error('Failed to delete profile:', error);
      alert('Failed to delete profile');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]"></div>
      <div className="max-w-5xl w-full relative z-10">
        <h1 className="text-5xl font-bold text-white text-center mb-16 animate-fade-in">
          Who's using the dashboard?
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {profiles.map((profile) => {
            const isSelected = localStorage.getItem('selectedProfileId') === profile.id.toString();
            return (
              <div key={profile.id} className="relative animate-fade-in" style={{animationDelay: `${profiles.indexOf(profile) * 100}ms`}}>
                <button
                  onClick={() => selectProfile(profile)}
                  className={`group flex flex-col items-center gap-4 p-6 rounded-xl hover:bg-white/10 transition-all duration-300 w-full transform hover:scale-105 ${
                    isSelected ? 'ring-4 ring-indigo-500 bg-white/10 scale-105' : ''
                  }`}
                >
                  <div
                    className="w-36 h-36 rounded-2xl flex items-center justify-center text-5xl font-bold text-white group-hover:scale-110 transition-all duration-300 shadow-2xl relative border-4 border-white/10"
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
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingProfile(profile);
                    }}
                    className="bg-blue-500/80 hover:bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs"
                    title="Edit Profile"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProfile(profile.id);
                    }}
                    className="bg-red-500/80 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs"
                    title="Delete Profile"
                  >
                    🗑️
                  </button>
                </div>
              </div>
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

      {/* Edit Profile Modal */}
      <Modal open={!!editingProfile} onClose={() => setEditingProfile(null)} title="Edit Profile">
        {editingProfile && (
          <div className="space-y-4">
            <Input
              placeholder="Profile Name"
              value={editingProfile.profile_name}
              onChange={(e) => setEditingProfile({...editingProfile, profile_name: e.target.value})}
              maxLength={20}
            />

            <div>
              <label className="block text-sm text-slate-300 mb-2">Choose Avatar Color</label>
              <div className="grid grid-cols-4 gap-3">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setEditingProfile({...editingProfile, avatar_color: color})}
                    className={`w-full h-12 rounded-lg transition-all ${
                      editingProfile.avatar_color === color ? 'ring-4 ring-white scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={updateProfile}>Update Profile</Button>
              <Button variant="outline" onClick={() => setEditingProfile(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
