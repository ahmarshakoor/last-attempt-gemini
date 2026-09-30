import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, NewUserPolicy, GatewayInfo, ExtensionRequest, NotificationItem, NotificationCategory } from '../../types';
import {
  Users,
  Shield,
  Key,
  Clock,
  Sparkles,
  Bell,
  Settings,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Calendar,
  Eye,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Send,
  UserCheck,
  UserX,
  Lock,
  RefreshCw,
  Phone,
  Mail,
  ExternalLink
} from 'lucide-react';
import { authFetch } from '../utils/api';
import { getFirestoreUsers, syncUserToFirestore } from '../firebase';

interface Props {
  onNavigateGateway: () => void;
}

export const AdminPortal: React.FC<Props> = ({ onNavigateGateway }) => {
  const { user: currentAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'policy' | 'extensions' | 'gateway' | 'notifications'>('users');

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'pending' | 'revoked' | 'expired'>('all');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserForExpiry, setSelectedUserForExpiry] = useState<User | null>(null);
  const [customDays, setCustomDays] = useState(30);

  // Policy state
  const [policy, setPolicy] = useState<NewUserPolicy>('auto_3_months');
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [policySavedMsg, setPolicySavedMsg] = useState(false);

  // Extensions state
  const [extensions, setExtensions] = useState<ExtensionRequest[]>([]);
  const [isLoadingExt, setIsLoadingExt] = useState(false);

  // Gateway Info state
  const [gatewayInfo, setGatewayInfo] = useState<GatewayInfo>({
    visible: true,
    heading: '',
    message: '',
    whatsapp: '',
    email: '',
    pricing: '',
    additional_notes: '',
  });
  const [isSavingGateway, setIsSavingGateway] = useState(false);
  const [gatewaySavedMsg, setGatewaySavedMsg] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
  const [isCreatingNotif, setIsCreatingNotif] = useState(false);
  const [newNotifTitle, setNewNotifTitle] = useState('');
  const [newNotifCategory, setNewNotifCategory] = useState<NotificationCategory>('Important');
  const [newNotifMessage, setNewNotifMessage] = useState('');
  const [selectedNotifForReads, setSelectedNotifForReads] = useState<NotificationItem | null>(null);

  // Action messages
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const showNotification = (successMsg: string) => {
    setActionSuccess(successMsg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const showError = (err: string) => {
    setActionError(err);
    setTimeout(() => setActionError(null), 4500);
  };

  // Fetch Users
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const emailMap = new Map<string, User>();

      // 1. Fetch from backend API
      try {
        const res = await authFetch('/api/admin/users');
        if (res.ok) {
          const data = await res.json();
          (data.users || []).forEach((u: User) => {
            if (u.email && !u.email.endsWith('@example.com') && u.email !== 'admin@lastattempt.com') {
              emailMap.set(u.email.toLowerCase(), u);
            }
          });
        }
      } catch (err) {
        console.warn('Backend users fetch error:', err);
      }

      // 2. Fetch directly from cloud Firestore (ensures all Google logged-in users are loaded)
      try {
        const firestoreUsers = await getFirestoreUsers();
        firestoreUsers.forEach((u: User) => {
          if (u.email && !u.email.endsWith('@example.com') && u.email !== 'admin@lastattempt.com') {
            const existing = emailMap.get(u.email.toLowerCase());
            if (!existing) {
              emailMap.set(u.email.toLowerCase(), u);
            } else {
              emailMap.set(u.email.toLowerCase(), { ...existing, ...u });
            }
          }
        });
      } catch (err) {
        console.warn('Firestore users fetch error:', err);
      }

      const combined = Array.from(emailMap.values());
      combined.sort((a, b) => {
        if (a.email.toLowerCase() === 'drahmarshakoor@gmail.com') return -1;
        if (b.email.toLowerCase() === 'drahmarshakoor@gmail.com') return 1;
        return (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0);
      });

      setUsers(combined);
    } catch (e: any) {
      showError(e.message || 'Error fetching users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch Policy
  const fetchPolicy = async () => {
    try {
      const res = await authFetch('/api/admin/policy');
      if (res.ok) {
        const data = await res.json();
        setPolicy(data.policy);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Extensions
  const fetchExtensions = async () => {
    setIsLoadingExt(true);
    try {
      const res = await authFetch('/api/admin/extensions');
      if (res.ok) {
        const data = await res.json();
        setExtensions(data.requests || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingExt(false);
    }
  };

  // Fetch Gateway Info
  const fetchGatewayInfo = async () => {
    try {
      const res = await authFetch('/api/gateway/info');
      if (res.ok) {
        const data = await res.json();
        if (data.info) setGatewayInfo(data.info);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Admin Notifications
  const fetchAdminNotifications = async () => {
    setIsLoadingNotifs(true);
    try {
      const res = await authFetch('/api/admin/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPolicy();
    fetchExtensions();
    fetchGatewayInfo();
    fetchAdminNotifications();
  }, []);

  // Update Access
  const handleUpdateAccess = async (userId: string, newStatus: string, options: { add_days?: number; set_lifetime?: boolean } = {}) => {
    try {
      const res = await authFetch(`/api/admin/users/${userId}/access`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_status: newStatus,
          add_days: options.add_days,
          set_lifetime: options.set_lifetime,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.user) {
        await syncUserToFirestore({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          access_status: data.user.access_status,
          access_expires_at: data.user.access_expires_at,
        });
      }

      showNotification('User access updated successfully.');
      fetchUsers();
      setSelectedUserForExpiry(null);
    } catch (e: any) {
      showError(e.message || 'Failed to update user access');
    }
  };

  // Save Policy
  const handleSavePolicy = async () => {
    setIsSavingPolicy(true);
    try {
      const res = await authFetch('/api/admin/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy }),
      });
      if (res.ok) {
        setPolicySavedMsg(true);
        setTimeout(() => setPolicySavedMsg(false), 3000);
        showNotification('New user registration policy updated.');
      }
    } catch (e: any) {
      showError(e.message);
    } finally {
      setIsSavingPolicy(false);
    }
  };

  // Review Extension
  const handleReviewExtension = async (extId: string, action: 'approve' | 'decline', extendDays = 30) => {
    try {
      const res = await authFetch(`/api/admin/extensions/${extId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, extend_days: extendDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotification(`Extension request ${action === 'approve' ? 'approved' : 'declined'}.`);
      fetchExtensions();
      fetchUsers();
    } catch (e: any) {
      showError(e.message);
    }
  };

  // Save Gateway Info
  const handleSaveGatewayInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGateway(true);
    try {
      const res = await authFetch('/api/admin/gateway-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gatewayInfo),
      });
      if (res.ok) {
        setGatewaySavedMsg(true);
        setTimeout(() => setGatewaySavedMsg(false), 3000);
        showNotification('Gateway information box updated.');
      }
    } catch (e: any) {
      showError(e.message);
    } finally {
      setIsSavingGateway(false);
    }
  };

  // Create Notification
  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newNotifTitle,
          category: newNotifCategory,
          message: newNotifMessage,
          is_active: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotification('Notification published to users.');
      setNewNotifTitle('');
      setNewNotifMessage('');
      setIsCreatingNotif(false);
      fetchAdminNotifications();
    } catch (e: any) {
      showError(e.message);
    }
  };

  // Toggle Notification Active
  const handleToggleNotif = async (notifId: string) => {
    try {
      const res = await authFetch(`/api/admin/notifications/${notifId}/toggle`, { method: 'PATCH' });
      if (res.ok) {
        fetchAdminNotifications();
      }
    } catch (e: any) {
      showError(e.message);
    }
  };

  // Delete Notification
  const handleDeleteNotif = async (notifId: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    try {
      const res = await authFetch(`/api/admin/notifications/${notifId}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('Notification deleted.');
        fetchAdminNotifications();
      }
    } catch (e: any) {
      showError(e.message);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());

    const isExpired = u.access_expires_at ? new Date(u.access_expires_at).getTime() < Date.now() : false;

    if (!matchesSearch) return false;

    if (userFilter === 'all') return true;
    if (userFilter === 'active') return u.access_status === 'active' && !isExpired;
    if (userFilter === 'pending') return u.access_status === 'pending';
    if (userFilter === 'revoked') return u.access_status === 'revoked';
    if (userFilter === 'expired') return isExpired;

    return true;
  });

  return (
    <div className="min-h-screen bg-[#f7f5f0] flex flex-col justify-between">
      {/* Admin Header */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateGateway}
              className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Gateway</span>
            </button>
            <div className="h-5 w-px bg-stone-200" />
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-600 text-white">
                <Shield className="w-4 h-4" />
              </span>
              <span className="font-serif-title font-bold text-stone-900 text-lg">
                Admin Access Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/study"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#830e0d] text-white text-xs font-bold hover:bg-[#6f0c0b] transition-colors shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Open Study</span>
            </a>
            <div className="text-right text-xs">
              <span className="font-bold text-stone-800 block">{currentAdmin?.name}</span>
              <span className="text-[10px] text-blue-600 font-semibold uppercase">Administrator</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Messages */}
        {actionError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'users'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users & Access ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('policy')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'policy'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>New User Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('extensions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
              activeTab === 'extensions'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Extension Requests</span>
            {extensions.filter(e => e.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                {extensions.filter(e => e.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('gateway')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'gateway'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Gateway Info Box</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'notifications'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications & Read Tracking ({notifications.length})</span>
          </button>
        </div>

        {/* ================= TAB 1: USERS & ACCESS ================= */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                {(['all', 'active', 'pending', 'expired', 'revoked'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setUserFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                      userFilter === f
                        ? 'bg-stone-800 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
                <button
                  onClick={fetchUsers}
                  className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100"
                  title="Refresh users"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-200">
                    <tr>
                      <th className="px-5 py-3.5">User</th>
                      <th className="px-4 py-3.5">Role</th>
                      <th className="px-4 py-3.5">Access Status</th>
                      <th className="px-4 py-3.5">Expiry Date</th>
                      <th className="px-4 py-3.5">Last Sign In</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {isLoadingUsers ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-stone-400">
                          Loading users...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-stone-400">
                          No users matched your search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isExpired = u.access_expires_at
                          ? new Date(u.access_expires_at).getTime() < Date.now()
                          : false;
                        const isAdminAccount = u.role === 'admin';

                        return (
                          <tr key={u.id} className="hover:bg-stone-50/50 transition-colors">
                            <td className="px-5 py-4">
                              <div className="font-bold text-stone-900">{u.name}</div>
                              <div className="text-stone-500 text-[11px]">{u.email}</div>
                              {isAdminAccount && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5">
                                  <Lock className="w-2.5 h-2.5" /> Protected Admin Account
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                u.role === 'admin'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-stone-100 text-stone-700'
                              }`}>
                                {u.role.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              {u.access_status === 'active' && !isExpired ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold text-[11px]">
                                  <CheckCircle2 className="w-3 h-3" /> Active
                                </span>
                              ) : u.access_status === 'pending' ? (
                                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold text-[11px]">
                                  <Clock className="w-3 h-3" /> Pending Approval
                                </span>
                              ) : isExpired ? (
                                <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-bold text-[11px]">
                                  <Clock className="w-3 h-3" /> Expired
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full font-bold text-[11px]">
                                  <XCircle className="w-3 h-3" /> Revoked
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-stone-700">
                              {u.access_expires_at ? (
                                <div>
                                  <span className={`font-medium ${isExpired ? 'text-rose-600 font-bold' : ''}`}>
                                    {new Date(u.access_expires_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-emerald-700 font-semibold">No Expiry (Lifetime)</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-stone-500 text-[11px]">
                              {u.last_sign_in_at
                                ? new Date(u.last_sign_in_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
                                : 'Never'}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Approve button if pending */}
                                {u.access_status === 'pending' && (
                                  <button
                                    onClick={() => handleUpdateAccess(u.id, 'active', { add_days: 90 })}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors"
                                  >
                                    Approve (3 Mo)
                                  </button>
                                )}

                                {/* Expiry Management Modal Trigger */}
                                <button
                                  onClick={() => setSelectedUserForExpiry(u)}
                                  className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200 transition-colors"
                                >
                                  Set Expiry
                                </button>

                                {/* Revoke / Activate */}
                                {u.access_status === 'active' ? (
                                  <button
                                    onClick={() => handleUpdateAccess(u.id, 'revoked')}
                                    disabled={isAdminAccount}
                                    title={isAdminAccount ? 'Admin accounts cannot be revoked' : 'Revoke study access'}
                                    className="px-2 py-1 rounded-lg text-rose-700 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed font-semibold"
                                  >
                                    Revoke
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUpdateAccess(u.id, 'active')}
                                    className="px-2 py-1 rounded-lg text-emerald-700 hover:bg-emerald-50 font-semibold"
                                  >
                                    Activate
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Set Expiry Dialog */}
            {selectedUserForExpiry && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
                  <h3 className="font-bold text-stone-900 text-base">
                    Set Expiry: {selectedUserForExpiry.name}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Choose an extension preset or set lifetime access.
                  </p>

                  <div className="space-y-2">
                    <button
                      onClick={() => handleUpdateAccess(selectedUserForExpiry.id, 'active', { add_days: 30 })}
                      className="w-full py-2 px-3 text-xs font-bold rounded-xl border border-stone-200 hover:bg-stone-50 text-left flex items-center justify-between"
                    >
                      <span>+1 Month (30 Days)</span>
                      <Calendar className="w-4 h-4 text-stone-400" />
                    </button>
                    <button
                      onClick={() => handleUpdateAccess(selectedUserForExpiry.id, 'active', { add_days: 90 })}
                      className="w-full py-2 px-3 text-xs font-bold rounded-xl border border-stone-200 hover:bg-stone-50 text-left flex items-center justify-between"
                    >
                      <span>+3 Months (90 Days)</span>
                      <Calendar className="w-4 h-4 text-stone-400" />
                    </button>
                    <button
                      onClick={() => handleUpdateAccess(selectedUserForExpiry.id, 'active', { add_days: 180 })}
                      className="w-full py-2 px-3 text-xs font-bold rounded-xl border border-stone-200 hover:bg-stone-50 text-left flex items-center justify-between"
                    >
                      <span>+6 Months (180 Days)</span>
                      <Calendar className="w-4 h-4 text-stone-400" />
                    </button>
                    <button
                      onClick={() => handleUpdateAccess(selectedUserForExpiry.id, 'active', { set_lifetime: true })}
                      className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-left flex items-center justify-between"
                    >
                      <span>No Expiry (Lifetime Access)</span>
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                    </button>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setSelectedUserForExpiry(null)}
                      className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: NEW USER POLICY ================= */}
        {activeTab === 'policy' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs max-w-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-stone-900 font-serif-title">
                New User Registration Access Policy
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Configure how access is assigned automatically whenever a new user registers on the gateway.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'auto_3_months',
                  title: 'Automatic 3-Month Access',
                  desc: 'New users immediately receive 90 days of study access upon registration.',
                },
                {
                  id: 'auto_1_month',
                  title: 'Automatic 1-Month Access',
                  desc: 'New users immediately receive 30 days of study access upon registration.',
                },
                {
                  id: 'approval_required',
                  title: 'Admin Approval Required',
                  desc: 'New users are created in Pending status. Access remains inactive until manually approved by an administrator in this portal.',
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  onClick={() => setPolicy(opt.id as NewUserPolicy)}
                  className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                    policy === opt.id
                      ? 'bg-amber-50/50 border-[#830e0d] ring-1 ring-[#830e0d]'
                      : 'bg-white border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="policy"
                    checked={policy === opt.id}
                    onChange={() => setPolicy(opt.id as NewUserPolicy)}
                    className="mt-1 text-[#830e0d] focus:ring-[#830e0d]"
                  />
                  <div>
                    <span className="font-bold text-sm text-stone-900 block">{opt.title}</span>
                    <span className="text-xs text-stone-500 mt-0.5 block leading-relaxed">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-stone-100">
              {policySavedMsg ? (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Policy saved successfully!
                </span>
              ) : <div />}

              <button
                onClick={handleSavePolicy}
                disabled={isSavingPolicy}
                className="px-6 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSavingPolicy ? 'Saving...' : 'Save Policy'}
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB 3: EXTENSION REQUESTS ================= */}
        {activeTab === 'extensions' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Access Extension Requests</h3>
                  <p className="text-xs text-stone-500">Review requests from students whose access has expired or is nearing expiration</p>
                </div>
                <button
                  onClick={fetchExtensions}
                  className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-200">
                    <tr>
                      <th className="px-5 py-3.5">User</th>
                      <th className="px-4 py-3.5">Requested Duration</th>
                      <th className="px-4 py-3.5">Current / Past Expiry</th>
                      <th className="px-4 py-3.5">Reason / Note</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {isLoadingExt ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-stone-400">Loading requests...</td>
                      </tr>
                    ) : extensions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-stone-400">No extension requests found.</td>
                      </tr>
                    ) : (
                      extensions.map((ext) => (
                        <tr key={ext.id} className="hover:bg-stone-50/50">
                          <td className="px-5 py-4">
                            <div className="font-bold text-stone-900">{ext.user_name}</div>
                            <div className="text-stone-500 text-[11px]">{ext.user_email}</div>
                          </td>
                          <td className="px-4 py-4 font-bold text-stone-800">
                            {ext.requested_duration}
                          </td>
                          <td className="px-4 py-4 text-stone-600">
                            {ext.current_expiry
                              ? new Date(ext.current_expiry).toLocaleDateString(undefined, { dateStyle: 'medium' })
                              : 'None'}
                          </td>
                          <td className="px-4 py-4 text-stone-600 max-w-xs whitespace-pre-wrap">
                            {ext.reason || '—'}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              ext.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : ext.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {ext.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            {ext.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleReviewExtension(ext.id, 'approve', 30)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors"
                                >
                                  +1 Mo
                                </button>
                                <button
                                  onClick={() => handleReviewExtension(ext.id, 'approve', 90)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors"
                                >
                                  +3 Mo
                                </button>
                                <button
                                  onClick={() => handleReviewExtension(ext.id, 'decline')}
                                  className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 font-bold hover:bg-rose-200 transition-colors"
                                >
                                  Decline
                                </button>
                              </div>
                            ) : (
                              <span className="text-stone-400 text-[11px]">
                                Reviewed {ext.reviewed_at ? new Date(ext.reviewed_at).toLocaleDateString() : ''}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: GATEWAY INFO BOX ================= */}
        {activeTab === 'gateway' && (
          <form onSubmit={handleSaveGatewayInfo} className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs max-w-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-stone-900 font-serif-title">
                  Gateway Information Box Editor
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  This section appears on the Gateway for both prospective students and enrolled members.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gatewayInfo.visible}
                  onChange={(e) => setGatewayInfo({ ...gatewayInfo, visible: e.target.checked })}
                  className="rounded text-[#830e0d] focus:ring-[#830e0d]"
                />
                <span className="text-xs font-bold text-stone-700">Display on Gateway</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Section Heading
              </label>
              <input
                type="text"
                value={gatewayInfo.heading}
                onChange={(e) => setGatewayInfo({ ...gatewayInfo, heading: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-[#830e0d]/20 focus:border-[#830e0d]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Main Message / Announcement
              </label>
              <textarea
                value={gatewayInfo.message}
                onChange={(e) => setGatewayInfo({ ...gatewayInfo, message: e.target.value })}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-[#830e0d]/20 focus:border-[#830e0d]"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                  WhatsApp Contact Number
                </label>
                <input
                  type="text"
                  placeholder="+92 300 0000000"
                  value={gatewayInfo.whatsapp}
                  onChange={(e) => setGatewayInfo({ ...gatewayInfo, whatsapp: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-[#830e0d]/20 focus:border-[#830e0d]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                  Support Email
                </label>
                <input
                  type="email"
                  placeholder="doctor@example.com"
                  value={gatewayInfo.email}
                  onChange={(e) => setGatewayInfo({ ...gatewayInfo, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-[#830e0d]/20 focus:border-[#830e0d]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Pricing / Enrollment Information
              </label>
              <input
                type="text"
                placeholder="e.g. Standard 3-Month NRE Comprehensive Access"
                value={gatewayInfo.pricing}
                onChange={(e) => setGatewayInfo({ ...gatewayInfo, pricing: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-[#830e0d]/20 focus:border-[#830e0d]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Additional Message / Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Group discounts available for hospital batches"
                value={gatewayInfo.additional_notes}
                onChange={(e) => setGatewayInfo({ ...gatewayInfo, additional_notes: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-[#830e0d]/20 focus:border-[#830e0d]"
              />
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-stone-100">
              {gatewaySavedMsg ? (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Saved!
                </span>
              ) : <div />}

              <button
                type="submit"
                disabled={isSavingGateway}
                className="px-6 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSavingGateway ? 'Saving...' : 'Save Gateway Info'}
              </button>
            </div>
          </form>
        )}

        {/* ================= TAB 5: NOTIFICATIONS & READ TRACKING ================= */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900 text-base">User Notifications & Read Tracking</h3>
                <p className="text-xs text-stone-500">Categories strictly: New Content, Update, Important, General</p>
              </div>

              <button
                onClick={() => setIsCreatingNotif(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#830e0d] text-white text-xs font-bold hover:bg-[#6f0c0b] transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Publish Notification</span>
              </button>
            </div>

            {/* Notifications List with Read Tracking */}
            <div className="grid gap-4">
              {isLoadingNotifs ? (
                <div className="p-8 text-center bg-white rounded-2xl border text-stone-400 text-xs">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border text-stone-400 text-xs">
                  No notifications created yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          n.category === 'New Content'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : n.category === 'Update'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : n.category === 'Important'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-stone-100 text-stone-800 border-stone-200'
                        }`}>
                          {n.category}
                        </span>
                        <h4 className="font-bold text-stone-900 text-sm">{n.title}</h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleNotif(n.id)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-colors ${
                            n.is_active
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-stone-100 text-stone-500 border-stone-200'
                          }`}
                        >
                          {n.is_active ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          onClick={() => handleDeleteNotif(n.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-wrap">
                      {n.message}
                    </p>

                    {/* Read Tracking Section */}
                    <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-700">Read Receipts:</span>
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 font-bold text-[11px]">
                          {n.read_count || 0} user{(n.read_count || 0) === 1 ? '' : 's'} opened
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedNotifForReads(selectedNotifForReads?.id === n.id ? null : n)}
                        className="text-blue-600 hover:underline text-xs font-semibold text-left sm:text-right"
                      >
                        {selectedNotifForReads?.id === n.id ? 'Hide Viewer Details ▲' : 'View User Read Timestamps ▼'}
                      </button>
                    </div>

                    {/* Expanded Read Timestamps */}
                    {selectedNotifForReads?.id === n.id && (
                      <div className="mt-3 p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2 animate-in fade-in">
                        <div className="font-bold text-xs text-stone-700">Users who opened this notification:</div>
                        {(!n.read_by_users || n.read_by_users.length === 0) ? (
                          <div className="text-xs text-stone-400 italic">No users have opened this notification yet.</div>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {n.read_by_users.map((r) => (
                              <div key={r.user_id} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-stone-200 text-xs">
                                <div>
                                  <span className="font-bold text-stone-800">{r.name}</span>
                                  <span className="text-stone-400 text-[11px] ml-1.5">({r.email})</span>
                                </div>
                                <span className="text-stone-500 text-[11px] font-medium">
                                  {new Date(r.read_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Create Notification Modal */}
            {isCreatingNotif && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                <form onSubmit={handleCreateNotification} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <h3 className="font-bold text-stone-900 text-base">New Notification</h3>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNotif(false)}
                      className="text-stone-400 hover:text-stone-600"
                    >
                      ✕
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                      Category
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['New Content', 'Update', 'Important', 'General'] as NotificationCategory[]).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewNotifCategory(cat)}
                          className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                            newNotifCategory === cat
                              ? 'bg-stone-900 text-white border-stone-900'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. New Endocrine High-Yield Pearl Added"
                      value={newNotifTitle}
                      onChange={(e) => setNewNotifTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-[#830e0d]/20 focus:border-[#830e0d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                      Message Content
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Detailed update notes for students..."
                      value={newNotifMessage}
                      onChange={(e) => setNewNotifMessage(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-[#830e0d]/20 focus:border-[#830e0d]"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingNotif(false)}
                      className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold rounded-xl bg-[#830e0d] text-white hover:bg-[#6f0c0b] transition-colors shadow-sm"
                    >
                      Publish
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
