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
  ExternalLink,
  List
} from 'lucide-react';
import { authFetch } from '../utils/api';
import { getFirestoreUsers, syncUserToFirestore } from '../firebase';

interface Props {
  onNavigateGateway: () => void;
}


const adminPortalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:wght@600;700&display=swap');

.admin-portal{
  --ap-maroon:#7f0f0f;
  --ap-maroon-press:#690b0b;
  --ap-blue:#2563eb;
  --ap-sel:#1c1917;
  --ap-bg:#f6f4ef;
  --ap-card:#fff;
  --ap-ink:#1c1917;
  --ap-muted:#78716c;
  --ap-line:#e6e2da;
  --ap-chip:#efece6;
  --ap-ok:#15803d;
  --ap-ok-bg:#e8f6ee;
  --ap-ok-line:#bfe6d0;
  --ap-warn:#8a5a00;
  --ap-warn-bg:#fff4dc;
  --ap-warn-line:#f1d9a0;
  --ap-bad:#c0143c;
  --ap-bad-bg:#fdecef;
  --ap-bad-line:#f3c2cc;
  font-family:"Inter",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif !important;
  background:var(--ap-bg) !important;
  color:var(--ap-ink);
  min-height:100vh;
  -webkit-font-smoothing:antialiased;
}
.admin-portal *{box-sizing:border-box}
.admin-portal button,.admin-portal input,.admin-portal textarea,.admin-portal select{font-family:inherit}
.admin-portal .admin-header{
  background:#fff !important;
  border:0 !important;
  box-shadow:0 1px 14px rgba(28,25,23,.07) !important;
  padding:12px max(16px,env(safe-area-inset-right,0px)) 12px max(16px,env(safe-area-inset-left,0px)) !important;
  min-height:66px;
}
.admin-portal .admin-header > div{
  max-width:1400px !important;
  height:42px !important;
}
.admin-portal .admin-header button:first-child{
  height:42px !important;
  padding:0 6px !important;
  color:var(--ap-muted) !important;
  font-size:14px !important;
  border-radius:999px !important;
}
.admin-portal .admin-header button:first-child:hover{color:var(--ap-ink)!important;background:var(--ap-chip)!important}
.admin-portal .admin-header .font-serif-title,
.admin-portal .admin-header span.font-serif-title{
  font-family:"Source Serif 4","Iowan Old Style",Georgia,"Times New Roman",serif !important;
  font-size:21px !important;
  letter-spacing:-.01em;
}
.admin-portal .admin-header .bg-blue-600{
  background:var(--ap-sel)!important;
  border-radius:8px!important;
}
.admin-portal .admin-header a{
  height:42px!important;
  padding:0 18px!important;
  border-radius:999px!important;
  background:var(--ap-maroon)!important;
  font-size:14px!important;
  box-shadow:none!important;
}
.admin-portal .admin-header a:hover{background:var(--ap-maroon-press)!important}
.admin-portal .admin-header .text-blue-600{color:var(--ap-blue)!important}

.admin-portal .admin-main{
  width:100%;
  max-width:1400px!important;
  padding:18px max(16px,env(safe-area-inset-right,0px)) 90px max(16px,env(safe-area-inset-left,0px))!important;
  gap:0!important;
}
.admin-portal .admin-tabs{
  position:sticky;
  top:0;
  z-index:30;
  background:var(--ap-bg);
  border-bottom:1px solid var(--ap-line)!important;
  padding:10px 0!important;
  display:flex!important;
  gap:8px!important;
  overflow-x:auto;
  flex-wrap:nowrap!important;
  scrollbar-width:none;
}
.admin-portal .admin-tabs::-webkit-scrollbar{display:none}
.admin-portal .admin-tabs button{
  flex:none;
  height:44px!important;
  padding:0 18px 0 15px!important;
  border-radius:999px!important;
  border:1.5px solid var(--ap-line)!important;
  background:#fff!important;
  color:var(--ap-ink)!important;
  font-weight:600!important;
  font-size:14px!important;
  box-shadow:none!important;
}
.admin-portal .admin-tabs button:hover{border-color:var(--ap-sel)!important}
.admin-portal .admin-tabs button[class*="bg-stone-900"]{
  background:var(--ap-sel)!important;
  border-color:var(--ap-sel)!important;
  color:#fff!important;
}
.admin-portal .admin-tabs button .bg-amber-500{background:#d97706!important}

.admin-portal .admin-users-toolbar{
  background:#fff!important;
  border:1px solid var(--ap-line)!important;
  border-radius:22px!important;
  padding:10px!important;
  box-shadow:none!important;
}
.admin-portal .admin-users-toolbar input{
  min-height:50px!important;
  padding:0 18px 0 46px!important;
  border-radius:999px!important;
  border:1.5px solid var(--ap-line)!important;
  font-size:16px!important;
}
.admin-portal .admin-users-toolbar button{
  border-radius:999px!important;
}
.admin-portal .admin-users-toolbar button[class*="bg-stone-800"]{
  background:var(--ap-sel)!important;
}
.admin-portal .admin-users-toolbar button[class*="bg-stone-100"]{
  background:var(--ap-chip)!important;
  color:var(--ap-ink)!important;
}

.admin-portal .admin-table-card{
  background:#fff!important;
  border:1px solid var(--ap-line)!important;
  border-radius:24px!important;
  box-shadow:none!important;
}
.admin-portal table{border-collapse:collapse!important}
.admin-portal table thead{background:#fff!important}
.admin-portal table th{
  padding:20px 18px!important;
  background:#fff!important;
  color:var(--ap-muted)!important;
  border-bottom:1px solid var(--ap-line)!important;
  font-size:11.5px!important;
  letter-spacing:.07em!important;
}
.admin-portal table td{
  padding:14px 18px!important;
  border-bottom:1px solid var(--ap-line)!important;
  font-size:14px!important;
}
.admin-portal table tbody tr:hover{background:#faf9f6!important}

.admin-portal .admin-card{
  background:#fff!important;
  border:1px solid var(--ap-line)!important;
  border-radius:24px!important;
  box-shadow:none!important;
  padding:18px!important;
}
.admin-portal .admin-card h3{
  font-family:"Source Serif 4","Iowan Old Style",Georgia,"Times New Roman",serif!important;
  font-size:21px!important;
  line-height:1.2;
}
.admin-portal .admin-card input:not([type="radio"]):not([type="checkbox"]),
.admin-portal .admin-card textarea{
  width:100%!important;
  min-height:50px!important;
  padding:0 18px!important;
  border-radius:999px!important;
  border:1.5px solid var(--ap-line)!important;
  background:#fff!important;
  font-size:16px!important;
}
.admin-portal .admin-card textarea{min-height:110px!important;border-radius:22px!important;padding:14px 18px!important}
.admin-portal .admin-card input:focus,.admin-portal .admin-card textarea:focus{
  border-color:var(--ap-sel)!important;
  outline:3px solid rgba(37,99,235,.2)!important;
  box-shadow:none!important;
}
.admin-portal .admin-card label{font-size:13.5px!important}
.admin-portal .admin-card > div > label:not([class*="flex"]){letter-spacing:0!important;text-transform:none!important}
.admin-portal .admin-card button{
  border-radius:999px!important;
  min-height:44px;
}
.admin-portal .admin-card button[class*="bg-stone-900"],
.admin-portal .admin-card button[class*="bg-[#830e0d]"]{
  background:var(--ap-maroon)!important;
  border-color:var(--ap-maroon)!important;
}
.admin-portal .admin-card button[class*="bg-stone-900"]:hover,
.admin-portal .admin-card button[class*="bg-[#830e0d]"]:hover{background:var(--ap-maroon-press)!important}

.admin-portal .admin-gateway-card{max-width:720px!important}
.admin-portal [class*="bg-emerald-50"]{background:var(--ap-ok-bg)!important}
.admin-portal [class*="text-emerald-700"]{color:var(--ap-ok)!important}
.admin-portal [class*="border-emerald-200"]{border-color:var(--ap-ok-line)!important}
.admin-portal [class*="bg-amber-50"]{background:var(--ap-warn-bg)!important}
.admin-portal [class*="text-amber-700"],.admin-portal [class*="text-amber-800"]{color:var(--ap-warn)!important}
.admin-portal [class*="bg-rose-50"]{background:var(--ap-bad-bg)!important}
.admin-portal [class*="text-rose-700"],.admin-portal [class*="text-rose-800"]{color:var(--ap-bad)!important}

.admin-portal .fixed.inset-0{
  background:rgba(28,25,23,.45)!important;
  backdrop-filter:blur(2px);
}
.admin-portal .fixed.inset-0 > form,
.admin-portal .fixed.inset-0 > div{
  border-radius:28px!important;
  border:1px solid var(--ap-line)!important;
  box-shadow:0 12px 40px rgba(28,25,23,.16)!important;
}
.admin-portal .fixed.inset-0 input,
.admin-portal .fixed.inset-0 textarea{
  border-radius:999px!important;
  min-height:50px!important;
  font-size:16px!important;
}
.admin-portal .fixed.inset-0 textarea{border-radius:22px!important;padding:14px 18px!important}

.admin-portal .text-stone-900{color:var(--ap-ink)!important}
.admin-portal .text-stone-800{color:#292524!important}
.admin-portal .text-stone-700{color:#44403c!important}
.admin-portal .text-stone-600{color:#57534e!important}
.admin-portal .text-stone-500,.admin-portal .text-stone-400{color:var(--ap-muted)!important}
.admin-portal .border-stone-200,.admin-portal .border-stone-100{border-color:var(--ap-line)!important}
.admin-portal .bg-stone-50{background:#faf9f6!important}
.admin-portal .bg-stone-100{background:var(--ap-chip)!important}


/* Reference HTML interaction + responsive behavior */
.admin-portal .ap-switch{position:relative;width:52px;height:32px;display:inline-flex;flex:none;}
.admin-portal .ap-switch input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer;z-index:2;}
.admin-portal .ap-switch-track{position:absolute;inset:0;border-radius:999px;background:#ddd8cf;transition:background .15s ease;}
.admin-portal .ap-switch-track::after{content:"";position:absolute;top:4px;left:4px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.18);transition:transform .15s ease;}
.admin-portal .ap-switch input:checked + .ap-switch-track{background:var(--ap-sel);}
.admin-portal .ap-switch input:checked + .ap-switch-track::after{transform:translateX(20px);}
.admin-portal .ap-switch input:focus-visible + .ap-switch-track{outline:3px solid var(--ap-blue);outline-offset:2px;}
.admin-portal .ap-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px;}
.admin-portal .ap-stat{text-align:left;padding:14px 20px;border-radius:24px;border:1px solid var(--ap-line);background:#fff;cursor:pointer;}
.admin-portal .ap-stat:hover{border-color:var(--ap-sel);background:#fbfaf7;}
.admin-portal .ap-stat b{display:block;font-size:30px;line-height:1.1;letter-spacing:-.02em;}
.admin-portal .ap-stat span{font-size:13.5px;color:var(--ap-muted);font-weight:500;}
.admin-portal .ap-attn{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px 16px 12px 12px;border-radius:999px;border:1.5px solid var(--ap-line);background:#fff;margin-bottom:8px;font-weight:600;}
.admin-portal .ap-attn:hover{border-color:var(--ap-sel);background:#fbfaf7;}
.admin-portal .ap-attn .n{flex:none;width:36px;height:36px;border-radius:50%;background:var(--ap-chip);display:grid;place-items:center;font-weight:700;}
.admin-portal .ap-attn .n.hot{background:var(--ap-maroon);color:#fff;}
.admin-portal .ap-attn .t{flex:1;min-width:0;}
.admin-portal .ap-overview-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start;}
.admin-portal .ap-overview-grid .admin-card{margin-bottom:0;}
.admin-portal .ap-log{list-style:none;margin:0;padding:0;}
.admin-portal .ap-log li{display:flex;gap:12px;padding:12px 4px;border-bottom:1px solid var(--ap-line);font-size:14.5px;}
.admin-portal .ap-log li:last-child{border-bottom:0;}
.admin-portal .ap-log time{flex:none;width:74px;color:var(--ap-muted);font-size:12.5px;padding-top:2px;}
.admin-portal .ap-user-card{display:none;align-items:center;gap:12px;width:100%;text-align:left;padding:12px;border-radius:24px;border:1px solid var(--ap-line);background:#fff;margin-bottom:10px;}
.admin-portal .ap-user-avatar{flex:none;width:46px;height:46px;border-radius:50%;background:var(--ap-chip);color:var(--ap-maroon);border:1px solid var(--ap-line);display:grid;place-items:center;font-weight:700;font-size:17px;}
.admin-portal .ap-user-body{flex:1;min-width:0;}
.admin-portal .ap-user-body b,.admin-portal .ap-user-body small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.admin-portal .ap-user-body b{font-size:16px;}
.admin-portal .ap-user-body small{color:var(--ap-muted);font-size:13px;}
.admin-portal .ap-user-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px;}
.admin-portal .ap-user-pills span{display:inline-flex;align-items:center;height:24px;padding:0 9px;border-radius:999px;background:var(--ap-chip);font-size:11.5px;font-weight:600;white-space:nowrap;}
.admin-portal .ap-user-pills .ok{background:var(--ap-ok-bg);border:1px solid var(--ap-ok-line);color:var(--ap-ok);}
.admin-portal .ap-user-pills .warn{background:var(--ap-warn-bg);border:1px solid var(--ap-warn-line);color:var(--ap-warn);}
.admin-portal .ap-user-pills .bad{background:var(--ap-bad-bg);border:1px solid var(--ap-bad-line);color:var(--ap-bad);}
.admin-portal .ap-user-pills .gray{background:var(--ap-chip);color:#57534e;}
.admin-portal .ap-user-chevron{flex:none;color:var(--ap-muted);font-size:22px;}
.admin-portal .ap-extension-mobile{display:none;}
.admin-portal .ap-toolbar-chips{overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;}
.admin-portal .ap-toolbar-chips::-webkit-scrollbar{display:none;}
@media (max-width:899px){
  .admin-portal .admin-header{padding:8px 10px!important;min-height:58px;}
  .admin-portal .admin-header > div{height:42px!important;}
  .admin-portal .admin-header button:first-child{width:36px;padding:0!important;justify-content:center;}
  .admin-portal .admin-header button:first-child span{display:none;}
  .admin-portal .admin-header .font-serif-title{font-size:19px!important;}
  .admin-portal .admin-header a{width:42px;height:42px!important;padding:0!important;justify-content:center;}
  .admin-portal .admin-header a span{display:none;}
  .admin-portal .admin-header > div:last-child > div:last-child{display:none!important;}
  .admin-portal .admin-main{padding:12px 10px 80px!important;}
  .admin-portal .admin-tabs{margin:0 -10px;padding:8px 10px!important;flex-wrap:nowrap!important;overflow-x:auto!important;scrollbar-width:none;}
  .admin-portal .admin-tabs::-webkit-scrollbar{display:none;}
  .admin-portal .admin-tabs button{flex:none;height:40px!important;padding:0 14px!important;font-size:14px!important;white-space:nowrap;}
  .admin-portal .ap-stats{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}
  .admin-portal .ap-stat{padding:10px 12px;border-radius:18px;}
  .admin-portal .ap-stat b{font-size:22px;}
  .admin-portal .ap-stat span{display:block;font-size:12px;line-height:1.25;margin-top:1px;}
  .admin-portal .ap-overview-grid{grid-template-columns:1fr;gap:0;}
  .admin-portal .ap-attn{padding:8px 14px 8px 8px;margin-bottom:6px;gap:10px;font-size:14px;}
  .admin-portal .ap-attn .n{width:30px;height:30px;font-size:14px;}
  .admin-portal .admin-card{border-radius:24px!important;padding:14px!important;}
  .admin-portal .admin-card .grid{grid-template-columns:1fr!important;}
  .admin-portal .admin-users-toolbar{border-radius:22px!important;padding:10px!important;}
  .admin-portal .admin-users-toolbar > div:first-child{width:100%!important;}
  .admin-portal .admin-users-toolbar .flex-wrap{flex-wrap:nowrap!important;overflow-x:auto;scrollbar-width:none;}
  .admin-portal .admin-users-toolbar .flex-wrap::-webkit-scrollbar{display:none;}
  .admin-portal .admin-users-toolbar .flex-wrap button{flex:none;}
  .admin-portal .admin-table-card{border-radius:24px!important;}
  .admin-portal .admin-table-card .overflow-x-auto{display:none!important;}
  .admin-portal .ap-user-card{display:flex;}
  .admin-portal .ap-extension-table{display:none!important;}
  .admin-portal .ap-extension-mobile{display:block;}
  .admin-portal .admin-card button{min-height:44px;}
  .admin-portal .admin-card input:not([type="radio"]):not([type="checkbox"]),.admin-portal .admin-card textarea{font-size:16px!important;}
  .admin-portal .fixed.inset-0{align-items:flex-end!important;padding:0!important;}
  .admin-portal .fixed.inset-0 > form,.admin-portal .fixed.inset-0 > div{width:100%!important;max-width:560px!important;max-height:90dvh;overflow-y:auto;border-radius:28px 28px 0 0!important;padding:22px 16px calc(24px + env(safe-area-inset-bottom,0px))!important;}
}
@media (max-width:520px){
  .admin-portal .admin-header .font-serif-title{font-size:18px!important;}
  .admin-portal .ap-stats{gap:6px;}
  .admin-portal .ap-stat{padding:8px 10px;}
  .admin-portal .ap-stat b{font-size:20px;}
  .admin-portal .ap-stat span{font-size:11.5px;}
}
@media (min-width:900px){
  .admin-portal .admin-tabs{flex-wrap:wrap!important;overflow:visible;}
  .admin-portal .admin-main{padding-left:24px!important;padding-right:24px!important;}
  .admin-portal .ap-overview-grid{grid-template-columns:1fr 1fr;}
  .admin-portal .ap-user-card{display:none!important;}
}

.admin-portal .ap-sortbar{grid-column:1/-1;display:flex;align-items:center;gap:8px;min-width:0;position:relative;}
.admin-portal .ap-sortbar label{font-size:12px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--ap-muted);flex:none;}
.admin-portal .ap-sort-select{position:relative;flex:1;min-width:0;max-width:240px;}
.admin-portal .ap-sort-button{width:100%;height:40px;padding:0 14px 0 16px;border:0;border-radius:999px;background:var(--ap-chip);font-weight:600;font-size:14px;display:flex;justify-content:space-between;align-items:center;gap:8px;text-align:left;}
.admin-portal .ap-sort-menu{position:absolute;z-index:80;top:48px;left:0;width:100%;min-width:190px;background:#fff;border:1px solid var(--ap-line);border-radius:18px;padding:6px;box-shadow:0 12px 32px rgba(28,25,23,.16);display:none;}
.admin-portal .ap-sort-menu.open,.admin-portal .ap-sort-select:focus-within .ap-sort-menu{display:block;}
.admin-portal .ap-sort-menu button{display:block;width:100%;min-height:42px;border:0;background:transparent;border-radius:12px;text-align:left;padding:0 12px;font-size:14px;font-weight:600;}
.admin-portal .ap-sort-menu button.selected{background:var(--ap-sel);color:#fff;}
.admin-portal .ap-sort-dir{width:40px;height:40px;border:0;border-radius:50%;background:var(--ap-sel);color:#fff;font-size:20px;display:grid;place-items:center;flex:none;}
.admin-portal .ap-sort-dir:disabled{background:var(--ap-chip);color:var(--ap-muted);opacity:.65;}
.admin-portal .ap-last-login{font-size:12px!important;margin-top:1px;white-space:normal!important;line-height:1.3;}
.admin-portal .ap-user-card{border:1px solid var(--ap-line);cursor:pointer;color:inherit;}
.admin-portal .ap-user-card:active{background:var(--ap-chip);border-color:var(--ap-sel);}
.admin-portal .ap-user-sheet{box-shadow:0 24px 70px rgba(28,25,23,.2);}
.admin-portal .ap-sheet-grab{width:44px;height:5px;border-radius:999px;background:#d6d0c6;margin:0 auto 18px;}
.admin-portal .ap-detail-pills{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;}
.admin-portal .ap-detail-pills span{padding:6px 10px;border-radius:999px;background:var(--ap-chip);font-size:12px;font-weight:700;}
.admin-portal .ap-detail-grid{display:grid;grid-template-columns:auto 1fr;border:1px solid var(--ap-line);border-radius:20px;overflow:hidden;margin-top:16px;}
.admin-portal .ap-detail-grid dt,.admin-portal .ap-detail-grid dd{margin:0;padding:12px 14px;border-bottom:1px solid var(--ap-line);font-size:14px;}
.admin-portal .ap-detail-grid dt{color:var(--ap-muted);}.admin-portal .ap-detail-grid dd{text-align:right;font-weight:600;overflow-wrap:anywhere;}
.admin-portal .ap-detail-grid dt:nth-last-of-type(1),.admin-portal .ap-detail-grid dd:last-of-type{border-bottom:0;}
.admin-portal .ap-protected{margin-top:16px;padding:14px 16px;border-radius:20px;background:var(--ap-chip);font-size:14px;}
@media(max-width:899px){
 .admin-portal{overflow-x:hidden!important;width:100%;max-width:100vw;}
 .admin-portal .admin-header{overflow:hidden!important;}
 .admin-portal .admin-header>div{max-width:100%!important;width:100%!important;padding-left:10px!important;padding-right:10px!important;gap:8px!important;}
 .admin-portal .admin-header>div>div:first-child{min-width:0;flex:1;}
 .admin-portal .admin-header .font-serif-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:46vw;}
 .admin-portal .admin-header .inline-flex{flex:none!important;max-width:42px!important;overflow:hidden;white-space:nowrap;}
 .admin-portal .admin-main{max-width:100vw!important;overflow:hidden!important;}
 .admin-portal .admin-gateway-card{max-width:none!important;width:100%!important;}
 .admin-portal .admin-gateway-card .flex.items-center.justify-between{align-items:flex-start!important;flex-wrap:wrap!important;gap:12px!important;}
 .admin-portal .admin-gateway-card .ap-switch{margin-left:auto;}
 .admin-portal .admin-users-toolbar{max-width:100%!important;overflow:visible!important;}
 .admin-portal .ap-sortbar{width:100%;}
 .admin-portal .ap-sort-select{max-width:none;}
 .admin-portal .ap-sort-menu{max-width:calc(100vw - 100px);}
 .admin-portal .ap-user-sheet{width:100%!important;max-width:560px!important;}
}
@media(max-width:520px){
 .admin-portal .admin-main{padding-left:10px!important;padding-right:10px!important;}
 .admin-portal .admin-header .font-serif-title{font-size:17px!important;max-width:43vw;}
 .admin-portal .admin-header a{max-width:40px!important;}
 .admin-portal .admin-tabs button{font-size:13px!important;padding-left:12px!important;padding-right:12px!important;}
 .admin-portal .ap-user-card{padding:12px 10px!important;border-radius:20px!important;}
 .admin-portal .ap-user-avatar{width:42px;height:42px;font-size:16px;}
 .admin-portal .ap-user-body b{font-size:15px!important;}
 .admin-portal .ap-user-body small{font-size:12.5px!important;}
 .admin-portal .ap-last-login{font-size:11.5px!important;}
}
`;

export const AdminPortal: React.FC<Props> = ({ onNavigateGateway }) => {
  const { user: currentAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'policy' | 'extensions' | 'gateway' | 'notifications' | 'activity'>('overview');

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'pending' | 'revoked' | 'expired' | 'admin' | 'soon'>('all');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserForExpiry, setSelectedUserForExpiry] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSort, setUserSort] = useState<'default' | 'registered' | 'lastSignIn' | 'expiry'>('default');
  const [userSortDir, setUserSortDir] = useState<'asc' | 'desc'>('desc');
  const [sortOpen, setSortOpen] = useState(false);
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
    const q = userSearch.trim().toLowerCase();
    const matchesSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const isExpired = !!u.access_expires_at && new Date(u.access_expires_at).getTime() < Date.now();
    const isSoon = !!u.access_expires_at && !isExpired && new Date(u.access_expires_at).getTime() <= Date.now() + 14 * 86400000;
    if (!matchesSearch) return false;
    if (userFilter === 'all') return true;
    if (userFilter === 'active') return u.access_status === 'active' && !isExpired;
    if (userFilter === 'pending') return u.access_status === 'pending';
    if (userFilter === 'revoked') return u.access_status === 'revoked';
    if (userFilter === 'expired') return isExpired;
    if (userFilter === 'admin') return u.role === 'admin';
    if (userFilter === 'soon') return isSoon;
    return true;
  }).slice().sort((a,b) => {
    if (userSort === 'default') return 0;
    const av = userSort === 'expiry' ? (a.access_expires_at ? new Date(a.access_expires_at).getTime() : null) : userSort === 'registered' ? (a.created_at ? new Date(a.created_at).getTime() : null) : (a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : null);
    const bv = userSort === 'expiry' ? (b.access_expires_at ? new Date(b.access_expires_at).getTime() : null) : userSort === 'registered' ? (b.created_at ? new Date(b.created_at).getTime() : null) : (b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : null);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return (av - bv) * (userSortDir === 'asc' ? 1 : -1);
  });

  const openUser = (u: User) => setSelectedUser(u);
  const sortLabel = userSort === 'registered' ? 'Joining date' : userSort === 'lastSignIn' ? 'Last login' : userSort === 'expiry' ? 'Expiry date' : 'Default';
  const toggleSort = (key: typeof userSort) => {
    if (userSort === key) setUserSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setUserSort(key); setUserSortDir(key === 'expiry' ? 'asc' : 'desc'); }
  };

  return (
    <>
      <style>{adminPortalStyles}</style>
    <div className="admin-portal min-h-screen flex flex-col justify-between">
      {/* Admin Header */}
      <header className="admin-header border-b border-stone-200 bg-white sticky top-0 z-40 shadow-xs">
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
      <main className="admin-main flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">
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
        <div className="admin-tabs flex flex-wrap gap-2 border-b border-stone-200 pb-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Overview</span>
          </button>

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
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              (activeTab as string) === 'activity'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Activity</span>
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

        {/* ================= OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif-title text-2xl font-bold text-stone-900">Overview</h2>
              <p className="text-sm text-stone-500 mt-1">Who has access, and what needs your attention.</p>
            </div>
            <div className="ap-stats">
              {[
                ['Total users', users.length, 'all'],
                ['Active', users.filter(u => u.access_status === 'active' && !(u.access_expires_at && new Date(u.access_expires_at).getTime() < Date.now())).length, 'active'],
                ['Pending approval', users.filter(u => u.access_status === 'pending').length, 'pending'],
                ['Expired', users.filter(u => !!u.access_expires_at && new Date(u.access_expires_at).getTime() < Date.now()).length, 'expired'],
                ['Revoked', users.filter(u => u.access_status === 'revoked').length, 'revoked'],
                ['Admins', users.filter(u => u.role === 'admin').length, 'all'],
              ].map(([label, count, filter]) => (
                <button key={String(label)} type="button" className="ap-stat" onClick={() => { setUserFilter(filter as any); setActiveTab('users'); }}>
                  <b>{count as number}</b><span>{label as string}</span>
                </button>
              ))}
            </div>
            <div className="ap-overview-grid">
              <div>
                <h3 className="font-semibold text-stone-900 mb-2">Needs attention</h3>
                <button type="button" className="ap-attn" onClick={() => { setUserFilter('pending'); setActiveTab('users'); }}>
                  <span className={`n ${users.filter(u => u.access_status === 'pending').length ? 'hot' : ''}`}>{users.filter(u => u.access_status === 'pending').length}</span>
                  <span className="t">Users waiting for approval</span><span className="text-stone-400">›</span>
                </button>
                <button type="button" className="ap-attn" onClick={() => setActiveTab('extensions')}>
                  <span className={`n ${extensions.filter(e => e.status === 'pending').length ? 'hot' : ''}`}>{extensions.filter(e => e.status === 'pending').length}</span>
                  <span className="t">Extension requests</span><span className="text-stone-400">›</span>
                </button>
                <button type="button" className="ap-attn" onClick={() => { setUserFilter('expired'); setActiveTab('users'); }}>
                  <span className="n">{users.filter(u => !!u.access_expires_at && new Date(u.access_expires_at).getTime() < Date.now()).length}</span>
                  <span className="t">Expired access</span><span className="text-stone-400">›</span>
                </button>
                <h3 className="font-semibold text-stone-900 mt-5 mb-2">Expiring soon</h3>
                {users.filter(u => u.access_expires_at && new Date(u.access_expires_at).getTime() >= Date.now() && new Date(u.access_expires_at).getTime() <= Date.now() + 14 * 86400000).slice(0,4).map(u => (
                  <button key={u.id} type="button" className="ap-user-card" style={{display:'flex'}} onClick={() => setActiveTab('users')}>
                    <span className="ap-user-avatar">{u.name?.[0] || '?'}</span>
                    <span className="ap-user-body"><b>{u.name}</b><small>{u.email}</small><span className="ap-user-pills"><span>{new Date(u.access_expires_at!).toLocaleDateString()}</span><span className="warn">Expiring soon</span></span></span><span className="ap-user-chevron">›</span>
                  </button>
                ))}
                {!users.some(u => u.access_expires_at && new Date(u.access_expires_at).getTime() >= Date.now() && new Date(u.access_expires_at).getTime() <= Date.now() + 14 * 86400000) && <div className="text-sm text-stone-400 py-3">No users expiring within 14 days.</div>}
              </div>
              <div>
                <h3 className="font-semibold text-stone-900 mb-2">Current admin activity</h3>
                <div className="admin-card">
                  <ul className="ap-log">
                    {actionSuccess ? <li><time>Now</time><span>{actionSuccess}</span></li> : null}
                    {actionError ? <li><time>Now</time><span>{actionError}</span></li> : null}
                    <li><time>Live</time><span>Portal data is loaded from the connected admin APIs.</span></li>
                    <li><time>Users</time><span>{users.length} user records currently available.</span></li>
                    <li><time>Requests</time><span>{extensions.filter(e => e.status === 'pending').length} extension requests awaiting review.</span></li>
                    <li><time>Alerts</time><span>{notifications.filter(n => n.is_active).length} active notifications.</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 1: USERS & ACCESS ================= */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="admin-users-toolbar flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
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
                {(['all', 'active', 'pending', 'expired', 'revoked', 'admin', 'soon'] as const).map((f) => (
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
              <div className="ap-sortbar">
                <label>Sort by</label>
                <div className="ap-sort-select">
                  <button type="button" className="ap-sort-button" onClick={() => setSortOpen(v => !v)} aria-expanded={sortOpen} aria-label="Sort by">
                    <span>{sortLabel}</span><span>⌄</span>
                  </button>
                  <div className={`ap-sort-menu ${sortOpen ? 'open' : ''}`}>
                    {([['default','Default'],['registered','Joining date'],['lastSignIn','Last login'],['expiry','Expiry date']] as const).map(([key,label]) => (
                      <button key={key} type="button" onClick={() => { setUserSort(key); setUserSortDir(key === 'expiry' ? 'asc' : 'desc'); setSortOpen(false); }} className={userSort === key ? 'selected' : ''}>{label}{userSort === key ? ' ✓' : ''}</button>
                    ))}
                  </div>
                </div>
                <button type="button" className="ap-sort-dir" disabled={userSort === 'default'} onClick={() => setUserSortDir(d => d === 'asc' ? 'desc' : 'asc')} aria-label="Reverse sort direction">{userSortDir === 'asc' ? '↑' : '↓'}</button>
              </div>
            </div>

            {/* Users Table */}
            <div className="admin-table-card bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
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

            {/* Mobile user cards — same data/actions as desktop table */}
            <div>
              {isLoadingUsers ? (
                <div className="p-8 text-center text-stone-400 bg-white rounded-3xl border border-stone-200">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-stone-400 bg-white rounded-3xl border border-stone-200">No users matched your search criteria.</div>
              ) : filteredUsers.map((u) => {
                const isExpired = u.access_expires_at ? new Date(u.access_expires_at).getTime() < Date.now() : false;
                const isAdminAccount = u.role === 'admin';
                return (
                  <button type="button" key={`mobile-${u.id}`} className="ap-user-card" onClick={() => openUser(u)}>
                    <div className="ap-user-avatar">{u.name?.[0] || '?'}</div>
                    <div className="ap-user-body">
                      <b>{u.name}</b><small>{u.email}</small><small className="ap-last-login">Last login: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString(undefined,{dateStyle:'short',timeStyle:'short'}) : 'Never'}</small>
                      <div className="ap-user-pills">
                        <span className={u.access_status === 'active' && !isExpired ? 'ok' : u.access_status === 'pending' ? 'warn' : isExpired ? 'bad' : 'gray'}>{isExpired ? 'Expired' : u.access_status === 'active' ? 'Active' : u.access_status === 'pending' ? 'Pending' : 'Revoked'}</span>
                        <span>{u.access_expires_at ? new Date(u.access_expires_at).toLocaleDateString(undefined,{dateStyle:'medium'}) : 'No expiry'}</span>
                      </div>
                    </div>
                    <span className="ap-user-chevron">›</span>
                  </button>
                );
              })}
            </div>

            {/* Set Expiry Dialog */}
            {selectedUser && (
              <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedUser(null); }}>
                <div className="ap-user-sheet bg-white w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-7">
                  <div className="ap-sheet-grab" />
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0"><h3 className="font-serif-title text-xl font-bold text-stone-900">{selectedUser.name}</h3><p className="text-sm text-stone-500 break-all">{selectedUser.email}</p></div>
                    <button type="button" onClick={() => setSelectedUser(null)} className="shrink-0 w-10 h-10 rounded-full bg-stone-100 text-stone-600">×</button>
                  </div>
                  <div className="ap-detail-pills"><span>{selectedUser.access_status === 'active' ? 'Active' : selectedUser.access_status === 'pending' ? 'Pending' : selectedUser.access_status === 'revoked' ? 'Revoked' : 'Expired'}</span>{selectedUser.role === 'admin' && <span>Admin</span>}</div>
                  <dl className="ap-detail-grid">
                    <dt>User ID</dt><dd>{selectedUser.id}</dd>
                    <dt>Registered</dt><dd>{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString(undefined,{dateStyle:'medium'}) : '—'}</dd>
                    <dt>Last sign-in</dt><dd>{selectedUser.last_sign_in_at ? new Date(selectedUser.last_sign_in_at).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}) : 'Never'}</dd>
                    <dt>Access</dt><dd>{selectedUser.access_expires_at ? new Date(selectedUser.access_expires_at).toLocaleDateString(undefined,{dateStyle:'medium'}) : 'No expiry'}</dd>
                  </dl>
                  {selectedUser.role === 'admin' ? <div className="ap-protected">Admin accounts are protected and can't be changed here.</div> : <div className="space-y-2 mt-5">
                    <button type="button" className="w-full py-3 rounded-xl bg-stone-100 font-semibold" onClick={() => { setSelectedUserForExpiry(selectedUser); setSelectedUser(null); }}>Set / change access</button>
                    {selectedUser.access_status !== 'revoked' && <button type="button" className="w-full py-3 rounded-xl bg-rose-50 text-rose-700 font-semibold" onClick={() => { setSelectedUserForExpiry(null); setSelectedUser(null); handleUpdateAccess(selectedUser.id,'revoked'); }}>Revoke access</button>}
                  </div>}
                </div>
              </div>
            )}

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
          <div className="admin-card bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs max-w-2xl space-y-6">
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
            <div className="ap-extension-table bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
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
            <div className="ap-extension-mobile space-y-2 mt-3">
              {extensions.map((ext) => (
                <div key={`mobile-ext-${ext.id}`} className="admin-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <b className="text-stone-900">{ext.user_name}</b>
                      <div className="text-xs text-stone-500 truncate">{ext.user_email}</div>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full font-bold text-[10px] ${ext.status === 'pending' ? 'bg-amber-100 text-amber-800' : ext.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{ext.status.toUpperCase()}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3 text-xs">
                    <span className="px-3 py-1.5 rounded-full bg-stone-100 font-semibold">{ext.requested_duration}</span>
                    <span className="px-3 py-1.5 rounded-full bg-stone-100">Expiry: {ext.current_expiry ? new Date(ext.current_expiry).toLocaleDateString(undefined,{dateStyle:'medium'}) : 'None'}</span>
                  </div>
                  {ext.reason && <p className="text-sm text-stone-600 mt-3 whitespace-pre-wrap">{ext.reason}</p>}
                  {ext.status === 'pending' && <div className="flex flex-wrap gap-2 mt-3">
                    <button onClick={() => handleReviewExtension(ext.id,'approve',30)} className="px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold">+1 Mo</button>
                    <button onClick={() => handleReviewExtension(ext.id,'approve',90)} className="px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold">+3 Mo</button>
                    <button onClick={() => handleReviewExtension(ext.id,'decline')} className="px-4 py-2 rounded-full bg-rose-50 text-rose-700 text-xs font-bold">Decline</button>
                  </div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-4">
            <h2 className="font-serif-title text-2xl font-bold text-stone-900">Activity</h2>
            <p className="text-sm text-stone-500">Recent administrative actions and portal events.</p>
            <div className="admin-card">
              <ul className="ap-log">
                {actionSuccess ? <li><time>Now</time><span>{actionSuccess}</span></li> : null}
                {actionError ? <li><time>Now</time><span>{actionError}</span></li> : null}
                <li><time>Live</time><span>Portal data is loaded from the connected admin APIs.</span></li>
                <li><time>Users</time><span>{users.length} user records currently available.</span></li>
                <li><time>Requests</time><span>{extensions.filter(e => e.status === 'pending').length} extension requests awaiting review.</span></li>
                <li><time>Alerts</time><span>{notifications.filter(n => n.is_active).length} active notifications.</span></li>
              </ul>
            </div>
          </div>
        )}

        {/* ================= TAB 4: GATEWAY INFO BOX ================= */}
        {activeTab === 'gateway' && (
          <form onSubmit={handleSaveGatewayInfo} className="admin-card admin-gateway-card bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs max-w-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-stone-900 font-serif-title">
                  Gateway Information Box Editor
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  This section appears on the Gateway for both prospective students and enrolled members.
                </p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <span className="text-xs font-bold text-stone-700">Display on Gateway</span>
                <span className="ap-switch">
                  <input type="checkbox" checked={gatewayInfo.visible} onChange={(e) => setGatewayInfo({ ...gatewayInfo, visible: e.target.checked })} aria-label="Display on Gateway" />
                  <span className="ap-switch-track" />
                </span>
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
                        <label className="ap-switch" title={n.is_active ? 'Active' : 'Inactive'}>
                          <input type="checkbox" checked={n.is_active} onChange={() => handleToggleNotif(n.id)} aria-label="Active" />
                          <span className="ap-switch-track" />
                        </label>
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
    </>
  );
};
