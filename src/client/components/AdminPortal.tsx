import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, NewUserPolicy, GatewayInfo, ExtensionRequest, NotificationItem, NotificationCategory } from '../../types';
import {
  Users, Shield, Key, Clock, Sparkles, Bell, ArrowLeft, BookOpen, CheckCircle2,
  AlertTriangle, Search, Eye, Plus, Trash2, Lock, RefreshCw, LayoutGrid, Activity, Check,
  ChevronRight, ChevronDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { authFetch } from '../utils/api';
import { getFirestoreUsers, syncUserToFirestore } from '../firebase';

interface Props {
  onNavigateGateway: () => void;
}

export const AdminPortal: React.FC<Props> = ({ onNavigateGateway }) => {
  const { user: currentAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'policy' | 'extensions' | 'gateway' | 'notifications' | 'activity'>('users');

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'pending' | 'revoked' | 'expired' | 'admin' | 'soon'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'created_at' | 'last_sign_in_at' | 'access_expires_at'>('default');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [expiryChoice, setExpiryChoice] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [activityLog, setActivityLog] = useState<{ id: number; at: Date; text: string }[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserForExpiry, setSelectedUserForExpiry] = useState<User | null>(null);

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

  const logActivity = (text: string) => setActivityLog((items) => [{ id: Date.now() + Math.random(), at: new Date(), text }, ...items]);
  const timeAgo = (value: string | Date) => {
    const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
    const mins = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
    return `${Math.round(mins / 1440)}d ago`;
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
      logActivity(`Updated access for ${data.user?.name || userId} (${newStatus}).`);
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
        logActivity('Updated the new user registration policy.');
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
      logActivity(`${action === 'approve' ? 'Approved' : 'Declined'} extension request ${extensions.find((item) => item.id === extId)?.user_name || extId}.`);
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
        logActivity('Updated the gateway information box.');
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
      logActivity(`Published notification “${newNotifTitle.trim()}”.`);
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
        logActivity(`${notifications.find((item) => item.id === notifId)?.is_active ? 'Updated' : 'Changed'} notification status.`);
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
        logActivity(`Deleted notification “${notifications.find((item) => item.id === notifId)?.title || notifId}”.`);
        showNotification('Notification deleted.');
        fetchAdminNotifications();
      }
    } catch (e: any) {
      showError(e.message);
    }
  };

  // Filtered and sorted users
  const isUserExpired = (u: User) => !!u.access_expires_at && new Date(u.access_expires_at).getTime() < Date.now();
  const isUserExpiringSoon = (u: User) => {
    if (u.access_status !== 'active' || !u.access_expires_at) return false;
    const expiry = new Date(u.access_expires_at).getTime();
    return expiry > Date.now() && expiry - Date.now() <= 14 * 86400000;
  };
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
    if (!matchesSearch) return false;
    const isExpired = isUserExpired(u);
    if (userFilter === 'all') return true;
    if (userFilter === 'active') return u.access_status === 'active' && !isExpired;
    if (userFilter === 'pending') return u.access_status === 'pending';
    if (userFilter === 'revoked') return u.access_status === 'revoked';
    if (userFilter === 'expired') return isExpired;
    if (userFilter === 'admin') return u.role === 'admin';
    if (userFilter === 'soon') return isUserExpiringSoon(u);
    return true;
  });
  const sortedFilteredUsers = [...filteredUsers].sort((a, b) => {
    if (sortBy === 'default') return 0;
    const rawA = a[sortBy];
    const rawB = b[sortBy];
    const valueA = rawA ? new Date(rawA).getTime() : null;
    const valueB = rawB ? new Date(rawB).getTime() : null;
    if (valueA == null && valueB == null) return 0;
    if (valueA == null) return 1;
    if (valueB == null) return -1;
    return (valueA - valueB) * (sortDirection === 'asc' ? 1 : -1);
  });

  return (
    <div className="admin-portal">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:wght@600;700&display=swap');
        .admin-portal { --ap-maroon:#7f0f0f; --ap-maroon-dark:#690b0b; --ap-bg:#f6f4ef; --ap-card:#fff; --ap-ink:#1c1917; --ap-muted:#78716c; --ap-line:#e6e2da; --ap-chip:#efece6; --ap-ok:#15803d; --ap-ok-bg:#e8f6ee; --ap-ok-line:#bfe6d0; --ap-warn:#8a5a00; --ap-warn-bg:#fff4dc; --ap-warn-line:#f1d9a0; --ap-bad:#c0143c; --ap-bad-bg:#fdecef; --ap-bad-line:#f3c2cc; min-height:100vh; background:var(--ap-bg); color:var(--ap-ink); font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif; font-size:15px; line-height:1.45; -webkit-font-smoothing:antialiased; overflow-x:hidden; }
        .admin-portal *, .admin-portal *::before, .admin-portal *::after { box-sizing:border-box; }
        .admin-portal button,.admin-portal input,.admin-portal textarea,.admin-portal select { font:inherit; color:inherit; }
        .admin-portal button { cursor:pointer; touch-action:manipulation; }
        .admin-portal :focus-visible { outline:3px solid #2563eb; outline-offset:2px; }
        .ap-top { position:relative; z-index:6; display:flex; align-items:center; gap:10px; padding:12px max(6px,env(safe-area-inset-right,0px)) 12px max(6px,env(safe-area-inset-left,0px)); background:#fff; box-shadow:0 1px 14px rgba(28,25,23,.07); }
        .ap-back { flex:none; display:inline-flex; align-items:center; justify-content:center; gap:8px; height:42px; padding:0 6px; border:0; background:transparent; color:var(--ap-muted); font-weight:600; font-size:14px; }
        .ap-sep { width:1px; height:28px; flex:none; background:var(--ap-line); }
        .ap-brand { width:28px; height:28px; flex:none; display:grid; place-items:center; border-radius:8px; background:#1c1917; color:#fff; }
        .ap-top h1 { flex:1; min-width:0; margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-family:'Source Serif 4',Georgia,serif; font-size:21px; line-height:1.1; letter-spacing:-.01em; }
        .ap-study { height:42px; flex:none; display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:0 18px; border:0; border-radius:999px; background:var(--ap-maroon); color:#fff!important; font-size:14px; font-weight:700; text-decoration:none; white-space:nowrap; }
        .ap-who { display:none; line-height:1.25; margin-left:6px; text-align:right; }
        .ap-who b { display:block; font-size:14px; }.ap-who span { color:#2563eb; font-size:11px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; }
        .ap-tabs { position:sticky; top:env(safe-area-inset-top,0px); z-index:5; display:flex; gap:8px; overflow-x:auto; padding:10px max(6px,env(safe-area-inset-right,0px)) 10px max(6px,env(safe-area-inset-left,0px)); border-bottom:1px solid var(--ap-line); background:var(--ap-bg); scrollbar-width:none; overscroll-behavior-x:contain; -webkit-overflow-scrolling:touch; }
        .ap-tabs::-webkit-scrollbar,.ap-chips::-webkit-scrollbar { display:none; }
        .ap-tab { flex:none; height:44px; display:inline-flex; align-items:center; gap:9px; padding:0 16px; border:1.5px solid var(--ap-line); border-radius:999px; background:#fff; font-weight:600; font-size:14px; white-space:nowrap; }
        .ap-tab[aria-selected='true'] { background:#1c1917; border-color:#1c1917; color:#fff; }
        .ap-tab-count { padding:1px 7px; border-radius:999px; background:rgba(255,255,255,.22); font-size:11px; }
        .ap-main { width:100%; max-width:1400px; min-width:0; margin:0 auto; padding:18px max(6px,env(safe-area-inset-right,0px)) calc(90px + env(safe-area-inset-bottom,0px)) max(6px,env(safe-area-inset-left,0px)); }
        .ap-main h2 { margin:0 0 4px; font-family:'Source Serif 4',Georgia,serif; font-size:24px; letter-spacing:-.01em; }
        .ap-lead { margin:0 0 16px; color:var(--ap-muted); font-size:14px; }
        .ap-main h3 { margin:0 0 10px; font-size:16px; }
        .ap-message { display:flex; align-items:flex-start; gap:10px; padding:14px 16px; margin:0 0 12px; border:1px solid; border-radius:18px; font-size:14px; }
        .ap-message.error { color:#9f1239; border-color:var(--ap-bad-line); background:var(--ap-bad-bg); }.ap-message.success { color:#166534; border-color:var(--ap-ok-line); background:var(--ap-ok-bg); }
        .ap-card { min-width:0; padding:18px; margin-bottom:14px; border:1px solid var(--ap-line); border-radius:24px; background:var(--ap-card); }
        .ap-toolbar { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:center; padding:10px; border:1px solid var(--ap-line); border-radius:22px; background:#fff; }
        .ap-search { position:relative; min-width:0; }.ap-search svg { position:absolute; top:50%; left:16px; transform:translateY(-50%); color:var(--ap-muted); pointer-events:none; }
        .ap-input { width:100%; min-width:0; min-height:50px; padding:0 16px; border:1.5px solid var(--ap-line); border-radius:999px; background:#fff; font-size:16px; appearance:none; }
        .ap-search .ap-input { padding-left:46px; }.ap-input:focus { border-color:#1c1917; outline:3px solid rgba(37,99,235,.18); }
        .ap-input[type='date'] { min-height:44px; }.ap-textarea { min-height:110px; padding:14px 16px; border-radius:20px; resize:vertical; line-height:1.45; }
        .ap-chips { grid-column:1/-1; display:flex; gap:8px; overflow-x:auto; padding:2px 0; scrollbar-width:none; -webkit-overflow-scrolling:touch; }
        .ap-chip { flex:none; height:40px; padding:0 15px; border:0; border-radius:999px; background:var(--ap-chip); font-size:14px; font-weight:600; white-space:nowrap; }
        .ap-chip[aria-pressed='true'] { background:#1c1917; color:#fff; }
        .ap-round { width:44px; height:44px; display:grid; place-items:center; border:0; border-radius:50%; background:transparent; color:var(--ap-muted); }
        .ap-user-count { margin:12px 4px 8px; color:var(--ap-muted); font-size:14px; font-weight:600; }
        .ap-card-list { display:block; }
        .ap-user-card { width:100%; display:flex; align-items:flex-start; gap:12px; padding:12px; margin:0 0 10px; border:1px solid var(--ap-line); border-radius:24px; background:#fff; text-align:left; }
        .ap-avatar { width:44px; height:44px; flex:none; display:grid; place-items:center; border:1px solid var(--ap-line); border-radius:50%; background:var(--ap-chip); color:var(--ap-maroon); font-size:16px; font-weight:700; }
        .ap-user-main { min-width:0; flex:1; }.ap-user-main b { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:16px; }.ap-user-main small { display:block; overflow-wrap:anywhere; color:var(--ap-muted); font-size:13px; }
        .ap-user-meta { margin-top:6px; color:var(--ap-muted); font-size:12px; }.ap-user-actions { display:flex; flex-wrap:wrap; gap:7px; margin-top:10px; }
        .ap-table-card { display:none; overflow:hidden; border:1px solid var(--ap-line); border-radius:24px; background:#fff; }.ap-table-scroll { overflow-x:auto; -webkit-overflow-scrolling:touch; }.ap-table { width:100%; min-width:880px; border-collapse:collapse; }.ap-table th { padding:18px 16px; border-bottom:1px solid var(--ap-line); color:var(--ap-muted); font-size:11px; font-weight:600; letter-spacing:.07em; text-align:left; text-transform:uppercase; }.ap-table td { padding:13px 16px; border-bottom:1px solid var(--ap-line); vertical-align:middle; font-size:13px; }.ap-table tr:last-child td { border-bottom:0; }.ap-table .right { text-align:right; }
        .ap-user-table-name { display:block; font-weight:700; font-size:14px; }.ap-email { display:block; color:var(--ap-muted); font-size:12px; overflow-wrap:anywhere; }
        .ap-role { display:inline-flex; padding:3px 9px; border-radius:8px; background:var(--ap-chip); color:#57534e; font-size:11px; font-weight:700; text-transform:uppercase; }.ap-role.admin { background:#1c1917; color:#fff; }
        .ap-pill { display:inline-flex; align-items:center; gap:5px; min-height:25px; padding:3px 9px; border:1px solid var(--ap-line); border-radius:999px; background:var(--ap-chip); font-size:11px; font-weight:600; white-space:nowrap; }.ap-pill.ok { color:var(--ap-ok); background:var(--ap-ok-bg); border-color:var(--ap-ok-line); }.ap-pill.warn { color:var(--ap-warn); background:var(--ap-warn-bg); border-color:var(--ap-warn-line); }.ap-pill.bad { color:var(--ap-bad); background:var(--ap-bad-bg); border-color:var(--ap-bad-line); }.ap-pill.gray { color:#57534e; background:#efece6; border-color:#ddd8cf; }.ap-pill.admin { color:#fff; background:#1c1917; border-color:#1c1917; }
        .ap-btn { min-height:44px; display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:0 15px; border:1.5px solid var(--ap-line); border-radius:999px; background:#fff; font-size:14px; font-weight:600; text-decoration:none; }.ap-btn.small { min-height:40px; padding:0 13px; font-size:13px; }.ap-btn.solid { color:#fff; background:var(--ap-maroon); border-color:var(--ap-maroon); }.ap-btn.danger { color:var(--ap-bad); border-color:var(--ap-bad-line); }.ap-btn.soft { background:var(--ap-chip); }.ap-btn:disabled { opacity:.45; cursor:not-allowed; }
        .ap-row { display:flex; flex-wrap:wrap; gap:8px; }.ap-row.end { justify-content:flex-end; }.ap-empty { padding:30px 14px; border:1.5px dashed var(--ap-line); border-radius:24px; background:#fff; color:var(--ap-muted); text-align:center; }
        .ap-field { min-width:0; margin-bottom:14px; }.ap-field label,.ap-label { display:block; margin:0 0 6px 5px; font-size:13px; font-weight:600; }.ap-field input,.ap-field textarea { width:100%; }.ap-grid2 { display:grid; gap:14px; }
        .ap-policy { display:grid; gap:10px; }.ap-option { position:relative; display:block; }.ap-option input { position:absolute; inset:0; width:100%; height:100%; margin:0; opacity:0; cursor:pointer; }.ap-option > span { display:block; padding:14px 18px; border:1.5px solid var(--ap-line); border-radius:22px; background:#fff; font-weight:600; }.ap-option input:checked + span { border-color:#1c1917; background:#1c1917; color:#fff; }.ap-option small { display:block; margin-top:3px; font-size:13px; font-weight:400; opacity:.78; }.ap-current { float:right; padding:2px 8px; border-radius:999px; background:#fff; color:#1c1917; font-size:10px; }
        .ap-switch { position:relative; width:52px; height:32px; flex:none; }.ap-switch input { position:absolute; inset:0; z-index:1; width:100%; height:100%; margin:0; opacity:0; cursor:pointer; }.ap-switch span { position:absolute; inset:0; border-radius:999px; background:#ddd8cf; transition:background .15s; }.ap-switch span:after { position:absolute; top:4px; left:4px; width:24px; height:24px; border-radius:50%; background:#fff; content:''; transition:transform .15s; }.ap-switch input:checked + span { background:#1c1917; }.ap-switch input:checked + span:after { transform:translateX(20px); }
        .ap-toolbar-head,.ap-card-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }.ap-card-head > div:first-child { min-width:0; }.ap-muted { color:var(--ap-muted); }.ap-help { color:var(--ap-muted); font-size:13px; }.ap-status { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:700; }.ap-status.active { color:var(--ap-ok); }.ap-status.pending { color:var(--ap-warn); }.ap-status.expired { color:var(--ap-bad); }.ap-status.revoked { color:#57534e; }
        .ap-progress { height:8px; margin-top:10px; overflow:hidden; border-radius:999px; background:var(--ap-chip); }.ap-progress i { display:block; height:100%; border-radius:999px; background:#1c1917; }
        .ap-preview { padding:16px 20px; border:1.5px solid var(--ap-ok-line); border-radius:24px; background:var(--ap-ok-bg); overflow-wrap:anywhere; }.ap-preview h4 { margin:0 0 4px; font-size:16px; }.ap-preview p { margin:4px 0 0; font-size:14px; }.ap-preview-meta { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
        .ap-scrim { position:fixed; inset:0; z-index:50; display:flex; align-items:flex-end; justify-content:center; padding:0; background:rgba(28,25,23,.48); overscroll-behavior:contain; }.ap-sheet { width:100%; max-width:560px; max-height:90vh; max-height:90dvh; overflow-y:auto; padding:12px 16px calc(24px + env(safe-area-inset-bottom,0px)); border-radius:28px 28px 0 0; background:#fff; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }.ap-sheet h3 { margin:0; font-family:'Source Serif 4',Georgia,serif; font-size:21px; }.ap-sheet .ap-sub { margin:2px 0 14px; color:var(--ap-muted); font-size:14px; }.ap-sheet-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:18px; }
        .ap-footer { padding:18px 0 0; border-top:1px solid #f0ede7; }.ap-toastline { color:var(--ap-ok); font-size:13px; font-weight:700; }
        @media (max-width:520px) { .ap-top { gap:8px; }.ap-back { width:36px; padding:0; }.ap-back-label,.ap-study-label { display:none; }.ap-study { width:42px; padding:0; }.ap-top h1 { font-size:19px; } }
        @media (max-width:380px) { .ap-top h1 { font-size:17px; }.ap-card { padding:14px; }.ap-main h2 { font-size:21px; } }
        @media (min-width:760px) { .ap-who { display:block; } }
        @media (max-width:899px) { .ap-top { padding-top:calc(8px + env(safe-area-inset-top,0px)); padding-bottom:8px; }.ap-tabs { padding-top:8px; padding-bottom:8px; }.ap-tab { height:40px; padding:0 13px; font-size:13.5px; }.ap-main { padding-top:12px; }.ap-main h2 { font-size:21px; }.ap-lead { margin-bottom:12px; }.ap-card { padding:14px; }.ap-user-card { padding:11px; } }
        @media (min-width:900px) { .ap-top { gap:14px; padding:16px 20px; }.ap-top h1 { font-size:24px; }.ap-tabs { position:static; flex-wrap:wrap; overflow:visible; gap:10px; padding:26px max(16px,calc((100% - 1400px)/2 + 16px)) 22px; }.ap-main { padding:26px 16px 60px; }.ap-toolbar { grid-template-columns:minmax(220px,340px) 1fr auto; padding:16px 18px; }.ap-chips { grid-column:auto; justify-content:flex-end; flex-wrap:wrap; overflow:visible; }.ap-card-list { display:none; }.ap-user-card { display:none; }.ap-table-card { display:block; }.ap-grid2 { grid-template-columns:1fr 1fr; align-items:start; }.ap-grid2 .ap-card { margin-bottom:0; }.ap-scrim { align-items:center; padding:16px; }.ap-sheet { border-radius:28px; padding-bottom:24px; }.ap-main > .ap-policy-wrap { max-width:760px; }.ap-two-col { grid-template-columns:1fr 1fr; } }
        @media (hover:hover) { .ap-back:hover { color:var(--ap-ink); }.ap-study:hover,.ap-btn.solid:hover { background:var(--ap-maroon-dark); }.ap-tab:hover,.ap-btn:hover { border-color:#1c1917; }.ap-user-card:hover { border-color:#1c1917; }.ap-chip:not([aria-pressed='true']):hover,.ap-btn.soft:hover { background:#ddd8cf; }.ap-round:hover { background:var(--ap-chip); } }
        .ap-stat-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-bottom:14px; }
        .ap-stat { min-width:0; padding:12px 14px; border:1px solid var(--ap-line); border-radius:20px; background:#fff; text-align:left; }
        .ap-stat b { display:block; font-size:25px; line-height:1.1; letter-spacing:-.02em; }.ap-stat span { display:block; margin-top:2px; color:var(--ap-muted); font-size:12px; line-height:1.25; }
        .ap-attn { width:100%; display:flex; align-items:center; gap:12px; padding:9px 14px 9px 9px; margin-bottom:7px; border:1.5px solid var(--ap-line); border-radius:999px; background:#fff; text-align:left; font-weight:600; }.ap-attn > span:nth-child(2) { flex:1; }.ap-attn svg { color:var(--ap-muted); flex:none; }.ap-attn-n { width:34px;height:34px;flex:none;display:grid;place-items:center;border-radius:50%;background:var(--ap-chip);font-weight:700; }.ap-attn-n.hot { background:var(--ap-maroon);color:#fff; }
        .ap-sortbar { grid-column:1/-1; display:flex; align-items:center; gap:9px; }.ap-sortbar label { flex:none; color:var(--ap-muted);font-size:12px;font-weight:600;letter-spacing:.07em;text-transform:uppercase; }.ap-sort-dd { position:relative;flex:1 1 auto;min-width:0;max-width:300px; }.ap-sort-ddbtn { width:100%;height:42px;padding:0 12px 0 16px;border:0;border-radius:999px;background:var(--ap-chip);font-weight:600;font-size:14px;display:flex;align-items:center;justify-content:space-between;gap:8px;text-align:left; }.ap-sort-ddbtn span { overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }.ap-sort-ddbtn svg { flex:none;color:var(--ap-muted);transition:transform .15s; }.ap-sort-dd.open .ap-sort-ddbtn { background:#1c1917;color:#fff; }.ap-sort-dd.open .ap-sort-ddbtn svg { color:#fff;transform:rotate(180deg); }.ap-sort-menu { position:absolute;z-index:20;top:calc(100% + 8px);left:0;min-width:100%;width:max-content;max-width:86vw;margin:0;padding:6px;list-style:none;border:1px solid var(--ap-line);border-radius:20px;background:#fff;box-shadow:0 12px 32px rgba(28,25,23,.16); }.ap-sort-opt { width:100%;min-height:44px;padding:0 14px;border:0;border-radius:14px;background:transparent;display:flex;align-items:center;justify-content:space-between;gap:16px;text-align:left;font-size:14px;font-weight:600; }.ap-sort-opt svg { opacity:0; }.ap-sort-opt[aria-selected='true'] { background:#1c1917;color:#fff; }.ap-sort-opt[aria-selected='true'] svg { opacity:1; }.ap-sort-dir { width:42px;height:42px;flex:none;display:grid;place-items:center;border:0;border-radius:50%;background:#1c1917;color:#fff; }.ap-sort-dir:disabled { background:var(--ap-chip);color:var(--ap-muted);opacity:.55; }
        .ap-user-card { align-items:center;cursor:pointer; }.ap-user-card:active,.ap-stat:active,.ap-attn:active { background:var(--ap-chip); }.ap-user-card .ap-user-main { text-align:left; }.ap-user-main small.ap-joined { margin-top:2px;white-space:normal; }.ap-user-chevron { flex:none;color:var(--ap-muted); }.ap-user-pills { gap:5px!important;margin-top:7px; }.ap-user-pills .ap-pill { min-height:22px;padding:1px 8px;font-size:11px; }
        .ap-table-user { display:block;padding:0;border:0;background:transparent;text-align:left; }.ap-table-user b { display:block;font-size:14px; }.ap-table-user span { display:block;color:var(--ap-muted);font-size:12px;overflow-wrap:anywhere; }
        .ap-grab { position:sticky;top:0;z-index:2;width:calc(100% + 32px);height:32px;display:grid;place-items:center;margin:-12px -16px 10px;background:#fff;touch-action:none; }.ap-grab:before { content:'';width:44px;height:5px;border-radius:999px;background:#ddd8cf; }
        .ap-info { display:grid;grid-template-columns:auto 1fr;margin:16px 0 0;border:1px solid var(--ap-line);border-radius:22px;overflow:hidden; }.ap-info dt,.ap-info dd { margin:0;padding:11px 15px;border-bottom:1px solid var(--ap-line);font-size:14px; }.ap-info dt { color:var(--ap-muted); }.ap-info dd { text-align:right;font-weight:600;overflow-wrap:anywhere; }.ap-info dt:nth-last-of-type(1),.ap-info dd:last-of-type { border-bottom:0; }
        .ap-detail-pills { margin-top:10px; }.ap-access-section { margin-top:18px; }.ap-extend-label { margin-top:16px; }.ap-date { margin-top:9px;min-height:48px!important;text-align:left; }.ap-pick-info { margin:14px 4px 10px;color:var(--ap-muted);font-size:14px;font-weight:600; }.ap-save-access { width:100%;min-height:54px;font-size:15px; }.ap-save-access:disabled { opacity:.45; }.ap-btn[aria-pressed='true'] { background:#1c1917;color:#fff;border-color:#1c1917; }.ap-protect { margin-top:16px;padding:14px 18px;border-radius:22px;background:var(--ap-chip);font-size:14px; }.ap-revoke,.ap-close-sheet { width:100%;margin-top:12px; }.ap-overview-grid { margin-top:6px; }.ap-log { list-style:none;margin:0;padding:0; }.ap-log li { display:flex;gap:12px;padding:12px 4px;border-bottom:1px solid var(--ap-line);font-size:14px; }.ap-log li:last-child { border-bottom:0; }.ap-log time { flex:none;width:70px;color:var(--ap-muted);font-size:12px;padding-top:2px; }.ap-log-empty { border:0;padding:16px 8px; }.ap-soon-card { margin-top:8px; }
        .ap-toolbar .ap-search { order:1; }.ap-toolbar .ap-refresh { order:2; }.ap-toolbar .ap-chips { order:3;grid-column:1/-1; }.ap-toolbar .ap-sortbar { order:4; }
        @media (min-width:900px) { .ap-overview-user-card { display:flex; }.ap-stat-grid { gap:10px; }.ap-stat { padding:14px 20px;border-radius:24px; }.ap-stat b { font-size:30px; }.ap-stat span { font-size:13.5px; }.ap-toolbar .ap-search { order:1; }.ap-toolbar .ap-chips { order:2;grid-column:auto;justify-content:flex-end; }.ap-toolbar .ap-refresh { order:3; }.ap-toolbar .ap-sortbar { order:4;grid-column:1/-1; }.ap-info dt,.ap-info dd { padding:11px 16px; }.ap-log-card { padding:16px 20px; } }
        @media (max-width:380px) { .ap-stat-grid { gap:6px; }.ap-stat { padding:8px 10px; }.ap-stat b { font-size:20px; }.ap-stat span { font-size:11px; }.ap-sortbar { gap:6px; }.ap-sortbar label { font-size:10px; }.ap-sort-ddbtn { padding-left:12px;font-size:13px; } }
        @media (prefers-reduced-motion:reduce) { .admin-portal *, .admin-portal *::before, .admin-portal *::after { transition:none!important; animation:none!important; scroll-behavior:auto!important; } }
      `}</style>

      <header className="ap-top">
        <button type="button" className="ap-back" onClick={onNavigateGateway} aria-label="Back to gateway"><ArrowLeft size={18} /><span className="ap-back-label">Gateway</span></button>
        <span className="ap-sep" aria-hidden="true" /><span className="ap-brand" aria-hidden="true"><Shield size={16} /></span>
        <h1>Admin Access Portal</h1>
        <a className="ap-study" href="/study" aria-label="Open study"><BookOpen size={18} /><span className="ap-study-label">Open Study</span></a>
        <div className="ap-who"><b>{currentAdmin?.name || 'Administrator'}</b><span>Administrator</span></div>
      </header>

      <nav className="ap-tabs" role="tablist" aria-label="Admin sections">
        <button type="button" role="tab" aria-selected={activeTab === 'overview'} className="ap-tab" onClick={() => setActiveTab('overview')}><LayoutGrid size={18} /> Overview</button>
        <button type="button" role="tab" aria-selected={activeTab === 'users'} className="ap-tab" onClick={() => setActiveTab('users')}><Users size={18} /> Users &amp; Access ({users.length})</button>
        <button type="button" role="tab" aria-selected={activeTab === 'policy'} className="ap-tab" onClick={() => setActiveTab('policy')}><Key size={18} /> New User Policy</button>
        <button type="button" role="tab" aria-selected={activeTab === 'extensions'} className="ap-tab" onClick={() => setActiveTab('extensions')}><Clock size={18} /> Extension Requests{extensions.filter((e) => e.status === 'pending').length > 0 && <span className="ap-tab-count">{extensions.filter((e) => e.status === 'pending').length}</span>}</button>
        <button type="button" role="tab" aria-selected={activeTab === 'gateway'} className="ap-tab" onClick={() => setActiveTab('gateway')}><Sparkles size={18} /> Gateway Info Box</button>
        <button type="button" role="tab" aria-selected={activeTab === 'notifications'} className="ap-tab" onClick={() => setActiveTab('notifications')}><Bell size={18} /> Notifications &amp; Read Tracking ({notifications.filter((n) => n.is_active).length})</button>
        <button type="button" role="tab" aria-selected={activeTab === 'activity'} className="ap-tab" onClick={() => setActiveTab('activity')}><Activity size={18} /> Activity</button>
      </nav>

      <main className="ap-main">
        {actionError && <div className="ap-message error" role="alert"><AlertTriangle size={20} /> <span>{actionError}</span></div>}
        {actionSuccess && <div className="ap-message success" role="status"><CheckCircle2 size={20} /> <span>{actionSuccess}</span></div>}

        {activeTab === 'overview' && (
          <section>
            <h2>Overview</h2>
            <p className="ap-lead">Who has access, and what needs your attention.</p>
            <div className="ap-stat-grid">
              {[
                { label: 'Total users', value: users.length, filter: 'all' as const },
                { label: 'Active', value: users.filter((u) => u.access_status === 'active' && !(u.access_expires_at && new Date(u.access_expires_at).getTime() < Date.now())).length, filter: 'active' as const },
                { label: 'Pending approval', value: users.filter((u) => u.access_status === 'pending').length, filter: 'pending' as const },
                { label: 'Expired', value: users.filter((u) => !!u.access_expires_at && new Date(u.access_expires_at).getTime() < Date.now()).length, filter: 'expired' as const },
                { label: 'Revoked', value: users.filter((u) => u.access_status === 'revoked').length, filter: 'revoked' as const },
                { label: 'Admins', value: users.filter((u) => u.role === 'admin').length, filter: 'admin' as const },
              ].map((stat) => <button key={stat.label} type="button" className="ap-stat" onClick={() => { setUserFilter(stat.filter); setActiveTab('users'); }}><b>{stat.value}</b><span>{stat.label}</span></button>)}
            </div>
            <div className="ap-grid2 ap-overview-grid">
              <div>
                <h3>Needs attention</h3>
                <button type="button" className="ap-attn" onClick={() => { setUserFilter('pending'); setActiveTab('users'); }}><span className={`ap-attn-n ${users.some((u) => u.access_status === 'pending') ? 'hot' : ''}`}>{users.filter((u) => u.access_status === 'pending').length}</span><span>Users waiting for approval</span><ChevronRight size={18} /></button>
                <button type="button" className="ap-attn" onClick={() => setActiveTab('extensions')}><span className={`ap-attn-n ${extensions.some((e) => e.status === 'pending') ? 'hot' : ''}`}>{extensions.filter((e) => e.status === 'pending').length}</span><span>Extension requests</span><ChevronRight size={18} /></button>
                <button type="button" className="ap-attn" onClick={() => { setUserFilter('soon'); setActiveTab('users'); }}><span className="ap-attn-n">{users.filter((u) => u.access_status === 'active' && u.access_expires_at && new Date(u.access_expires_at).getTime() > Date.now() && new Date(u.access_expires_at).getTime() - Date.now() <= 14 * 86400000).length}</span><span>Expiring in 14 days</span><ChevronRight size={18} /></button>
                {users.filter((u) => u.access_status === 'active' && u.access_expires_at && new Date(u.access_expires_at).getTime() > Date.now() && new Date(u.access_expires_at).getTime() - Date.now() <= 14 * 86400000).sort((a, b) => new Date(a.access_expires_at!).getTime() - new Date(b.access_expires_at!).getTime()).slice(0, 4).map((u) => <button type="button" key={u.id} className="ap-user-card ap-overview-user-card ap-soon-card" onClick={() => { setExpiryChoice(null); setExpiryDate(''); setSelectedUserForExpiry(u); }}><span className="ap-avatar">{u.name?.charAt(0)?.toUpperCase() || '?'}</span><span className="ap-user-main"><b>{u.name}</b><small>{u.email}</small><span className="ap-row" style={{ marginTop: 7 }}><span className="ap-pill warn">Expires {new Date(u.access_expires_at!).toLocaleDateString()}</span></span></span><ChevronRight size={18} /></button>)}
              </div>
              <div>
                <h3>Recent admin actions</h3>
                <div className="ap-card ap-log-card">{activityLog.length ? <ul className="ap-log">{activityLog.slice(0, 5).map((entry) => <li key={entry.id}><time>{timeAgo(entry.at)}</time><span>{entry.text}</span></li>)}</ul> : <div className="ap-empty ap-log-empty">Actions performed during this session will appear here.</div>}</div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'users' && (
          <section>
            <h2>Users &amp; Access</h2>
            <p className="ap-lead">Approve, revoke or change the access of anyone who has signed in.</p>
            <div className="ap-toolbar">
              <div className="ap-search"><Search size={20} /><input className="ap-input" type="search" inputMode="search" placeholder="Search by name or email…" aria-label="Search users" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} /></div>
              <button type="button" className="ap-round ap-refresh" title="Refresh users" aria-label="Refresh users" onClick={fetchUsers}><RefreshCw size={20} /></button>
              <div className="ap-chips" role="group" aria-label="Filter users">
                {([
                  ['all', 'All'], ['active', 'Active'], ['pending', 'Pending'], ['expired', 'Expired'], ['revoked', 'Revoked'], ['admin', 'Admins'], ['soon', 'Expiring soon'],
                ] as const).map(([key, label]) => <button key={key} type="button" className="ap-chip" aria-pressed={userFilter === key} onClick={() => setUserFilter(key)}>{label}</button>)}
              </div>
              <div className="ap-sortbar"><label>Sort by</label><div className={`ap-sort-dd ${sortMenuOpen ? 'open' : ''}`} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSortMenuOpen(false); }}><button type="button" className="ap-sort-ddbtn" aria-haspopup="listbox" aria-expanded={sortMenuOpen} onClick={() => setSortMenuOpen(!sortMenuOpen)}><span>{sortBy === 'default' ? 'Default' : sortBy === 'created_at' ? 'Joining date' : sortBy === 'last_sign_in_at' ? 'Last login' : 'Expiry date'}</span><ChevronDown size={18} /></button>{sortMenuOpen && <ul className="ap-sort-menu" role="listbox" aria-label="Sort users">{([['default', 'Default'], ['created_at', 'Joining date'], ['last_sign_in_at', 'Last login'], ['access_expires_at', 'Expiry date']] as const).map(([value, label]) => <li key={value} role="option" aria-selected={sortBy === value}><button type="button" className="ap-sort-opt" aria-selected={sortBy === value} onClick={() => { setSortBy(value); if (value !== 'default') setSortDirection(value === 'access_expires_at' ? 'asc' : 'desc'); setSortMenuOpen(false); }}>{label}<Check size={16} /></button></li>)}</ul>}</div><button type="button" className="ap-sort-dir" disabled={sortBy === 'default'} aria-label={`Sort direction ${sortDirection}`} title={`Reverse sort order (${sortDirection})`} onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}>{sortDirection === 'asc' ? <ArrowUp size={20} /> : <ArrowDown size={20} />}</button></div>
            </div>
            <div className="ap-user-count">{isLoadingUsers ? 'Loading…' : `${sortedFilteredUsers.length} users`}</div>
            {isLoadingUsers ? <div className="ap-empty">Loading users…</div> : sortedFilteredUsers.length === 0 ? <div className="ap-empty">No users matched your search.</div> : <>
              <div className="ap-table-card"><div className="ap-table-scroll"><table className="ap-table"><thead><tr><th>User</th><th>Role</th><th>Access status</th><th>Joining date</th><th>Expiry date</th><th>Last sign in</th><th className="right">Actions</th></tr></thead><tbody>
                {sortedFilteredUsers.map((u) => {
                  const isExpired = !!u.access_expires_at && new Date(u.access_expires_at).getTime() < Date.now();
                  const isAdminAccount = u.role === 'admin';
                  const statusClass = u.access_status === 'pending' ? 'warn' : isExpired ? 'bad' : u.access_status === 'active' ? 'ok' : 'gray';
                  const statusLabel = isExpired ? 'Expired' : u.access_status === 'pending' ? 'Pending' : u.access_status === 'active' ? 'Active' : 'Revoked';
                  return <tr key={u.id}>
                    <td><button type="button" className="ap-table-user" onClick={() => { setExpiryChoice(null); setExpiryDate(''); setSelectedUserForExpiry(u); }}><b>{u.name}</b><span>{u.email}</span></button>{isAdminAccount && <span className="ap-pill admin"><Lock size={12} /> Protected admin</span>}</td>
                    <td><span className={`ap-role ${isAdminAccount ? 'admin' : ''}`}>{isAdminAccount ? 'Admin' : 'User'}</span></td>
                    <td><span className={`ap-pill ${statusClass}`}>{statusLabel}</span></td>
                    <td>{u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}</td>
                    <td>{u.access_expires_at ? <span style={{ color: isExpired ? 'var(--ap-bad)' : undefined, fontWeight: 600 }}>{new Date(u.access_expires_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span> : <span className="ap-muted">{u.access_status === 'pending' ? '—' : 'No expiry'}</span>}</td>
                    <td className="ap-muted">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}</td>
                    <td className="right"><div className="ap-row end">{u.access_status === 'pending' && <button type="button" className="ap-btn small solid" onClick={() => handleUpdateAccess(u.id, 'active', { add_days: 90 })}>Approve</button>}<button type="button" className="ap-btn small soft" onClick={() => { setExpiryChoice(null); setExpiryDate(''); setSelectedUserForExpiry(u); }}>{u.access_status === 'pending' ? 'Set access' : 'Set expiry'}</button>{u.access_status === 'active' ? <button type="button" className="ap-btn small danger" disabled={isAdminAccount} title={isAdminAccount ? 'Admin accounts cannot be revoked' : 'Revoke study access'} onClick={() => handleUpdateAccess(u.id, 'revoked')}>Revoke</button> : u.access_status === 'revoked' || isExpired ? <button type="button" className="ap-btn small" onClick={() => { setExpiryChoice(null); setExpiryDate(''); setSelectedUserForExpiry(u); }}>Restore</button> : null}</div></td>
                  </tr>;
                })}
              </tbody></table></div></div>
              <div className="ap-card-list">{sortedFilteredUsers.map((u) => {
                const isExpired = !!u.access_expires_at && new Date(u.access_expires_at).getTime() < Date.now();
                const statusClass = isExpired ? 'bad' : u.access_status === 'pending' ? 'warn' : u.access_status === 'active' ? 'ok' : 'gray';
                const statusLabel = isExpired ? 'Expired' : u.access_status === 'pending' ? 'Pending' : u.access_status === 'active' ? 'Active' : 'Revoked';
                const expiryText = u.access_status === 'pending' ? 'No access yet' : u.access_status === 'revoked' ? 'Access revoked' : u.access_expires_at ? `${isExpired ? 'Expired' : 'Expires'} ${new Date(u.access_expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No expiry';
                return <button type="button" className="ap-user-card" key={u.id} onClick={() => { setExpiryChoice(null); setExpiryDate(''); setSelectedUserForExpiry(u); }}><span className="ap-avatar">{u.name?.charAt(0)?.toUpperCase() || '?'}</span><span className="ap-user-main"><b>{u.name}</b><small>{u.email}</small><small className="ap-joined">Joined: {u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'} · Last login: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}</small><span className="ap-row ap-user-pills"><span className={`ap-pill ${statusClass}`}>{statusClass === 'ok' && <CheckCircle2 size={13} />}{statusLabel}</span>{u.role === 'admin' && <span className="ap-pill admin">Admin</span>}<span className="ap-pill">{expiryText}</span></span></span><ChevronRight className="ap-user-chevron" size={18} /></button>;
              })}</div>
            </>}
          </section>
        )}

        {activeTab === 'policy' && (
          <section className="ap-policy-wrap"><h2>New User Policy</h2><p className="ap-lead">Choose what happens when a user signs in for the first time.</p><div className="ap-card"><div className="ap-policy">
            {[
              { id: 'auto_3_months', title: 'Automatic 3-month access', desc: 'New users immediately receive 90 days of study access upon registration.' },
              { id: 'auto_1_month', title: 'Automatic 1-month access', desc: 'New users immediately receive 30 days of study access upon registration.' },
              { id: 'approval_required', title: 'Admin approval required', desc: 'New users remain pending until manually approved by an administrator.' },
            ].map((opt) => <label className="ap-option" key={opt.id}><input type="radio" name="admin-new-user-policy" checked={policy === opt.id} onChange={() => setPolicy(opt.id as NewUserPolicy)} /><span>{opt.title}{policy === opt.id && <span className="ap-current">Current</span>}<small>{opt.desc}</small></span></label>)}
          </div><div className="ap-footer ap-toolbar-head"><span>{policySavedMsg ? <span className="ap-toastline"><CheckCircle2 size={16} /> Policy saved successfully</span> : <span />}</span><button type="button" className="ap-btn solid" onClick={handleSavePolicy} disabled={isSavingPolicy}>{isSavingPolicy ? 'Saving…' : 'Save policy'}</button></div></div></section>
        )}

        {activeTab === 'extensions' && (
          <section><div className="ap-toolbar-head"><div><h2>Extension Requests</h2><p className="ap-lead">Review requests from students whose access has expired or is nearing expiration.</p></div><button type="button" className="ap-round" aria-label="Refresh requests" onClick={fetchExtensions}><RefreshCw size={20} /></button></div>
            {isLoadingExt ? <div className="ap-empty">Loading requests…</div> : extensions.length === 0 ? <div className="ap-empty">No extension requests found.</div> : <div className="ap-grid2">{extensions.map((ext) => <article className="ap-card" key={ext.id}><div className="ap-card-head"><div><b>{ext.user_name}</b><div className="ap-help">{ext.user_email}</div></div><span className={`ap-pill ${ext.status === 'pending' ? 'warn' : ext.status === 'approved' ? 'ok' : 'bad'}`}>{ext.status}</span></div><div className="ap-row" style={{ marginTop: 12 }}><span className="ap-pill">Requested: {ext.requested_duration}</span><span className="ap-pill">Current expiry: {ext.current_expiry ? new Date(ext.current_expiry).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'None'}</span></div><div className="ap-help" style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{ext.reason || 'No note provided.'}</div>{ext.status === 'pending' ? <div className="ap-row" style={{ marginTop: 14 }}><button type="button" className="ap-btn small solid" onClick={() => handleReviewExtension(ext.id, 'approve', 30)}>Approve · 1 mo</button><button type="button" className="ap-btn small solid" onClick={() => handleReviewExtension(ext.id, 'approve', 90)}>Approve · 3 mo</button><button type="button" className="ap-btn small danger" onClick={() => handleReviewExtension(ext.id, 'decline')}>Decline</button></div> : <div className="ap-help" style={{ marginTop: 12 }}>Reviewed {ext.reviewed_at ? new Date(ext.reviewed_at).toLocaleDateString() : ''}</div>}</article>)}</div>}
          </section>
        )}

        {activeTab === 'gateway' && (
          <section><h2>Gateway Info Box</h2><p className="ap-lead">Manage the information shown to students on the gateway page.</p><form onSubmit={handleSaveGatewayInfo} className="ap-grid2">
            <div className="ap-card"><div className="ap-card-head" style={{ marginBottom: 16 }}><b>Gateway information</b><label className="ap-switch" title="Show on gateway"><input type="checkbox" checked={gatewayInfo.visible} onChange={(e) => setGatewayInfo({ ...gatewayInfo, visible: e.target.checked })} aria-label="Show on gateway" /><span /></label></div>
              <div className="ap-field"><label>Section heading</label><input className="ap-input" type="text" value={gatewayInfo.heading} onChange={(e) => setGatewayInfo({ ...gatewayInfo, heading: e.target.value })} /></div><div className="ap-field"><label>Main message / announcement</label><textarea className="ap-input ap-textarea" rows={3} value={gatewayInfo.message} onChange={(e) => setGatewayInfo({ ...gatewayInfo, message: e.target.value })} /></div><div className="ap-two-col" style={{ display: 'grid', gap: 12 }}><div className="ap-field"><label>WhatsApp contact number</label><input className="ap-input" type="tel" placeholder="+92 300 0000000" value={gatewayInfo.whatsapp} onChange={(e) => setGatewayInfo({ ...gatewayInfo, whatsapp: e.target.value })} /></div><div className="ap-field"><label>Support email</label><input className="ap-input" type="email" placeholder="doctor@example.com" value={gatewayInfo.email} onChange={(e) => setGatewayInfo({ ...gatewayInfo, email: e.target.value })} /></div></div><div className="ap-field"><label>Pricing / enrollment information</label><input className="ap-input" type="text" value={gatewayInfo.pricing} onChange={(e) => setGatewayInfo({ ...gatewayInfo, pricing: e.target.value })} /></div><div className="ap-field"><label>Additional message / notes</label><textarea className="ap-input ap-textarea" rows={2} value={gatewayInfo.additional_notes} onChange={(e) => setGatewayInfo({ ...gatewayInfo, additional_notes: e.target.value })} /></div>
              <div className="ap-footer ap-toolbar-head"><span>{gatewaySavedMsg ? <span className="ap-toastline"><CheckCircle2 size={16} /> Saved</span> : <span />}</span><button type="submit" className="ap-btn solid" disabled={isSavingGateway}>{isSavingGateway ? 'Saving…' : 'Save gateway info'}</button></div>
            </div><div><h3>Preview</h3>{gatewayInfo.visible ? <div className="ap-preview"><h4>{gatewayInfo.heading || 'Heading'}</h4>{gatewayInfo.message && <p>{gatewayInfo.message}</p>}{gatewayInfo.additional_notes && <p>{gatewayInfo.additional_notes}</p>}<div className="ap-preview-meta">{gatewayInfo.pricing && <span className="ap-pill">{gatewayInfo.pricing}</span>}{gatewayInfo.whatsapp && <span className="ap-pill">WhatsApp {gatewayInfo.whatsapp}</span>}{gatewayInfo.email && <span className="ap-pill">{gatewayInfo.email}</span>}</div></div> : <div className="ap-empty">Hidden from students.</div>}</div>
          </form></section>
        )}

        {activeTab === 'notifications' && (
          <section><div className="ap-toolbar-head" style={{ marginBottom: 12 }}><div><h2>Notifications &amp; Read Tracking</h2><p className="ap-lead">Publish updates and see which users have read them.</p></div><button type="button" className="ap-btn solid" onClick={() => setIsCreatingNotif(true)}><Plus size={17} /> Publish notification</button></div>
            {isLoadingNotifs ? <div className="ap-empty">Loading notifications…</div> : notifications.length === 0 ? <div className="ap-empty">No notifications created yet.</div> : <div className="ap-grid2">{notifications.map((n) => <article className="ap-card" key={n.id}><div className="ap-card-head"><div style={{ minWidth: 0 }}><span className={`ap-pill ${n.category === 'New Content' ? 'ok' : n.category === 'Important' ? 'bad' : n.category === 'Update' ? 'warn' : 'gray'}`}>{n.category}</span><h3 style={{ margin: '8px 0 0', overflowWrap: 'anywhere' }}>{n.title}</h3></div><button type="button" className={`ap-btn small ${n.is_active ? 'solid' : 'soft'}`} onClick={() => handleToggleNotif(n.id)}>{n.is_active ? 'Active' : 'Inactive'}</button></div><p className="ap-help" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{n.message}</p><div className="ap-row"><span className="ap-pill">{n.read_count || 0} read</span><span className="ap-pill">{n.is_active ? 'Published' : 'Inactive'}</span></div><div className="ap-progress"><i style={{ width: `${n.read_count ? Math.min(100, n.read_count) : 0}%` }} /></div><div className="ap-card-head" style={{ marginTop: 12 }}><span className="ap-help">Read receipts</span><button type="button" className="ap-btn small" onClick={() => setSelectedNotifForReads(selectedNotifForReads?.id === n.id ? null : n)}><Eye size={16} /> {selectedNotifForReads?.id === n.id ? 'Hide viewers' : `View readers (${n.read_count || 0})`}</button></div>
              {selectedNotifForReads?.id === n.id && <div className="ap-card" style={{ margin: '12px 0 0', padding: 12, borderRadius: 16, background: 'var(--ap-bg)' }}><b style={{ fontSize: 13 }}>Users who opened this notification</b>{!n.read_by_users || n.read_by_users.length === 0 ? <p className="ap-help">No users have opened this notification yet.</p> : <div style={{ maxHeight: 190, overflowY: 'auto', marginTop: 8 }}>{n.read_by_users.map((r) => <div key={r.user_id} className="ap-card-head" style={{ padding: '8px 0', borderBottom: '1px solid var(--ap-line)', fontSize: 12 }}><div><b>{r.name}</b><div className="ap-muted">{r.email}</div></div><span className="ap-muted">{new Date(r.read_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span></div>)}</div>}</div>}
              <div className="ap-row" style={{ marginTop: 12 }}><button type="button" className="ap-btn small danger" onClick={() => handleDeleteNotif(n.id)}><Trash2 size={15} /> Delete</button></div>
            </article>)}</div>}
            {isCreatingNotif && <div className="ap-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsCreatingNotif(false); }}><form onSubmit={handleCreateNotification} className="ap-sheet" role="dialog" aria-modal="true" aria-labelledby="notif-title"><div className="ap-grab" /><div className="ap-card-head"><h3 id="notif-title">New notification</h3><button type="button" className="ap-round" onClick={() => setIsCreatingNotif(false)} aria-label="Close">×</button></div><p className="ap-sub">Write an update to publish to users.</p><div className="ap-field"><label>Category</label><div className="ap-row">{(['New Content', 'Update', 'Important', 'General'] as NotificationCategory[]).map((cat) => <button key={cat} type="button" className={`ap-btn small ${newNotifCategory === cat ? 'solid' : ''}`} aria-pressed={newNotifCategory === cat} onClick={() => setNewNotifCategory(cat)}>{cat}</button>)}</div></div><div className="ap-field"><label>Title</label><input className="ap-input" type="text" required placeholder="e.g. New study notes added" value={newNotifTitle} onChange={(e) => setNewNotifTitle(e.target.value)} /></div><div className="ap-field"><label>Message</label><textarea className="ap-input ap-textarea" required rows={4} placeholder="Write the update for users…" value={newNotifMessage} onChange={(e) => setNewNotifMessage(e.target.value)} /></div><div className="ap-sheet-actions"><button type="button" className="ap-btn" onClick={() => setIsCreatingNotif(false)}>Cancel</button><button type="submit" className="ap-btn solid" disabled={!newNotifTitle.trim() || !newNotifMessage.trim()}>Publish</button></div></form></div>}
          </section>
        )}

        {activeTab === 'activity' && (
          <section><h2>Activity Log</h2><p className="ap-lead">A record of admin actions during this session.</p><div className="ap-card">{activityLog.length ? <ul className="ap-log">{activityLog.map((entry) => <li key={entry.id}><time>{timeAgo(entry.at)}</time><span>{entry.text}</span></li>)}</ul> : <div className="ap-empty">No actions have been recorded in this session yet.</div>}</div></section>
        )}

        {selectedUserForExpiry && (() => {
          const u = selectedUserForExpiry;
          const isExpired = !!u.access_expires_at && new Date(u.access_expires_at).getTime() < Date.now();
          const statusClass = isExpired ? 'bad' : u.access_status === 'pending' ? 'warn' : u.access_status === 'active' ? 'ok' : 'gray';
          const statusLabel = isExpired ? 'Expired' : u.access_status === 'pending' ? 'Pending' : u.access_status === 'active' ? 'Active' : 'Revoked';
          const userExtra = u as User & { sign_in_method?: string; provider?: string; auth_provider?: string };
          const daysRemaining = u.access_expires_at ? Math.max(0, Math.ceil((new Date(u.access_expires_at).getTime() - Date.now()) / 86400000)) : null;
          const saveSelectedAccess = () => {
            if (!expiryChoice) return;
            if (expiryChoice === 'lifetime') { handleUpdateAccess(u.id, 'active', { set_lifetime: true }); return; }
            if (expiryChoice === 'custom') {
              const target = new Date(`${expiryDate}T23:59:59`).getTime();
              const days = Math.ceil((target - Date.now()) / 86400000);
              if (!expiryDate || !Number.isFinite(days) || days < 1) { showError('Choose a future expiry date.'); return; }
              handleUpdateAccess(u.id, 'active', { add_days: days }); return;
            }
            handleUpdateAccess(u.id, 'active', { add_days: Number(expiryChoice.split(':')[1]) });
          };
          return <div className="ap-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedUserForExpiry(null); }}><section className="ap-sheet" role="dialog" aria-modal="true" aria-labelledby="user-sheet-title"><div className="ap-grab" /><h3 id="user-sheet-title">{u.name}</h3><p className="ap-sub">{u.email}</p><div className="ap-row ap-detail-pills"><span className={`ap-pill ${statusClass}`}>{statusClass === 'ok' && <CheckCircle2 size={14} />}{statusLabel}</span>{u.role === 'admin' && <span className="ap-pill admin">Admin</span>}</div>
            <dl className="ap-info"><dt>User ID</dt><dd>{u.id}</dd><dt>Sign-in method</dt><dd>{userExtra.sign_in_method || userExtra.provider || userExtra.auth_provider || '—'}</dd><dt>Registered</dt><dd>{u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</dd><dt>Last sign-in</dt><dd>{u.last_sign_in_at ? timeAgo(new Date(u.last_sign_in_at)) : 'Never'}</dd><dt>Access</dt><dd>{u.access_status === 'pending' ? 'No access yet' : u.access_status === 'revoked' ? 'Access revoked' : !u.access_expires_at ? 'No expiry' : `${isExpired ? 'Expired' : 'Expires'} ${new Date(u.access_expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}</dd><dt>Days remaining</dt><dd>{u.role === 'admin' || !u.access_expires_at ? '—' : isExpired ? '0' : daysRemaining}</dd></dl>
            {u.role === 'admin' ? <div className="ap-protect">Admin accounts are protected and can’t be changed here.</div> : <><div className="ap-access-section"><span className="ap-label">{u.access_status === 'pending' ? 'Approve access for' : u.access_status === 'revoked' || isExpired ? 'Restore access for' : 'Set access for'}</span><div className="ap-row"><button type="button" className="ap-btn" aria-pressed={expiryChoice === 'grant:30'} onClick={() => { setExpiryChoice('grant:30'); setExpiryDate(''); }}>1 month</button><button type="button" className="ap-btn" aria-pressed={expiryChoice === 'grant:90'} onClick={() => { setExpiryChoice('grant:90'); setExpiryDate(''); }}>3 months</button><button type="button" className="ap-btn" aria-pressed={expiryChoice === 'lifetime'} onClick={() => { setExpiryChoice('lifetime'); setExpiryDate(''); }}>No expiry</button></div><input className="ap-input ap-date" type="date" min={new Date().toISOString().slice(0, 10)} aria-label="Or choose a custom expiry date" value={expiryDate} onChange={(e) => { setExpiryDate(e.target.value); setExpiryChoice(e.target.value ? 'custom' : null); }} />
              {u.access_status === 'active' && <><span className="ap-label ap-extend-label">Or extend current access</span><div className="ap-row"><button type="button" className="ap-btn" aria-pressed={expiryChoice === 'extend:30'} onClick={() => { setExpiryChoice('extend:30'); setExpiryDate(''); }}>+1 month</button><button type="button" className="ap-btn" aria-pressed={expiryChoice === 'extend:90'} onClick={() => { setExpiryChoice('extend:90'); setExpiryDate(''); }}>+3 months</button></div></>}
              <p className="ap-pick-info" aria-live="polite">{expiryChoice === 'lifetime' ? 'Access will have no expiry.' : expiryChoice === 'custom' && expiryDate ? `New expiry: ${new Date(`${expiryDate}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : expiryChoice ? `New expiry period selected: ${expiryChoice.split(':')[1]} days.` : 'Choose a period, then save.'}</p><button type="button" className="ap-btn solid ap-save-access" disabled={!expiryChoice} onClick={saveSelectedAccess}>Save changes</button></div>{u.access_status !== 'revoked' && <button type="button" className="ap-btn danger ap-revoke" disabled={u.role === 'admin'} onClick={() => handleUpdateAccess(u.id, 'revoked')}>Revoke access</button>}</>}
            <button type="button" className="ap-btn ap-close-sheet" onClick={() => setSelectedUserForExpiry(null)}>Close</button></section></div>;
        })()}
      </main>
    </div>
  );
};
