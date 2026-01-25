'use client';

import { useState, useRef } from 'react';
import { ArrowLeft, Camera, Lock, Trash2, Check, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useCurrentUser, useAuthContext } from '../../../../lib/auth/context';
import { useUser, useClerk } from '@clerk/nextjs';

interface EditableFieldProps {
  label: string;
  value: string;
  onSave: (value: string) => Promise<void>;
  type?: 'text' | 'email' | 'tel';
  placeholder?: string;
}

function EditableField({ label, value, onSave, type = 'text', placeholder }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save:', error);
      setEditValue(value); // Revert on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-4 border-b border-white/10 last:border-b-0">
      <div className="flex-1 min-w-0">
        <label className="text-sm text-gray-500 block mb-1">{label}</label>
        {isEditing ? (
          <input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            placeholder={placeholder}
            className="w-full bg-transparent text-white border-b border-accent focus:outline-none py-1"
          />
        ) : (
          <p className="text-white truncate">
            {value || <span className="text-gray-600">{placeholder || 'Not set'}</span>}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 ml-4">
        {showSaved && (
          <span className="text-green-400 text-sm flex items-center gap-1">
            <Check className="w-4 h-4" /> Saved
          </span>
        )}
        {isSaving ? (
          <Loader2 className="w-5 h-5 text-accent animate-spin" />
        ) : (
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className="text-accent hover:text-accent/80 text-sm font-medium min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {isEditing ? 'Save' : 'Edit'}
          </button>
        )}
      </div>
    </div>
  );
}

function ProfileAvatar({
  initials,
  avatarUrl,
  onUpload
}: {
  initials: string;
  avatarUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
}) {
  const [isHovering, setIsHovering] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please upload a JPEG, PNG, GIF, or WebP image');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      await onUpload(file);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col items-center mb-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        disabled={isUploading}
        className="relative w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden group disabled:cursor-wait"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl font-bold text-accent">{initials}</span>
        )}

        {/* Hover/uploading overlay */}
        <div className={`
          absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity
          ${isHovering || isUploading ? 'opacity-100' : 'opacity-0'}
        `}>
          {isUploading ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : (
            <Camera className="w-8 h-8 text-white" />
          )}
        </div>
      </button>
      <p className="text-xs text-gray-500 mt-2">Click to upload photo</p>
      {uploadError && (
        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {uploadError}
        </p>
      )}
    </div>
  );
}

export default function ProfileSettingsPage() {
  const { user, isLoading, refetch } = useAuthContext();
  const { initials } = useCurrentUser();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleUpdateField = async (field: string, value: string) => {
    const response = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });

    if (!response.ok) {
      throw new Error('Failed to update');
    }

    // Refresh user data
    await refetch();
  };

  const handleAvatarUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch('/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || 'Failed to upload avatar');
    }

    // Refresh user data to get new avatar URL
    await refetch();
  };

  const handleChangePassword = () => {
    // Clerk handles password changes
    if (clerkUser) {
      // Open Clerk's user profile for password change
      window.location.href = '/user-profile';
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch('/api/users/me', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error?.message || 'Failed to delete account');
      }

      // Sign out from Clerk and redirect to home
      await signOut();
      window.location.href = '/';
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings" className="p-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Profile</h1>
        </div>
        <div className="max-w-lg mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="w-24 h-24 bg-white/10 rounded-full mx-auto" />
            <div className="bg-surface rounded-xl p-6 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-white/10 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/settings"
          className="p-2 hover:bg-white/10 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
      </div>

      {/* Profile content - centered, max width */}
      <div className="max-w-lg mx-auto">
        {/* Avatar */}
        <ProfileAvatar
          initials={initials || 'U'}
          avatarUrl={user?.avatarUrl}
          onUpload={handleAvatarUpload}
        />

        {/* Profile fields */}
        <div className="bg-surface rounded-xl px-5">
          <EditableField
            label="First Name"
            value={user?.firstName || ''}
            onSave={(value) => handleUpdateField('firstName', value)}
            placeholder="Enter first name"
          />
          <EditableField
            label="Last Name"
            value={user?.lastName || ''}
            onSave={(value) => handleUpdateField('lastName', value)}
            placeholder="Enter last name"
          />
          {/* Email field - read only, managed by Clerk */}
          <div className="flex items-center justify-between py-4 border-b border-white/10 last:border-b-0">
            <div className="flex-1 min-w-0">
              <label className="text-sm text-gray-500 block mb-1">Email</label>
              <p className="text-white truncate">{user?.email || 'Not set'}</p>
              <p className="text-xs text-gray-600 mt-1">
                Email is managed through your account settings
              </p>
            </div>
            <button
              onClick={handleChangePassword}
              className="text-accent hover:text-accent/80 text-sm font-medium min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              Manage
            </button>
          </div>
        </div>

        {/* Security section */}
        <div className="mt-6 space-y-3">
          <button
            onClick={handleChangePassword}
            className="w-full bg-surface rounded-xl px-5 py-4 flex items-center gap-4 hover:bg-surface-light transition-colors text-left"
          >
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
              <Lock className="w-5 h-5" />
            </div>
            <span className="text-white font-medium">Change Password</span>
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full bg-surface rounded-xl px-5 py-4 flex items-center gap-4 hover:bg-red-500/10 transition-colors text-left group"
          >
            <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <span className="text-gray-400 group-hover:text-red-400 font-medium">Delete Account</span>
          </button>
        </div>

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-xl p-6 max-w-sm w-full">
              <h3 className="text-xl font-bold text-white mb-2">Delete Account?</h3>
              <p className="text-gray-400 mb-4">
                This will permanently delete your account and all data. This action cannot be undone.
              </p>

              {deleteError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {deleteError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
