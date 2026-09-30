import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, NewUserPolicy, GatewayInfo, ExtensionRequest, NotificationItem, NotificationCategory } from '../../types';
import { authFetch } from '../utils/api';
import { getFirestoreUsers, syncUserToFirestore } from '../firebase';

interface Props {
  onNavigateGateway: () => void;
}

interface ActivityLogItem {
  t: number;
  text: string;
}

const EXPIRING_SOON_DAYS = 14;
const DAY_MS = 864e5;

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (t: number | string | null | undefined): string => {
  if (!t) return '—';
  const x = new Date(t);
  if (isNaN(x.getTime())) return '—';
  return `${MON[x.getMonth()]} ${x.getDate()}, ${x.getFullYear()}`;
};

const fmtDT = (t: number | string | null | undefined): string => {
  if (!t) return 'Never';
  const x = new Date(t);
  if (isNaN(x.getTime())) return 'Never';
  return x.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const ago = (t: number | string | null | undefined): string => {
  if (!t) return 'Never';
  const stamp = typeof t === 'string' ? new Date(t).getTime() : t;
  const m = Math.max(0, (Date.now() - stamp) / 6e4);
  if (m < 60) return `${Math.round(m) || 1}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  const dd = Math.round(m / 1440);
  return dd < 45 ? `${dd}d ago` : fmtDate(stamp);
};

const addMonths = (baseTime: number, n: number): number => {
  const x = new Date(baseTime);
  x.setMonth(x.getMonth() + n);
  return x.getTime();
};

const IC = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 14.3c2.2.6 3.5 2.5 3.5 5.7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  key: '<circle cx="7.5" cy="15.5" r="3.5"/><path d="m10 13 9.5-9.5"/><path d="m16 7 3 3"/><path d="m13.5 9.5 2 2"/>',
  spark: '<path d="M11 3.5 12.9 8.6 18 10.5l-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/>',
  bell: '<path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  sortasc: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
  sortdesc: '<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
  checkc: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'
};

const renderIcon = (name: keyof typeof IC) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: IC[name] }}
  />
);

export const AdminPortal: React.FC<Props> = ({ onNavigateGateway }) => {
  const { user: currentAdmin } = useAuth();

  // Tabs
  type TabKey = 'overview' | 'users' | 'policy' | 'requests' | 'gateway' | 'notifs' | 'activity';
  const [tab, setTab] = useState<TabKey>('overview');

  // Backend Data
  const [users, setUsers] = useState<User[]>([]);
  const [policy, setPolicy] = useState<NewUserPolicy>('auto_3_months');
  const [extensions, setExtensions] = useState<ExtensionRequest[]>([]);
  const [gateway, setGateway] = useState<GatewayInfo>({
    visible: true,
    heading: 'Access by subscription',
    message: 'Your access is managed by Dr. Ahmar. Contact us to renew or extend.',
    whatsapp: '+92 300 0000000',
    email: 'drahmarshakoor@gmail.com',
    pricing: 'Standard 3-Month NRE Access',
    additional_notes: '',
  });
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);

  // Users Toolbar State
  const [searchQ, setSearchQ] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'default' | 'registered' | 'lastSignIn' | 'expiry'>('default');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // Sheets & Dialogs
  const [sheetContent, setSheetContent] = useState<
    | { type: 'user'; user: User }
    | { type: 'req-approve'; req: ExtensionRequest }
    | { type: 'seen'; notif: NotificationItem }
    | { type: 'edit-notif'; notif: NotificationItem }
    | { type: 'confirm-revoke'; user: User }
    | { type: 'confirm-del-notif'; notif: NotificationItem }
    | null
  >(null);

  // Pick state for period picker
  const [pick, setPick] = useState<{ act: 'grant' | 'extend'; k: string } | null>(null);
  const [customDateVal, setCustomDateVal] = useState<string>('');
  const [seenTab, setSeenTab] = useState<'seen' | 'not'>('seen');

  // Draft notification state
  const [draftTitle, setDraftTitle] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [draftCat, setDraftCat] = useState<NotificationCategory>('General');

  // Edit notification state in sheet
  const [editNotifTitle, setEditNotifTitle] = useState('');
  const [editNotifMessage, setEditNotifMessage] = useState('');
  const [editNotifCat, setEditNotifCat] = useState<NotificationCategory>('General');

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMsg(null), 2400);
  };

  const addLog = (text: string) => {
    const item: ActivityLogItem = { t: Date.now(), text };
    setActivityLog((prev) => {
      const next = [item, ...prev].slice(0, 50);
      try {
        localStorage.setItem('la_admin_activity', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Initial Data Load
  const fetchAllData = async () => {
    try {
      // 1. Users
      const emailMap = new Map<string, User>();
      try {
        const res = await authFetch('/api/admin/users');
        if (res.ok) {
          const d = await res.json();
          (d.users || []).forEach((u: User) => {
            if (u.email && !u.email.endsWith('@example.com') && u.email !== 'admin@lastattempt.com') {
              emailMap.set(u.email.toLowerCase(), u);
            }
          });
        }
      } catch (err) {
        console.warn('Backend users error:', err);
      }

      try {
        const fbUsers = await getFirestoreUsers();
        fbUsers.forEach((u: User) => {
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
        console.warn('Firestore users error:', err);
      }

      const combined = Array.from(emailMap.values()).sort((a, b) => {
        if (a.email.toLowerCase() === 'drahmarshakoor@gmail.com') return -1;
        if (b.email.toLowerCase() === 'drahmarshakoor@gmail.com') return 1;
        return (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0);
      });
      setUsers(combined);

      // 2. Policy
      try {
        const res = await authFetch('/api/admin/policy');
        if (res.ok) {
          const d = await res.json();
          if (d.policy) setPolicy(d.policy);
        }
      } catch (e) {}

      // 3. Extension Requests
      try {
        const res = await authFetch('/api/admin/extensions');
        if (res.ok) {
          const d = await res.json();
          setExtensions(d.requests || []);
        }
      } catch (e) {}

      // 4. Gateway Info
      try {
        const res = await authFetch('/api/gateway/info');
        if (res.ok) {
          const d = await res.json();
          if (d.info) setGateway(d.info);
        }
      } catch (e) {}

      // 5. Notifications
      try {
        const res = await authFetch('/api/admin/notifications');
        if (res.ok) {
          const d = await res.json();
          setNotifs(d.notifications || []);
        }
      } catch (e) {}
    } catch (err) {
      console.error('Failed loading admin data:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
    try {
      const storedLogs = localStorage.getItem('la_admin_activity');
      if (storedLogs) {
        setActivityLog(JSON.parse(storedLogs));
      } else {
        setActivityLog([
          { t: Date.now() - 3600000 * 2, text: 'Admin portal initialized' },
          { t: Date.now() - 3600000 * 24, text: 'Security and examination review rules loaded' },
        ]);
      }
    } catch (e) {}
  }, []);

  // Status and Expiry helpers
  const getUserStatus = (u: User): 'active' | 'pending' | 'revoked' | 'expired' => {
    if (u.access_status === 'pending') return 'pending';
    if (u.access_status === 'revoked') return 'revoked';
    if (u.access_expires_at) {
      const exp = new Date(u.access_expires_at).getTime();
      if (!isNaN(exp) && exp < Date.now()) return 'expired';
    }
    return 'active';
  };

  const isUserSoon = (u: User): boolean => {
    const s = getUserStatus(u);
    if (s !== 'active' || !u.access_expires_at) return false;
    const diff = new Date(u.access_expires_at).getTime() - Date.now();
    return diff > 0 && diff <= EXPIRING_SOON_DAYS * DAY_MS;
  };

  const getDaysLeft = (u: User): number | null => {
    if (!u.access_expires_at) return null;
    const exp = new Date(u.access_expires_at).getTime();
    if (isNaN(exp)) return null;
    return Math.ceil((exp - Date.now()) / DAY_MS);
  };

  const getExpiryLabel = (u: User): string => {
    const s = getUserStatus(u);
    if (u.role === 'admin') return 'No expiry';
    if (s === 'pending') return 'No access yet';
    if (s === 'revoked') return 'Access revoked';
    if (!u.access_expires_at) return 'No expiry';
    const dStr = fmtDate(u.access_expires_at);
    return s === 'expired' ? `Expired ${dStr}` : `Expires ${dStr}`;
  };

  const renderStatusPill = (u: User) => {
    const s = getUserStatus(u);
    if (s === 'active') {
      return <span className="pill ok">{renderIcon('checkc')}Active</span>;
    }
    if (s === 'pending') {
      return <span className="pill dot warn">Pending</span>;
    }
    if (s === 'expired') {
      return <span className="pill dot bad">Expired</span>;
    }
    return <span className="pill dot gray">Revoked</span>;
  };

  // Close sheet with ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sheetContent) {
        setSheetContent(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetContent]);

  // Actions
  const handleSavePick = async (targetUser: User) => {
    if (!pick) return;
    try {
      let newStatus: string = 'active';
      let addDays: number | undefined;
      let setLifetime: boolean | undefined;

      if (pick.act === 'extend') {
        const months = Number(pick.k) || 1;
        addDays = months * 30;
      } else if (pick.k === 'none') {
        setLifetime = true;
      } else if (pick.k === '1m') {
        addDays = 30;
      } else if (pick.k === '3m') {
        addDays = 90;
      } else if (pick.k === 'date') {
        if (!customDateVal) {
          showToast('Pick a future date');
          return;
        }
        const t = new Date(customDateVal + 'T23:59:59').getTime();
        if (isNaN(t) || t < Date.now()) {
          showToast('Pick a future date');
          return;
        }
        addDays = Math.max(1, Math.ceil((t - Date.now()) / DAY_MS));
      }

      const res = await authFetch(`/api/admin/users/${targetUser.id}/access`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_status: newStatus,
          add_days: addDays,
          set_lifetime: setLifetime,
        }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to update access');

      if (d.user) {
        await syncUserToFirestore({
          id: d.user.id,
          name: d.user.name,
          email: d.user.email,
          role: d.user.role,
          access_status: d.user.access_status,
          access_expires_at: d.user.access_expires_at,
        });
      }

      addLog(`Set access for ${targetUser.name} (${pick.act === 'extend' ? `+${pick.k} mo` : pick.k})`);
      showToast('Access updated');
      setPick(null);
      setSheetContent(null);
      fetchAllData();
    } catch (e: any) {
      showToast(e.message || 'Error updating access');
    }
  };

  const handleRevoke = async (targetUser: User) => {
    try {
      const res = await authFetch(`/api/admin/users/${targetUser.id}/access`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_status: 'revoked' }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to revoke access');

      if (d.user) {
        await syncUserToFirestore({
          id: d.user.id,
          name: d.user.name,
          email: d.user.email,
          role: d.user.role,
          access_status: 'revoked',
          access_expires_at: d.user.access_expires_at,
        });
      }

      addLog(`Revoked access for ${targetUser.name}`);
      showToast('Access revoked');
      setSheetContent(null);
      fetchAllData();
    } catch (e: any) {
      showToast(e.message || 'Failed to revoke access');
    }
  };

  const handleApproveRequest = async (reqId: string, days = 90) => {
    try {
      const res = await authFetch(`/api/admin/extensions/${reqId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', extend_days: days }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to approve request');

      const targetReq = extensions.find((r) => r.id === reqId);
      addLog(`Approved extension request for ${targetReq?.user_name || 'user'}`);
      showToast('Request approved');
      setSheetContent(null);
      fetchAllData();
    } catch (e: any) {
      showToast(e.message || 'Failed to approve request');
    }
  };

  const handleDeclineRequest = async (reqId: string) => {
    try {
      const res = await authFetch(`/api/admin/extensions/${reqId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to decline request');

      const targetReq = extensions.find((r) => r.id === reqId);
      addLog(`Declined extension request from ${targetReq?.user_name || 'user'}`);
      showToast('Request declined');
      fetchAllData();
    } catch (e: any) {
      showToast(e.message || 'Failed to decline request');
    }
  };

  const handlePolicyChange = async (newPolicy: NewUserPolicy) => {
    try {
      setPolicy(newPolicy);
      const res = await authFetch('/api/admin/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy: newPolicy }),
      });
      if (res.ok) {
        addLog(`Changed registration policy to ${newPolicy}`);
        showToast('Policy saved');
      }
    } catch (e) {
      showToast('Failed to save policy');
    }
  };

  const handleSaveGateway = async () => {
    try {
      const res = await authFetch('/api/admin/gateway-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gateway),
      });
      if (res.ok) {
        addLog('Updated gateway information box');
        showToast('Gateway info saved');
      }
    } catch (e) {
      showToast('Failed to save gateway info');
    }
  };

  const handlePublishNotification = async () => {
    if (!draftTitle.trim() || !draftMessage.trim()) {
      showToast('Add a title and message');
      return;
    }
    try {
      const res = await authFetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draftTitle.trim(),
          category: draftCat,
          message: draftMessage.trim(),
          is_active: true,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to create notification');

      addLog(`Created notification “${draftTitle.trim()}”`);
      showToast('Notification published');
      setDraftTitle('');
      setDraftMessage('');
      setDraftCat('General');
      fetchAllData();
    } catch (e: any) {
      showToast(e.message || 'Failed to publish');
    }
  };

  const handleToggleNotif = async (n: NotificationItem) => {
    try {
      const res = await authFetch(`/api/admin/notifications/${n.id}/toggle`, { method: 'PATCH' });
      if (res.ok) {
        addLog(`${!n.is_active ? 'Activated' : 'Deactivated'} notification “${n.title}”`);
        fetchAllData();
      }
    } catch (e) {
      showToast('Failed to toggle notification');
    }
  };

  const handleDeleteNotif = async (n: NotificationItem) => {
    try {
      const res = await authFetch(`/api/admin/notifications/${n.id}`, { method: 'DELETE' });
      if (res.ok) {
        addLog(`Deleted notification “${n.title}”`);
        showToast('Deleted');
        setSheetContent(null);
        fetchAllData();
      }
    } catch (e) {
      showToast('Failed to delete');
    }
  };

  // Filtered & Sorted Users
  const getProcessedUsers = () => {
    const q = searchQ.trim().toLowerCase();
    const list = users.filter((u) => {
      const s = getUserStatus(u);
      const isSoonMatch = isUserSoon(u);
      let ok = true;
      if (filter === 'active') ok = s === 'active';
      else if (filter === 'pending') ok = s === 'pending';
      else if (filter === 'expired') ok = s === 'expired';
      else if (filter === 'revoked') ok = s === 'revoked';
      else if (filter === 'admin') ok = u.role === 'admin';
      else if (filter === 'soon') ok = isSoonMatch;

      return ok && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    });

    if (sortKey === 'default') return list;

    const m = sortDir === 'asc' ? 1 : -1;
    return list.slice().sort((a, b) => {
      let x: any = null;
      let y: any = null;

      if (sortKey === 'registered') {
        x = a.created_at ? new Date(a.created_at).getTime() : 0;
        y = b.created_at ? new Date(b.created_at).getTime() : 0;
      } else if (sortKey === 'lastSignIn') {
        x = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : null;
        y = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : null;
      } else if (sortKey === 'expiry') {
        x = a.role === 'admin' ? null : a.access_expires_at ? new Date(a.access_expires_at).getTime() : null;
        y = b.role === 'admin' ? null : b.access_expires_at ? new Date(b.access_expires_at).getTime() : null;
      }

      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return (x - y) * m;
    });
  };

  const processedUsers = getProcessedUsers();
  const soonUsers = users.filter(isUserSoon);
  const pendingUsers = users.filter((u) => getUserStatus(u) === 'pending');
  const activeUsersCount = users.filter((u) => getUserStatus(u) === 'active').length;
  const expiredUsersCount = users.filter((u) => getUserStatus(u) === 'expired').length;
  const revokedUsersCount = users.filter((u) => getUserStatus(u) === 'revoked').length;
  const adminUsersCount = users.filter((u) => u.role === 'admin').length;
  const studentsCount = users.filter((u) => u.role !== 'admin').length;

  // Period picker result helper
  const getPickPreview = (targetUser: User) => {
    if (!pick) return 'Choose a period, then save.';
    if (pick.act === 'extend') {
      const base = targetUser.access_expires_at && new Date(targetUser.access_expires_at).getTime() > Date.now()
        ? new Date(targetUser.access_expires_at).getTime()
        : Date.now();
      const nextTime = addMonths(base, Number(pick.k));
      return `New expiry: ${fmtDate(nextTime)}`;
    }
    if (pick.k === 'none') {
      return 'Access will have no expiry.';
    }
    if (pick.k === 'date') {
      if (!customDateVal) return 'Pick a future date.';
      const t = new Date(customDateVal + 'T23:59:59').getTime();
      return isNaN(t) || t < Date.now() ? 'Pick a future date.' : `New expiry: ${fmtDate(t)}`;
    }
    const months = pick.k === '1m' ? 1 : 3;
    return `New expiry: ${fmtDate(addMonths(Date.now(), months))}`;
  };

  const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

  const TABS_CONFIG: Array<[TabKey, string, keyof typeof IC, number | null]> = [
    ['overview', 'Overview', 'grid', null],
    ['users', 'Users & Access', 'users', users.length],
    ['policy', 'New User Policy', 'key', null],
    ['requests', 'Extension Requests', 'clock', extensions.length || null],
    ['gateway', 'Gateway Info Box', 'spark', null],
    ['notifs', 'Notifications & Read Tracking', 'bell', notifs.filter((n) => n.is_active).length || null],
    ['activity', 'Activity', 'list', null],
  ];

  const FILTERS_CONFIG: Array<[string, string]> = [
    ['all', 'All'],
    ['active', 'Active'],
    ['pending', 'Pending'],
    ['expired', 'Expired'],
    ['revoked', 'Revoked'],
    ['admin', 'Admins'],
    ['soon', 'Expiring soon'],
  ];

  const SORTS_CONFIG: Array<['default' | 'registered' | 'lastSignIn' | 'expiry', string]> = [
    ['default', 'Default'],
    ['registered', 'Joining date'],
    ['lastSignIn', 'Last login'],
    ['expiry', 'Expiry date'],
  ];

  return (
    <div id="admin-portal-root" className="min-h-screen">
      <style>{`
        #admin-portal-root {
          color-scheme: inherit;
          --maroon: #8a0e0e;
          --maroon-press: #6b0909;
          --blue: #2563eb;
          --sel: var(--ink, #1c1917);
          --bg: var(--bg, #f8f4ee);
          --card: var(--card, #ffffff);
          --ink: var(--ink, #1c1917);
          --muted: var(--muted, #78716c);
          --line: var(--line, #e6e2da);
          --chip: var(--chip, #efece6);
          --ok: #15803d;
          --ok-bg: #e8f6ee;
          --ok-line: #bfe6d0;
          --warn: #8a5a00;
          --warn-bg: #fff4dc;
          --warn-line: #f1d9a0;
          --bad: #c0143c;
          --bad-bg: #fdecef;
          --bad-line: #f3c2cc;
          --gray: #57534e;
          --gray-bg: #efece6;
          --gray-line: #ddd8cf;
          --serif: 'Playfair Display', Georgia, 'Times New Roman', serif;
          --sans: 'Inter', system-ui, -apple-system, sans-serif;
          --pad-l: max(16px, env(safe-area-inset-left, 0px));
          --pad-r: max(16px, env(safe-area-inset-right, 0px));
          background: var(--bg);
          color: var(--ink);
          font-family: var(--sans);
          font-size: 16px;
          line-height: 1.45;
          -webkit-font-smoothing: antialiased;
        }

        #admin-portal-root button, #admin-portal-root input, #admin-portal-root textarea, #admin-portal-root select {
          font: inherit;
          color: inherit;
        }
        #admin-portal-root button { cursor: pointer; touch-action: manipulation; }

        /* Header */
        .top {
          background: var(--card);
          box-shadow: 0 1px 14px rgba(28,25,23,.07);
          padding: calc(12px + env(safe-area-inset-top, 0px)) var(--pad-r) 12px var(--pad-l);
          display: flex;
          align-items: center;
          gap: 10px;
          position: sticky;
          top: 0;
          z-index: 25;
          border-bottom: 1px solid var(--line);
        }
        .back {
          flex: none; display: inline-flex; align-items: center; gap: 8px; height: 42px;
          padding: 0 6px; border: 0; background: transparent; color: var(--muted); font-weight: 600; font-size: 14.5px;
        }
        .back svg { width: 18px; height: 18px; }
        .vr { flex: none; width: 1px; height: 28px; background: var(--line); }
        .brand {
          flex: none; width: 28px; height: 28px; border-radius: 8px; background: var(--maroon);
          color: #fff; display: grid; place-items: center;
        }
        .brand svg { width: 16px; height: 16px; }
        .top h1 {
          margin: 0; font-family: var(--serif); font-weight: 700; font-size: 21px; letter-spacing: -.01em;
          line-height: 1.1; white-space: nowrap; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis;
        }
        .study {
          flex: none; height: 42px; padding: 0 18px; border-radius: 999px; border: 0;
          background: var(--maroon); color: #fff; font-weight: 700; font-size: 14.5px;
          display: inline-flex; align-items: center; justify-content: center; gap: 8px; white-space: nowrap;
          text-decoration: none;
        }
        .study:active { background: var(--maroon-press); }
        .study svg { width: 18px; height: 18px; }
        .who { display: none; line-height: 1.25; margin-left: 6px; }
        .who b { display: block; font-size: 14px; }
        .who span { font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--maroon); }

        /* Tabs */
        .tabs {
          position: sticky; top: 66px; z-index: 20; background: var(--bg);
          border-bottom: 1px solid var(--line); display: flex; gap: 8px; overflow-x: auto;
          padding: 10px var(--pad-r) 10px var(--pad-l); scrollbar-width: none; overscroll-behavior-x: contain;
          -webkit-overflow-scrolling: touch;
        }
        .tabs::-webkit-scrollbar { display: none; }
        .tab {
          flex: none; height: 44px; padding: 0 18px 0 15px; border-radius: 999px; border: 1.5px solid var(--line);
          background: var(--card); font-weight: 600; font-size: 14.5px; display: inline-flex; align-items: center; gap: 9px; white-space: nowrap;
          color: var(--ink);
        }
        .tab svg { width: 18px; height: 18px; flex: none; }
        .tab[aria-selected="true"] { background: var(--sel); border-color: var(--sel); color: #fff; }

        main.view-main {
          min-width: 0; padding: 18px var(--pad-r) calc(90px + env(safe-area-inset-bottom, 0px)) var(--pad-l);
          max-width: 1400px; margin: 0 auto;
        }
        h2.sec-title { margin: 0 0 4px; font-family: var(--serif); font-weight: 700; font-size: 24px; letter-spacing: -.01em; }
        .lead { margin: 0 0 16px; color: var(--muted); font-size: 14.5px; }
        h3.sub-title { margin: 22px 0 10px; font-size: 16px; font-weight: 700; }

        /* Building blocks */
        .card { background: var(--card); border: 1px solid var(--line); border-radius: 24px; padding: 18px; margin-bottom: 14px; }
        .pill {
          display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 12px; border-radius: 999px;
          font-size: 12.5px; font-weight: 600; border: 1px solid var(--line); background: var(--chip); color: var(--ink); white-space: nowrap;
        }
        .pill svg { width: 15px; height: 15px; flex: none; }
        .pill.ok { background: var(--ok-bg); border-color: var(--ok-line); color: var(--ok); }
        .pill.warn { background: var(--warn-bg); border-color: var(--warn-line); color: var(--warn); }
        .pill.bad { background: var(--bad-bg); border-color: var(--bad-line); color: var(--bad); }
        .pill.gray { background: var(--gray-bg); border-color: var(--gray-line); color: var(--gray); }
        .pill.admin { background: var(--maroon); border-color: var(--maroon); color: #fff; }
        .pill.dot::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
        .pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }

        .btn {
          min-height: 48px; padding: 0 20px; border-radius: 999px; border: 1.5px solid var(--line); background: var(--card);
          font-weight: 600; font-size: 15px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          color: var(--ink); transition: background .15s, border-color .15s, transform .08s;
        }
        .btn:active { transform: scale(.985); background: var(--chip); }
        .btn svg { width: 18px; height: 18px; flex: none; }
        .btn.solid { background: var(--maroon); border-color: var(--maroon); color: #fff; }
        .btn.solid:active { background: var(--maroon-press); }
        .btn.danger { color: var(--bad); border-color: var(--bad-line); }
        .btn.danger:active { background: var(--bad-bg); }
        .btn[aria-pressed="true"] { background: var(--sel); border-color: var(--sel); color: #fff; }
        .btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }
        .pickinfo { margin: 14px 4px 10px; font-size: 14px; font-weight: 600; color: var(--muted); }
        .btn.small { min-height: 44px; padding: 0 16px; font-size: 14px; }
        .btn.block { width: 100%; }
        .row { display: flex; flex-wrap: wrap; gap: 8px; }
        .row.nowrap { flex-wrap: nowrap; }
        .row.nowrap > .btn { flex: none; }

        .field { margin-bottom: 14px; }
        .field label, .lab { display: block; margin: 0 0 6px 6px; font-size: 13.5px; font-weight: 600; }
        .input {
          width: 100%; min-width: 0; min-height: 50px; padding: 0 18px; border-radius: 999px;
          border: 1.5px solid var(--line); background: var(--card); font-size: 16px; color: var(--ink);
          -webkit-appearance: none; appearance: none;
        }
        textarea.input { border-radius: 22px; padding: 14px 18px; min-height: 110px; resize: vertical; line-height: 1.45; }
        .input[type="date"] { min-height: 44px; flex: 1; text-align: left; }
        .input:focus { border-color: var(--sel); outline: 3px solid rgba(138,14,14,.2); outline-offset: 0; }
        .search { position: relative; min-width: 0; }
        .search svg { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; color: var(--muted); pointer-events: none; }
        .search .input { padding-left: 46px; }
        .round { flex: none; width: 44px; height: 44px; border-radius: 50%; border: 0; background: transparent; color: var(--muted); display: grid; place-items: center; }
        .round svg { width: 20px; height: 20px; }
        .round:active { background: var(--chip); }

        .chips { display: flex; gap: 8px; overflow-x: auto; padding: 2px 0; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .chips::-webkit-scrollbar { display: none; }
        .chip { flex: none; height: 40px; padding: 0 16px; border-radius: 999px; border: 0; background: var(--chip); font-weight: 600; font-size: 14px; white-space: nowrap; color: var(--ink); }
        .chip[aria-pressed="true"] { background: var(--sel); color: #fff; }

        /* Options */
        .opts { display: flex; flex-wrap: wrap; gap: 8px; }
        .opt { position: relative; cursor: pointer; }
        .opt input { position: absolute; opacity: 0; inset: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
        .opt > span { display: inline-flex; align-items: center; height: 44px; padding: 0 16px; border-radius: 999px; border: 1.5px solid var(--line); font-weight: 600; font-size: 14px; background: var(--card); color: var(--ink); }
        .opt input:checked + span { background: var(--sel); border-color: var(--sel); color: #fff; }
        .policy { display: grid; gap: 10px; }
        .policy .opt { display: block; }
        .policy .opt > span { display: block; height: auto; padding: 14px 20px; border-radius: 22px; }
        .policy .opt small { display: block; margin-top: 2px; font-weight: 400; font-size: 13.5px; opacity: .85; }
        .policy .pill.cur { height: 22px; margin-left: 8px; background: var(--maroon); color: #fff; border-color: var(--maroon); }

        /* Switch */
        .switch { position: relative; width: 52px; height: 32px; flex: none; display: inline-block; }
        .switch input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; margin: 0; z-index: 2; }
        .switch span { position: absolute; inset: 0; border-radius: 999px; background: var(--gray-line); transition: background .15s; }
        .switch span::after { content: ""; position: absolute; top: 4px; left: 4px; width: 24px; height: 24px; border-radius: 50%; background: #fff; transition: transform .15s; }
        .switch input:checked + span { background: var(--maroon); }
        .switch input:checked + span::after { transform: translateX(20px); }

        /* Stats */
        .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 14px; }
        .stat { text-align: left; padding: 14px 20px; border-radius: 24px; border: 1px solid var(--line); background: var(--card); color: var(--ink); }
        .stat b { display: block; font-size: 30px; line-height: 1.1; letter-spacing: -.02em; }
        .stat span { font-size: 13.5px; color: var(--muted); font-weight: 500; }
        .attn { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 12px 16px 12px 12px; border-radius: 999px; border: 1.5px solid var(--line); background: var(--card); margin-bottom: 8px; font-weight: 600; color: var(--ink); }
        .attn .n { flex: none; width: 36px; height: 36px; border-radius: 50%; background: var(--chip); color: var(--ink); display: grid; place-items: center; font-weight: 700; }
        .attn .n.hot { background: var(--maroon); color: #fff; }
        .attn span.t { flex: 1; min-width: 0; }
        .attn svg { width: 18px; height: 18px; color: var(--muted); flex: none; }

        /* Toolbar */
        .toolbar { background: var(--card); border: 1px solid var(--line); border-radius: 22px; padding: 10px; display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; }
        .toolbar .search { order: 1; }
        .toolbar .refresh { order: 2; }
        .toolbar .chips { order: 3; grid-column: 1 / -1; }
        .toolbar .sortbar { order: 4; grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; }
        .sortbar label { flex: none; font-size: 12px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase; color: var(--muted); }
        .sortbar .dir { flex: none; width: 40px; height: 40px; padding: 0; border-radius: 50%; border: 0; background: var(--sel); color: #fff; display: grid; place-items: center; }
        .sortbar .dir:disabled { background: var(--chip); color: var(--muted); opacity: .6; }
        .sortbar .dir svg { width: 20px; height: 20px; }

        /* Dropdown */
        .dd { position: relative; flex: 1 1 auto; min-width: 0; max-width: 240px; }
        .ddbtn { width: 100%; height: 40px; padding: 0 12px 0 16px; border-radius: 999px; border: 0; background: var(--chip); color: var(--ink); font-weight: 600; font-size: 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px; text-align: left; }
        .ddbtn span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ddbtn svg { flex: none; width: 16px; height: 16px; color: var(--muted); transform: rotate(90deg); transition: transform .15s ease; }
        .dd.open .ddbtn { background: var(--sel); color: #fff; }
        .dd.open .ddbtn svg { color: #fff; transform: rotate(-90deg); }
        .ddmenu { position: absolute; z-index: 30; top: calc(100% + 8px); left: 0; min-width: 100%; width: max-content; max-width: 86vw; margin: 0; padding: 6px; list-style: none; background: var(--card); border: 1px solid var(--line); border-radius: 20px; box-shadow: 0 12px 32px rgba(28,25,23,.16); }
        .ddopt { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 44px; padding: 0 14px; border-radius: 14px; font-weight: 600; font-size: 14.5px; cursor: pointer; color: var(--ink); }
        .ddopt svg { width: 16px; height: 16px; opacity: 0; }
        .ddopt[aria-selected="true"] { background: var(--sel); color: #fff; }
        .ddopt[aria-selected="true"] svg { opacity: 1; }
        .ddopt:not([aria-selected="true"]):hover { background: var(--chip); }

        /* User Cards */
        .ucard { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 12px; border-radius: 24px; border: 1px solid var(--line); background: var(--card); margin-bottom: 10px; color: var(--ink); }
        .av { flex: none; width: 46px; height: 46px; border-radius: 50%; background: var(--chip); color: var(--maroon); border: 1px solid var(--line); display: grid; place-items: center; font-weight: 700; font-size: 17px; }
        .av.sm { width: 38px; height: 38px; font-size: 15px; }
        .ub { flex: 1; min-width: 0; }
        .ub b { display: block; font-size: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ub small { display: block; color: var(--muted); font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ucard > svg { flex: none; width: 18px; height: 18px; color: var(--muted); }
        .ub small.ll { font-size: 12.5px; margin-top: 1px; white-space: normal; }
        .ucard .pills { gap: 5px; margin-top: 7px; }
        .ucard .pill { height: 22px; padding: 0 8px; gap: 4px; font-size: 11.5px; font-weight: 600; }
        .ucard .pill svg { width: 12px; height: 12px; }
        .ucard .pill.dot::before { width: 6px; height: 6px; }

        /* Table */
        .tview { display: none; }
        .cview { display: block; }
        .tablecard { background: var(--card); border: 1px solid var(--line); border-radius: 24px; overflow: hidden; }
        .tscroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .utable { width: 100%; border-collapse: collapse; min-width: 880px; }
        .utable th { text-align: left; padding: 20px 18px; font-size: 11.5px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase; color: var(--muted); border-bottom: 1px solid var(--line); }
        .utable th.sortable { cursor: pointer; user-select: none; white-space: nowrap; }
        .utable th.sortable:hover { color: var(--ink); }
        .utable th.sortable.on { color: var(--ink); }
        .utable th .arr { margin-left: 4px; font-size: 12px; }
        .utable td { padding: 14px 18px; border-bottom: 1px solid var(--line); vertical-align: middle; font-size: 14px; }
        .utable tbody tr:last-child td { border-bottom: 0; }
        .utable .r { text-align: right; }
        .un { display: block; font-size: 15px; }
        .ue { display: block; color: var(--muted); font-size: 13px; overflow-wrap: anywhere; }
        .role { display: inline-block; padding: 3px 9px; border-radius: 7px; background: var(--chip); font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--gray); }
        .role.admin { background: var(--maroon); color: #fff; }
        .exp b { font-weight: 700; }
        .exp b.late { color: var(--bad); }
        .si { color: var(--muted); font-size: 13px; }
        .muted { color: var(--muted); }
        .acts { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
        .btn-soft { height: 42px; padding: 0 16px; border: 0; border-radius: 12px; background: var(--chip); font-weight: 600; font-size: 14px; white-space: nowrap; color: var(--ink); }
        .btn-soft:active { background: var(--line); }
        .btn-link { min-height: 42px; padding: 0 6px; border: 0; background: none; color: var(--bad); font-weight: 600; font-size: 14px; }

        .empty { text-align: center; color: var(--muted); padding: 30px 12px; border: 1.5px dashed var(--line); border-radius: 24px; background: var(--card); }
        .log { list-style: none; margin: 0; padding: 0; }
        .log li { display: flex; gap: 12px; padding: 12px 4px; border-bottom: 1px solid var(--line); font-size: 14.5px; }
        .log li:last-child { border-bottom: 0; }
        .log time { flex: none; width: 74px; color: var(--muted); font-size: 12.5px; padding-top: 2px; }
        .seenlist li { align-items: center; }
        .when { flex: none; color: var(--muted); font-size: 13px; }

        .nrow { display: flex; align-items: center; gap: 12px; justify-content: space-between; }
        .nmsg { color: var(--muted); font-size: 14.5px; margin: 6px 0 0; overflow-wrap: anywhere; }
        .bar { height: 8px; border-radius: 999px; background: var(--chip); overflow: hidden; margin-top: 10px; }
        .bar i { display: block; height: 100%; background: var(--maroon); border-radius: 999px; }

        .ginfo { border: 1.5px solid var(--ok-line); background: var(--ok-bg); border-radius: 24px; padding: 16px 20px; overflow-wrap: anywhere; }
        .ginfo h4 { margin: 0 0 4px; font-size: 16px; color: var(--ink); }
        .ginfo p { margin: 4px 0 0; font-size: 14.5px; color: var(--ink); }
        .ginfo .meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .ginfo .pill { white-space: normal; height: auto; min-height: 28px; padding-top: 4px; padding-bottom: 4px; }

        /* Sheet */
        .scrim {
          position: fixed; inset: 0; z-index: 50; background: rgba(28,25,23,.45);
          display: flex; align-items: flex-end; justify-content: center; overscroll-behavior: contain;
          animation: fade .18s ease; backdrop-filter: blur(2px);
        }
        .sheet {
          width: 100%; max-width: 560px; max-height: 90vh; max-height: 90dvh; overflow-y: auto;
          overscroll-behavior: contain; -webkit-overflow-scrolling: touch; background: var(--card);
          border-radius: 28px 28px 0 0;
          padding: 12px max(16px, env(safe-area-inset-right, 0px)) calc(24px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
          outline: none; animation: up .22s ease; color: var(--ink);
        }
        @keyframes fade { from { opacity: 0; } }
        @keyframes up { from { transform: translateY(28px); opacity: .6; } }
        .grab { position: sticky; top: 0; z-index: 2; height: 32px; margin: -12px -20px 2px; width: calc(100% + 40px); display: grid; place-items: center; background: var(--card); }
        .grab::before { content: ""; width: 44px; height: 5px; border-radius: 999px; background: var(--gray-line); }
        .sheet h3 { margin: 0; font-family: var(--serif); font-size: 21px; font-weight: 700; }
        .sheet .sub { margin: 2px 0 0; color: var(--muted); font-size: 14px; overflow-wrap: anywhere; }
        dl.info { display: grid; grid-template-columns: auto 1fr; gap: 0; margin: 16px 0 0; border: 1px solid var(--line); border-radius: 22px; overflow: hidden; }
        dl.info dt, dl.info dd { margin: 0; padding: 11px 16px; border-bottom: 1px solid var(--line); font-size: 14px; }
        dl.info dt { color: var(--muted); }
        dl.info dd { text-align: right; font-weight: 600; overflow-wrap: anywhere; }
        dl.info dt:nth-last-of-type(1), dl.info dd:last-of-type { border-bottom: 0; }
        .sec { margin-top: 18px; }
        .protect { margin-top: 16px; padding: 14px 20px; border-radius: 22px; background: var(--chip); font-size: 14px; }
        .seg { display: flex; gap: 6px; padding: 4px; border-radius: 999px; background: var(--chip); margin: 16px 0 10px; }
        .seg button { flex: 1; height: 44px; border: 0; border-radius: 999px; background: transparent; font-weight: 600; font-size: 14px; color: var(--ink); }
        .seg button[aria-pressed="true"] { background: var(--sel); color: #fff; }
        .toast { position: fixed; left: 50%; bottom: calc(22px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); z-index: 60; background: var(--ink); color: #fff; padding: 12px 22px; border-radius: 999px; font-size: 14.5px; font-weight: 600; max-width: calc(100vw - 32px); text-align: center; }

        /* Desktop media queries */
        @media (min-width: 760px) { .who { display: block; } }

        @media (min-width: 900px) {
          .top { padding: 16px 20px; gap: 14px; }
          .top h1 { font-size: 24px; }
          .tabs { position: static; flex-wrap: wrap; overflow: visible; gap: 10px; padding: 24px max(16px, calc((100% - 1400px) / 2 + 16px)) 20px; }
          main.view-main { padding: 24px 16px 60px; }
          .stats { grid-template-columns: repeat(3, 1fr); }
          .scrim { align-items: center; }
          .sheet { border-radius: 28px; padding-bottom: 24px; }
          .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }
          .grid2 .card { margin-bottom: 0; }
          .toolbar { grid-template-columns: minmax(220px, 340px) 1fr auto; padding: 18px 20px; }
          .toolbar .chips { order: 2; grid-column: auto; justify-content: flex-end; flex-wrap: wrap; }
          .toolbar .refresh { order: 3; }
          .toolbar .sortbar { order: 4; grid-column: 1 / -1; }
          .tview { display: block; }
          .cview { display: none; }
        }

        @media (max-width: 520px) {
          .top { gap: 8px; }
          .back { width: 36px; padding: 0; justify-content: center; }
          .back .lbl { display: none; }
          .study { width: 42px; padding: 0; }
          .study .lbl { display: none; }
          .top h1 { font-size: 19px; }
        }
      `}</style>

      {/* Header */}
      <header className="top">
        <button className="back" type="button" onClick={onNavigateGateway} aria-label="Back to gateway">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="m11 18-6-6 6-6" />
          </svg>
          <span className="lbl">Gateway</span>
        </button>
        <span className="vr" aria-hidden="true"></span>
        <span className="brand" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 4 6v6c0 4.5 3.4 7.7 8 9 4.6-1.3 8-4.5 8-9V6l-8-3Z" />
          </svg>
        </span>
        <h1>Admin Access Portal</h1>
        <a href="/study" className="study" aria-label="Open study">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 6.5C10.5 5.2 8.3 4.5 5 4.5v13c3.3 0 5.5.7 7 2 1.5-1.3 3.7-2 7-2v-13c-3.3 0-5.5.7-7 2Z" />
            <path d="M12 6.5v13" />
          </svg>
          <span className="lbl">Open Study</span>
        </a>
        <div className="who">
          <b>{currentAdmin?.name || 'Dr. Ahmar Shakoor'}</b>
          <span>Administrator</span>
        </div>
      </header>

      {/* Tabs */}
      <nav className="tabs" role="tablist" aria-label="Admin sections">
        {TABS_CONFIG.map(([k, label, icon, count]) => (
          <button
            key={k}
            className="tab"
            type="button"
            role="tab"
            onClick={() => {
              setTab(k);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            aria-selected={tab === k}
          >
            {renderIcon(icon)}
            <span>{label}</span>
            {count != null ? ` (${count})` : ''}
          </button>
        ))}
      </nav>

      {/* Main View */}
      <main className="view-main">
        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div>
            <h2 className="sec-title">Overview</h2>
            <p className="lead">Who has access, and what needs your attention.</p>

            <div className="stats">
              <button className="stat" type="button" onClick={() => { setFilter('all'); setTab('users'); }}>
                <b>{users.length}</b>
                <span>Total users</span>
              </button>
              <button className="stat" type="button" onClick={() => { setFilter('active'); setTab('users'); }}>
                <b>{activeUsersCount}</b>
                <span>Active</span>
              </button>
              <button className="stat" type="button" onClick={() => { setFilter('pending'); setTab('users'); }}>
                <b>{pendingUsers.length}</b>
                <span>Pending approval</span>
              </button>
              <button className="stat" type="button" onClick={() => { setFilter('expired'); setTab('users'); }}>
                <b>{expiredUsersCount}</b>
                <span>Expired</span>
              </button>
              <button className="stat" type="button" onClick={() => { setFilter('revoked'); setTab('users'); }}>
                <b>{revokedUsersCount}</b>
                <span>Revoked</span>
              </button>
              <button className="stat" type="button" onClick={() => { setFilter('admin'); setTab('users'); }}>
                <b>{adminUsersCount}</b>
                <span>Admins</span>
              </button>
            </div>

            <div className="grid2">
              <div>
                <h3 className="sub-title" style={{ marginTop: 6 }}>Needs attention</h3>
                <button
                  className="attn"
                  type="button"
                  onClick={() => { setFilter('pending'); setTab('users'); }}
                >
                  <span className={`n ${pendingUsers.length > 0 ? 'hot' : ''}`}>{pendingUsers.length}</span>
                  <span className="t">Users waiting for approval</span>
                  {renderIcon('chev')}
                </button>

                <button
                  className="attn"
                  type="button"
                  onClick={() => setTab('requests')}
                >
                  <span className={`n ${extensions.length > 0 ? 'hot' : ''}`}>{extensions.length}</span>
                  <span className="t">Extension requests</span>
                  {renderIcon('chev')}
                </button>

                <button
                  className="attn"
                  type="button"
                  onClick={() => { setFilter('soon'); setTab('users'); }}
                >
                  <span className="n">{soonUsers.length}</span>
                  <span className="t">Expiring in {EXPIRING_SOON_DAYS} days</span>
                  {renderIcon('chev')}
                </button>

                {soonUsers.length > 0 && (
                  <>
                    <h3 className="sub-title">Expiring soon</h3>
                    {soonUsers.slice(0, 4).map((u) => (
                      <button
                        key={u.id}
                        className="ucard"
                        type="button"
                        onClick={() => {
                          setSheetContent({ type: 'user', user: u });
                          setPick(null);
                        }}
                      >
                        <span className="av">{(u.name || 'U')[0].toUpperCase()}</span>
                        <span className="ub">
                          <b>{u.name}</b>
                          <small>{u.email}</small>
                          <small className="ll">Joined: {fmtDate(u.created_at)} · Last login: {fmtDT(u.last_sign_in_at)}</small>
                          <span className="pills">
                            {renderStatusPill(u)}
                            {u.role === 'admin' && <span className="pill admin">Admin</span>}
                            <span className="pill">{getExpiryLabel(u)}</span>
                          </span>
                        </span>
                        {renderIcon('chev')}
                      </button>
                    ))}
                  </>
                )}
              </div>

              <div>
                <h3 className="sub-title" style={{ marginTop: 6 }}>Recent admin actions</h3>
                <div className="card">
                  <ul className="log">
                    {activityLog.slice(0, 6).map((l, idx) => (
                      <li key={idx}>
                        <time>{ago(l.t)}</time>
                        <span>{l.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* USERS & ACCESS TAB */}
        {tab === 'users' && (
          <div>
            <h2 className="sec-title">Users &amp; Access</h2>
            <p className="lead">Approve, revoke or change the access of anyone who has signed in.</p>

            <div className="toolbar">
              <div className="search">
                <span>{renderIcon('search')}</span>
                <input
                  className="input"
                  type="search"
                  placeholder="Search by name or email…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="chips" role="group" aria-label="Filter users">
                {FILTERS_CONFIG.map(([k, l]) => (
                  <button
                    key={k}
                    className="chip"
                    type="button"
                    onClick={() => setFilter(k)}
                    aria-pressed={filter === k}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <button
                className="round refresh"
                type="button"
                onClick={() => { fetchAllData(); showToast('Refreshed'); }}
                aria-label="Refresh"
              >
                {renderIcon('refresh')}
              </button>

              <div className="sortbar">
                <label>Sort by</label>
                <div className={`dd ${sortDropdownOpen ? 'open' : ''}`}>
                  <button
                    className="ddbtn"
                    type="button"
                    onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                  >
                    <span>{SORTS_CONFIG.find((x) => x[0] === sortKey)?.[1] || 'Default'}</span>
                    {renderIcon('chev')}
                  </button>
                  {sortDropdownOpen && (
                    <ul className="ddmenu" role="listbox">
                      {SORTS_CONFIG.map(([k, l]) => (
                        <li
                          key={k}
                          className="ddopt"
                          role="option"
                          onClick={() => {
                            setSortKey(k);
                            setSortDir(k === 'expiry' ? 'asc' : 'desc');
                            setSortDropdownOpen(false);
                          }}
                          aria-selected={sortKey === k}
                        >
                          <span>{l}</span>
                          {renderIcon('check')}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  className="dir"
                  type="button"
                  disabled={sortKey === 'default'}
                  onClick={() => setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  title={`Sort direction: ${sortDir === 'asc' ? 'Ascending' : 'Descending'} (click to reverse)`}
                  aria-label="Reverse sort direction"
                >
                  {sortDir === 'asc' ? renderIcon('sortasc') : renderIcon('sortdesc')}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              {processedUsers.length === 0 ? (
                <div className="empty">No users matched your search.</div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="tview">
                    <div className="tablecard">
                      <div className="tscroll">
                        <table className="utable">
                          <thead>
                            <tr>
                              <th>User</th>
                              <th>Role</th>
                              <th>Access status</th>
                              <th
                                className={`sortable ${sortKey === 'registered' ? 'on' : ''}`}
                                onClick={() => {
                                  if (sortKey === 'registered') setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                                  else { setSortKey('registered'); setSortDir('desc'); }
                                }}
                              >
                                Joined {sortKey === 'registered' && <span className="arr">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                              </th>
                              <th
                                className={`sortable ${sortKey === 'expiry' ? 'on' : ''}`}
                                onClick={() => {
                                  if (sortKey === 'expiry') setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                                  else { setSortKey('expiry'); setSortDir('asc'); }
                                }}
                              >
                                Expiry date {sortKey === 'expiry' && <span className="arr">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                              </th>
                              <th
                                className={`sortable ${sortKey === 'lastSignIn' ? 'on' : ''}`}
                                onClick={() => {
                                  if (sortKey === 'lastSignIn') setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                                  else { setSortKey('lastSignIn'); setSortDir('desc'); }
                                }}
                              >
                                Last sign in {sortKey === 'lastSignIn' && <span className="arr">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                              </th>
                              <th className="r">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {processedUsers.map((u) => {
                              const s = getUserStatus(u);
                              const actionLabel = s === 'pending' ? 'Approve' : s === 'revoked' || s === 'expired' ? 'Restore' : 'Set Expiry';
                              return (
                                <tr key={u.id}>
                                  <td>
                                    <b className="un">{u.name}</b>
                                    <span className="ue">{u.email}</span>
                                  </td>
                                  <td>
                                    <span className={`role ${u.role === 'admin' ? 'admin' : ''}`}>
                                      {u.role === 'admin' ? 'Admin' : 'User'}
                                    </span>
                                  </td>
                                  <td>{renderStatusPill(u)}</td>
                                  <td>{fmtDate(u.created_at)}</td>
                                  <td className="exp">
                                    {u.role === 'admin' || (!u.access_expires_at && s !== 'pending') ? (
                                      <span className="muted">No expiry</span>
                                    ) : s === 'pending' ? (
                                      <span className="muted">—</span>
                                    ) : (
                                      <b className={s === 'expired' ? 'late' : ''}>{fmtDate(u.access_expires_at)}</b>
                                    )}
                                  </td>
                                  <td className="si">{fmtDT(u.last_sign_in_at)}</td>
                                  <td className="r">
                                    {u.role === 'admin' ? (
                                      <span className="muted">Protected</span>
                                    ) : (
                                      <div className="acts">
                                        <button
                                          className="btn-soft"
                                          type="button"
                                          onClick={() => { setSheetContent({ type: 'user', user: u }); setPick(null); }}
                                        >
                                          {actionLabel}
                                        </button>
                                        {s !== 'revoked' && (
                                          <button
                                            className="btn-link"
                                            type="button"
                                            onClick={() => setSheetContent({ type: 'confirm-revoke', user: u })}
                                          >
                                            Revoke
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Cards */}
                  <div className="cview">
                    <p className="lead" style={{ marginBottom: 10 }}>
                      {processedUsers.length} user{processedUsers.length > 1 ? 's' : ''}
                    </p>
                    {processedUsers.map((u) => (
                      <button
                        key={u.id}
                        className="ucard"
                        type="button"
                        onClick={() => { setSheetContent({ type: 'user', user: u }); setPick(null); }}
                      >
                        <span className="av">{(u.name || 'U')[0].toUpperCase()}</span>
                        <span className="ub">
                          <b>{u.name}</b>
                          <small>{u.email}</small>
                          <small className="ll">
                            Joined: {fmtDate(u.created_at)} · Last login: {fmtDT(u.last_sign_in_at)}
                          </small>
                          <span className="pills">
                            {renderStatusPill(u)}
                            {u.role === 'admin' && <span className="pill admin">Admin</span>}
                            <span className="pill">{getExpiryLabel(u)}</span>
                          </span>
                        </span>
                        {renderIcon('chev')}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* EXTENSION REQUESTS TAB */}
        {tab === 'requests' && (
          <div>
            <h2 className="sec-title">Extension Requests</h2>
            <p className="lead">Users asking for more time. Choose the new period when you approve.</p>

            {extensions.length === 0 ? (
              <div className="empty">No pending requests.</div>
            ) : (
              extensions.map((r) => {
                const u = users.find((x) => x.id === r.user_id) || {
                  id: r.user_id,
                  name: r.user_name || 'Examinee',
                  email: r.user_email || '',
                  access_status: 'active',
                  access_expires_at: r.current_expiry,
                  role: 'user',
                  created_at: r.created_at,
                  auth_provider_id: 'local',
                  updated_at: r.created_at,
                  last_sign_in_at: null,
                } as User;

                return (
                  <div key={r.id} className="card">
                    <div className="nrow">
                      <div style={{ minWidth: 0 }}>
                        <b>{u.name}</b>
                        <div className="nmsg" style={{ margin: 0 }}>{u.email}</div>
                      </div>
                      {renderStatusPill(u)}
                    </div>
                    <div className="pills">
                      <span className="pill">{getExpiryLabel(u)}</span>
                      <span className="pill">Requested {ago(r.created_at)}</span>
                      <span className="pill">{r.requested_duration}</span>
                    </div>
                    {r.reason && <p className="nmsg">“{r.reason}”</p>}
                    <div className="row" style={{ marginTop: 14 }}>
                      <button
                        className="btn solid small"
                        type="button"
                        onClick={() => { setSheetContent({ type: 'req-approve', req: r }); setPick(null); }}
                      >
                        {renderIcon('check')} Approve
                      </button>
                      <button
                        className="btn small danger"
                        type="button"
                        onClick={() => handleDeclineRequest(r.id)}
                      >
                        {renderIcon('x')} Decline
                      </button>
                      <button
                        className="btn small"
                        type="button"
                        onClick={() => { setSheetContent({ type: 'user', user: u }); setPick(null); }}
                      >
                        View user
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* NEW USER POLICY TAB */}
        {tab === 'policy' && (
          <div>
            <h2 className="sec-title">New User Policy</h2>
            <p className="lead">What happens when someone signs in for the first time.</p>
            <div className="policy" role="radiogroup" aria-label="New user policy">
              <label className="opt">
                <input
                  type="radio"
                  name="policy"
                  value="auto_3_months"
                  checked={policy === 'auto_3_months'}
                  onChange={() => handlePolicyChange('auto_3_months')}
                />
                <span>
                  Automatic 3 months
                  {policy === 'auto_3_months' && <span className="pill cur">Current</span>}
                  <small>New users get 3 months as soon as they sign in.</small>
                </span>
              </label>

              <label className="opt">
                <input
                  type="radio"
                  name="policy"
                  value="auto_1_month"
                  checked={policy === 'auto_1_month'}
                  onChange={() => handlePolicyChange('auto_1_month')}
                />
                <span>
                  Automatic 1 month
                  {policy === 'auto_1_month' && <span className="pill cur">Current</span>}
                  <small>New users get 1 month as soon as they sign in.</small>
                </span>
              </label>

              <label className="opt">
                <input
                  type="radio"
                  name="policy"
                  value="approval_required"
                  checked={policy === 'approval_required'}
                  onChange={() => handlePolicyChange('approval_required')}
                />
                <span>
                  Admin approval required
                  {policy === 'approval_required' && <span className="pill cur">Current</span>}
                  <small>New users stay pending until you approve them.</small>
                </span>
              </label>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {tab === 'notifs' && (
          <div>
            <h2 className="sec-title">Notifications &amp; Read Tracking</h2>
            <p className="lead">Post updates for students and see who has read them.</p>

            <div className="card">
              <h3 className="sub-title" style={{ marginTop: 0 }}>New notification</h3>
              <div className="field">
                <label htmlFor="nc-t">Title</label>
                <input
                  className="input"
                  id="nc-t"
                  maxLength={80}
                  placeholder="What's new?"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="field">
                <label htmlFor="nc-m">Message</label>
                <textarea
                  className="input"
                  id="nc-m"
                  maxLength={400}
                  placeholder="Keep it short and clear"
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
                />
              </div>
              <div className="field">
                <span className="lab">Category</span>
                <div className="opts">
                  {(['New Content', 'Update', 'Important', 'General'] as NotificationCategory[]).map((c) => (
                    <label key={c} className="opt">
                      <input
                        type="radio"
                        name="cat-nc"
                        value={c}
                        checked={draftCat === c}
                        onChange={() => setDraftCat(c)}
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button className="btn solid block" type="button" onClick={handlePublishNotification}>
                {renderIcon('plus')} Publish notification
              </button>
            </div>

            <h3 className="sub-title">All notifications</h3>
            {notifs.length === 0 ? (
              <div className="empty">No notifications yet.</div>
            ) : (
              notifs.map((n) => {
                const s = n.read_count || (n.read_by_users ? n.read_by_users.length : 0);
                const total = studentsCount || 1;
                const pct = Math.min(100, Math.round((s / total) * 100));
                const catClass = n.category === 'New Content' ? 'ok' : n.category === 'Important' ? 'bad' : 'gray';

                return (
                  <div key={n.id} className="card">
                    <div className="nrow">
                      <div style={{ minWidth: 0 }}>
                        <span className={`pill ${catClass}`}>{n.category}</span>
                        <h4 style={{ margin: '8px 0 0', fontSize: 17, overflowWrap: 'anywhere' }}>{n.title}</h4>
                      </div>
                      <label className="switch" title={n.is_active ? 'Active' : 'Inactive'}>
                        <input
                          type="checkbox"
                          checked={n.is_active}
                          onChange={() => handleToggleNotif(n)}
                          aria-label="Active notification toggle"
                        />
                        <span></span>
                      </label>
                    </div>

                    <p className="nmsg">{n.message}</p>
                    <div className="pills">
                      <span className="pill">{fmtDate(n.created_at)}</span>
                      <span className={`pill dot ${n.is_active ? 'ok' : 'gray'}`}>
                        {n.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="pill">Seen {s} / {total}</span>
                    </div>

                    <div className="bar">
                      <i style={{ width: `${pct}%` }}></i>
                    </div>

                    <div className="row" style={{ marginTop: 14 }}>
                      <button
                        className="btn small"
                        type="button"
                        onClick={() => { setSheetContent({ type: 'seen', notif: n }); setSeenTab('seen'); }}
                      >
                        {renderIcon('eye')} Seen by
                      </button>
                      <button
                        className="btn small"
                        type="button"
                        onClick={() => {
                          setEditNotifTitle(n.title);
                          setEditNotifMessage(n.message);
                          setEditNotifCat(n.category);
                          setSheetContent({ type: 'edit-notif', notif: n });
                        }}
                      >
                        {renderIcon('edit')} Edit
                      </button>
                      <button
                        className="btn small danger"
                        type="button"
                        onClick={() => setSheetContent({ type: 'confirm-del-notif', notif: n })}
                      >
                        {renderIcon('trash')} Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* GATEWAY INFO BOX TAB */}
        {tab === 'gateway' && (
          <div>
            <h2 className="sec-title">Gateway Info Box</h2>
            <p className="lead">The info box students see on the gateway page.</p>

            <div className="grid2">
              <div className="card">
                <div className="nrow" style={{ marginBottom: 14 }}>
                  <b>Show on gateway</b>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={gateway.visible}
                      onChange={(e) => setGateway({ ...gateway, visible: e.target.checked })}
                      aria-label="Show on gateway"
                    />
                    <span></span>
                  </label>
                </div>

                <div className="field">
                  <label htmlFor="g-heading">Heading</label>
                  <input
                    className="input"
                    id="g-heading"
                    value={gateway.heading}
                    onChange={(e) => setGateway({ ...gateway, heading: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label htmlFor="g-whatsapp">WhatsApp</label>
                  <input
                    className="input"
                    id="g-whatsapp"
                    type="tel"
                    inputMode="tel"
                    value={gateway.whatsapp}
                    onChange={(e) => setGateway({ ...gateway, whatsapp: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label htmlFor="g-email">Email</label>
                  <input
                    className="input"
                    id="g-email"
                    type="email"
                    inputMode="email"
                    value={gateway.email}
                    onChange={(e) => setGateway({ ...gateway, email: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label htmlFor="g-pricing">Pricing</label>
                  <input
                    className="input"
                    id="g-pricing"
                    value={gateway.pricing}
                    onChange={(e) => setGateway({ ...gateway, pricing: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label htmlFor="g-message">Main message</label>
                  <textarea
                    className="input"
                    id="g-message"
                    value={gateway.message}
                    onChange={(e) => setGateway({ ...gateway, message: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label htmlFor="g-extra">Additional message</label>
                  <textarea
                    className="input"
                    id="g-extra"
                    value={gateway.additional_notes || ''}
                    onChange={(e) => setGateway({ ...gateway, additional_notes: e.target.value })}
                  />
                </div>

                <button className="btn solid block" type="button" onClick={handleSaveGateway}>
                  Save gateway info
                </button>
              </div>

              <div>
                <h3 className="sub-title" style={{ marginTop: 0 }}>Preview</h3>
                <div id="gprev">
                  {!gateway.visible ? (
                    <div className="empty">Hidden from students.</div>
                  ) : (
                    <div className="ginfo">
                      <h4>{gateway.heading || 'Heading'}</h4>
                      <p>{gateway.message}</p>
                      {gateway.additional_notes && <p>{gateway.additional_notes}</p>}
                      <div className="meta">
                        {gateway.pricing && <span className="pill">{gateway.pricing}</span>}
                        {gateway.whatsapp && <span className="pill">WhatsApp {gateway.whatsapp}</span>}
                        {gateway.email && <span className="pill">{gateway.email}</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVITY LOG TAB */}
        {tab === 'activity' && (
          <div>
            <h2 className="sec-title">Activity Log</h2>
            <p className="lead">A record of admin actions.</p>
            <div className="card">
              {activityLog.length === 0 ? (
                <div className="empty">Nothing yet.</div>
              ) : (
                <ul className="log">
                  {activityLog.map((l, idx) => (
                    <li key={idx}>
                      <time>{ago(l.t)}</time>
                      <span>{l.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM SHEET / MODAL DIALOGS */}
      {sheetContent && (
        <div
          className="scrim"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSheetContent(null);
          }}
        >
          <div className="sheet" role="dialog" aria-modal="true" tabIndex={-1}>
            <div className="grab" onClick={() => setSheetContent(null)}></div>

            {/* 1. USER DETAILS SHEET */}
            {sheetContent.type === 'user' && (() => {
              const u = sheetContent.user;
              const s = getUserStatus(u);
              const isAdmin = u.role === 'admin';
              const dl = getDaysLeft(u);

              return (
                <div>
                  <h3>{u.name}</h3>
                  <p className="sub">{u.email}</p>
                  <div className="pills">
                    {renderStatusPill(u)}
                    {isAdmin && <span className="pill admin">Admin</span>}
                  </div>

                  <dl className="info">
                    <dt>User ID</dt>
                    <dd>{u.id}</dd>
                    <dt>Sign-in method</dt>
                    <dd>{u.auth_provider_id === 'google' ? 'Google' : 'Local'}</dd>
                    <dt>Registered</dt>
                    <dd>{fmtDate(u.created_at)}</dd>
                    <dt>Last sign-in</dt>
                    <dd>{ago(u.last_sign_in_at)}</dd>
                    <dt>Access</dt>
                    <dd>{getExpiryLabel(u)}</dd>
                    <dt>Days remaining</dt>
                    <dd>{isAdmin || !u.access_expires_at ? '—' : s === 'expired' ? '0' : dl}</dd>
                  </dl>

                  {isAdmin ? (
                    <div className="protect">Admin accounts are protected and can't be changed here.</div>
                  ) : (
                    <>
                      <div className="sec">
                        <span className="lab">
                          {s === 'pending'
                            ? 'Approve access for'
                            : s === 'revoked' || s === 'expired'
                            ? 'Restore access for'
                            : 'Set access for'}
                        </span>
                        <div className="row">
                          <button
                            className="btn small"
                            type="button"
                            aria-pressed={pick?.act === 'grant' && pick?.k === '1m'}
                            onClick={() => setPick(pick?.act === 'grant' && pick?.k === '1m' ? null : { act: 'grant', k: '1m' })}
                          >
                            1 month
                          </button>
                          <button
                            className="btn small"
                            type="button"
                            aria-pressed={pick?.act === 'grant' && pick?.k === '3m'}
                            onClick={() => setPick(pick?.act === 'grant' && pick?.k === '3m' ? null : { act: 'grant', k: '3m' })}
                          >
                            3 months
                          </button>
                          <button
                            className="btn small"
                            type="button"
                            aria-pressed={pick?.act === 'grant' && pick?.k === 'none'}
                            onClick={() => setPick(pick?.act === 'grant' && pick?.k === 'none' ? null : { act: 'grant', k: 'none' })}
                          >
                            No expiry
                          </button>
                        </div>

                        <div className="row" style={{ marginTop: 8 }}>
                          <input
                            className="input"
                            type="date"
                            min={todayISO()}
                            value={customDateVal}
                            onChange={(e) => {
                              setCustomDateVal(e.target.value);
                              setPick(e.target.value ? { act: 'grant', k: 'date' } : null);
                            }}
                            aria-label="Or pick an expiry date"
                          />
                        </div>

                        {s === 'active' && (
                          <>
                            <span className="lab" style={{ marginTop: 14 }}>Or extend current access</span>
                            <div className="row">
                              <button
                                className="btn small"
                                type="button"
                                aria-pressed={pick?.act === 'extend' && pick?.k === '1'}
                                onClick={() => setPick(pick?.act === 'extend' && pick?.k === '1' ? null : { act: 'extend', k: '1' })}
                              >
                                +1 month
                              </button>
                              <button
                                className="btn small"
                                type="button"
                                aria-pressed={pick?.act === 'extend' && pick?.k === '3'}
                                onClick={() => setPick(pick?.act === 'extend' && pick?.k === '3' ? null : { act: 'extend', k: '3' })}
                              >
                                +3 months
                              </button>
                            </div>
                          </>
                        )}

                        <p className="pickinfo" aria-live="polite">
                          {getPickPreview(u)}
                        </p>
                        <button
                          className="btn solid block"
                          type="button"
                          disabled={!pick}
                          onClick={() => handleSavePick(u)}
                        >
                          Save changes
                        </button>
                      </div>

                      {s !== 'revoked' && (
                        <div className="sec">
                          <button
                            className="btn danger block"
                            type="button"
                            onClick={() => setSheetContent({ type: 'confirm-revoke', user: u })}
                          >
                            Revoke access
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  <button className="btn block" type="button" onClick={() => setSheetContent(null)} style={{ marginTop: 14 }}>
                    Close
                  </button>
                </div>
              );
            })()}

            {/* 2. APPROVE EXTENSION REQUEST SHEET */}
            {sheetContent.type === 'req-approve' && (() => {
              const r = sheetContent.req;
              const u = users.find((x) => x.id === r.user_id) || ({ id: r.user_id, name: r.user_name || 'Examinee' } as User);

              return (
                <div>
                  <h3>Approve extension</h3>
                  <p className="sub">{u.name} · {r.requested_duration}</p>

                  <div className="sec">
                    <span className="lab">Choose new access duration</span>
                    <div className="row">
                      <button
                        className="btn small solid"
                        type="button"
                        onClick={() => handleApproveRequest(r.id, 30)}
                      >
                        Approve for 1 month
                      </button>
                      <button
                        className="btn small solid"
                        type="button"
                        onClick={() => handleApproveRequest(r.id, 90)}
                      >
                        Approve for 3 months
                      </button>
                    </div>
                  </div>

                  <button className="btn block" type="button" onClick={() => setSheetContent(null)} style={{ marginTop: 14 }}>
                    Cancel
                  </button>
                </div>
              );
            })()}

            {/* 3. SEEN BY SHEET */}
            {sheetContent.type === 'seen' && (() => {
              const n = sheetContent.notif;
              const readers = n.read_by_users || [];
              const readerIds = new Set(readers.map((x) => x.user_id));
              const nonReaders = users.filter((u) => u.role !== 'admin' && !readerIds.has(u.id));

              return (
                <div>
                  <h3>{n.title}</h3>
                  <p className="sub">Seen by {readers.length} of {studentsCount} examinees</p>

                  <div className="seg">
                    <button
                      type="button"
                      aria-pressed={seenTab === 'seen'}
                      onClick={() => setSeenTab('seen')}
                    >
                      Seen ({readers.length})
                    </button>
                    <button
                      type="button"
                      aria-pressed={seenTab === 'not'}
                      onClick={() => setSeenTab('not')}
                    >
                      Not seen ({nonReaders.length})
                    </button>
                  </div>

                  {seenTab === 'seen' ? (
                    readers.length === 0 ? (
                      <div className="empty">No students have read this yet.</div>
                    ) : (
                      <ul className="log seenlist">
                        {readers.map((r) => (
                          <li key={r.user_id}>
                            <span className="av sm">{(r.name || 'U')[0].toUpperCase()}</span>
                            <span className="ub">
                              <b>{r.name}</b>
                              <small>{r.email}</small>
                            </span>
                            <span className="when">{ago(r.read_at)}</span>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : (
                    nonReaders.length === 0 ? (
                      <div className="empty">All active examinees have seen this!</div>
                    ) : (
                      <ul className="log seenlist">
                        {nonReaders.map((u) => (
                          <li key={u.id}>
                            <span className="av sm">{(u.name || 'U')[0].toUpperCase()}</span>
                            <span className="ub">
                              <b>{u.name}</b>
                              <small>{u.email}</small>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )
                  )}

                  <button className="btn block" type="button" onClick={() => setSheetContent(null)} style={{ marginTop: 14 }}>
                    Close
                  </button>
                </div>
              );
            })()}

            {/* 4. EDIT NOTIFICATION SHEET */}
            {sheetContent.type === 'edit-notif' && (() => {
              const n = sheetContent.notif;

              const handleSaveEditedNotif = async () => {
                if (!editNotifTitle.trim() || !editNotifMessage.trim()) {
                  showToast('Add a title and message');
                  return;
                }
                try {
                  // In backend, editing is handled by deleting and re-inserting or updating
                  await authFetch(`/api/admin/notifications/${n.id}`, { method: 'DELETE' });
                  await authFetch('/api/admin/notifications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title: editNotifTitle.trim(),
                      category: editNotifCat,
                      message: editNotifMessage.trim(),
                      is_active: n.is_active,
                    }),
                  });
                  addLog(`Edited notification “${editNotifTitle.trim()}”`);
                  showToast('Saved');
                  setSheetContent(null);
                  fetchAllData();
                } catch (e) {
                  showToast('Failed to save notification');
                }
              };

              return (
                <div>
                  <h3>Edit notification</h3>
                  <div style={{ marginTop: 14 }}>
                    <div className="field">
                      <label htmlFor="ne-t">Title</label>
                      <input
                        className="input"
                        id="ne-t"
                        maxLength={80}
                        value={editNotifTitle}
                        onChange={(e) => setEditNotifTitle(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="ne-m">Message</label>
                      <textarea
                        className="input"
                        id="ne-m"
                        maxLength={400}
                        value={editNotifMessage}
                        onChange={(e) => setEditNotifMessage(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <span className="lab">Category</span>
                      <div className="opts">
                        {(['New Content', 'Update', 'Important', 'General'] as NotificationCategory[]).map((c) => (
                          <label key={c} className="opt">
                            <input
                              type="radio"
                              name="cat-ne"
                              value={c}
                              checked={editNotifCat === c}
                              onChange={() => setEditNotifCat(c)}
                            />
                            <span>{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button className="btn solid block" type="button" onClick={handleSaveEditedNotif}>
                    Save changes
                  </button>
                  <button className="btn block" type="button" onClick={() => setSheetContent(null)} style={{ marginTop: 14 }}>
                    Cancel
                  </button>
                </div>
              );
            })()}

            {/* 5. CONFIRM REVOKE SHEET */}
            {sheetContent.type === 'confirm-revoke' && (
              <div>
                <h3>Revoke access?</h3>
                <p className="lead" style={{ marginTop: 6 }}>
                  {sheetContent.user.name} will lose access right away. You can restore it later.
                </p>
                <div className="row nowrap">
                  <button
                    className="btn danger"
                    type="button"
                    style={{ flex: 1 }}
                    onClick={() => handleRevoke(sheetContent.user)}
                  >
                    Confirm
                  </button>
                  <button
                    className="btn"
                    type="button"
                    style={{ flex: 1 }}
                    onClick={() => setSheetContent(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* 6. CONFIRM DELETE NOTIFICATION SHEET */}
            {sheetContent.type === 'confirm-del-notif' && (
              <div>
                <h3>Delete notification?</h3>
                <p className="lead" style={{ marginTop: 6 }}>
                  It will disappear for all students. This can't be undone.
                </p>
                <div className="row nowrap">
                  <button
                    className="btn danger"
                    type="button"
                    style={{ flex: 1 }}
                    onClick={() => handleDeleteNotif(sheetContent.notif)}
                  >
                    Confirm
                  </button>
                  <button
                    className="btn"
                    type="button"
                    style={{ flex: 1 }}
                    onClick={() => setSheetContent(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Toast */}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </div>
  );
};

export default AdminPortal;
