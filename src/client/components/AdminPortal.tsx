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
  ChevronRight,
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
.admin-portal .ap-user-card{display:none;align-items:center;gap:12px;width:100%;text-align:left;padding:12px 12px;border-radius:24px;border:1px solid var(--ap-line);background:var(--card,#fff);margin-bottom:10px;color:inherit;}
.admin-portal .ap-user-avatar{flex:none;width:46px;height:46px;border-radius:50%;background:var(--ap-chip);color:var(--ap-maroon);border:1px solid var(--ap-line);display:grid;place-items:center;font-weight:700;font-size:17px;}
.admin-portal .ap-user-body{flex:1;min-width:0;}
.admin-portal .ap-user-body b{display:block;font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.admin-portal .ap-user-body small{display:block;color:var(--ap-muted);font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.admin-portal .ap-user-body small.ap-last-login{font-size:12.5px!important;margin-top:1px;white-space:normal!important;line-height:1.3;}
.admin-portal .ap-user-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px;}
.admin-portal .ap-user-pills span{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:999px;background:var(--ap-chip);font-size:11.5px;font-weight:600;white-space:nowrap;}
.admin-portal .ap-user-pills .ok{background:var(--ap-ok-bg);border:1px solid var(--ap-ok-line);color:var(--ap-ok);}
.admin-portal .ap-user-pills .warn{background:var(--ap-warn-bg);border:1px solid var(--ap-warn-line);color:var(--ap-warn);}
.admin-portal .ap-user-pills .bad{background:var(--ap-bad-bg);border:1px solid var(--ap-bad-line);color:var(--ap-bad);}
.admin-portal .ap-user-pills .gray{background:var(--ap-chip);color:#57534e;}
.admin-portal .ap-user-pills .admin{background:var(--ap-sel);color:#fff;border-color:var(--ap-sel);}
.admin-portal .ap-user-pills .ok svg{width:12px;height:12px;}
.admin-portal .ap-user-chevron{flex:none;color:var(--ap-muted);width:18px;height:18px;}
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
 .admin-portal .ap-user-card{padding:12px 14px 12px 12px!important;margin-bottom:8px;}
 .admin-portal .ap-user-avatar{width:42px;height:42px;font-size:16px;}
}
\n/* Full reference-style surfaces for policy, requests, gateway and notifications */\n.admin-portal .ap-policy{display:grid;gap:10px;max-width:760px;}\n.admin-portal .ap-policy-opt{position:relative;display:block;cursor:pointer;}\n.admin-portal .ap-policy-opt input{position:absolute;opacity:0;inset:0;width:100%;height:100%;margin:0;cursor:pointer;}\n.admin-portal .ap-policy-opt>span{display:block;padding:14px 20px;border-radius:22px;border:1.5px solid var(--ap-line);background:#fff;font-weight:600;}\n.admin-portal .ap-policy-opt input:checked+span{background:var(--ap-sel);border-color:var(--ap-sel);color:#fff;}\n.admin-portal .ap-policy-opt small{display:block;margin-top:2px;font-weight:400;font-size:13.5px;opacity:.8;}\n.admin-portal .ap-current-pill{display:inline-flex;align-items:center;height:22px;margin-left:8px;padding:0 9px;border-radius:999px;background:#fff;color:var(--ap-ink);font-size:11px;font-weight:700;}\n.admin-portal .ap-table-card{background:#fff;border:1px solid var(--ap-line);border-radius:24px;overflow:hidden;}\n.admin-portal .ap-table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;}\n.admin-portal .ap-table{width:100%;border-collapse:collapse;min-width:900px;}\n.admin-portal .ap-table th{padding:20px 18px;text-align:left;font-size:11.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--ap-muted);border-bottom:1px solid var(--ap-line);white-space:nowrap;}\n.admin-portal .ap-table td{padding:14px 18px;border-bottom:1px solid var(--ap-line);vertical-align:middle;font-size:14px;}\n.admin-portal .ap-table tr:last-child td{border-bottom:0;}\n.admin-portal .ap-table .r{text-align:right;}\n.admin-portal .ap-table-name{display:block;font-size:15px;}\n.admin-portal .ap-table-email{display:block;color:var(--ap-muted);font-size:13px;overflow-wrap:anywhere;}\n.admin-portal .ap-status-pill{display:inline-flex;align-items:center;height:28px;padding:0 10px;border-radius:999px;background:var(--ap-chip);font-size:12px;font-weight:600;}\n.admin-portal .ap-status-pill.ok{background:var(--ap-ok-bg);border:1px solid var(--ap-ok-line);color:var(--ap-ok);}\n.admin-portal .ap-status-pill.warn{background:var(--ap-warn-bg);border:1px solid var(--ap-warn-line);color:var(--ap-warn);}\n.admin-portal .ap-status-pill.bad{background:var(--ap-bad-bg);border:1px solid var(--ap-bad-line);color:var(--ap-bad);}\n.admin-portal .ap-muted{color:var(--ap-muted);}\n.admin-portal .ap-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap;}\n.admin-portal .ap-soft-btn{height:42px;padding:0 16px;border:0;border-radius:12px;background:var(--ap-chip);font-weight:600;font-size:14px;}\n.admin-portal .ap-link-btn,.admin-portal .ap-link-neutral{min-height:42px;padding:0 6px;border:0;background:none;font-weight:600;font-size:14px;}\n.admin-portal .ap-link-btn{color:var(--ap-bad);}.admin-portal .ap-link-neutral{color:var(--ap-ink);}\n.admin-portal .ap-extension-mobile{display:none;}\n.admin-portal .ap-request-card{margin-bottom:10px;}\n.admin-portal .ap-request-head{display:flex;align-items:center;justify-content:space-between;gap:12px;}\n.admin-portal .ap-request-user{min-width:0;}.admin-portal .ap-request-user b{display:block;font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.admin-portal .ap-request-user small{display:block;color:var(--ap-muted);font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}\n.admin-portal .ap-request-note{color:var(--ap-muted);font-size:14.5px;margin:10px 0 0;overflow-wrap:anywhere;}\n.admin-portal .ap-request-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;}\n.admin-portal .ap-gateway-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start;}\n.admin-portal .ap-gateway-editor{margin-bottom:0;}\n.admin-portal .ap-nrow{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;}\n.admin-portal .ap-field{margin-bottom:14px;}.admin-portal .ap-field label{display:block;margin:0 0 6px 6px;font-size:13.5px;font-weight:600;}\n.admin-portal .ap-field input,.admin-portal .ap-field textarea{width:100%;min-height:50px;padding:0 18px;border-radius:999px;border:1.5px solid var(--ap-line);background:#fff;font-size:16px;}\n.admin-portal .ap-field textarea{min-height:110px;border-radius:22px;padding:14px 18px;resize:vertical;line-height:1.45;}\n.admin-portal .ap-field input:focus,.admin-portal .ap-field textarea:focus{border-color:var(--ap-sel);outline:3px solid rgba(37,99,235,.2);outline-offset:0;}\n.admin-portal .ap-preview-title{margin:0 0 10px;font-size:16px;}.admin-portal .ap-ginfo{border:1.5px solid var(--ap-ok-line);background:var(--ap-ok-bg);border-radius:24px;padding:16px 20px;overflow-wrap:anywhere;}.admin-portal .ap-ginfo h4{margin:0 0 4px;font-size:16px;}.admin-portal .ap-ginfo p{margin:4px 0;font-size:14.5px;}.admin-portal .ap-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}.admin-portal .ap-meta span{display:inline-flex;align-items:center;min-height:28px;padding:4px 10px;border-radius:999px;background:#fff;border:1px solid var(--ap-line);font-size:12.5px;font-weight:600;}\n.admin-portal .ap-empty{text-align:center;color:var(--ap-muted);padding:30px 12px;border:1.5px dashed var(--ap-line);border-radius:24px;background:#fff;}\n.admin-portal .ap-section-title{margin:22px 0 10px;font-size:16px;}\n.admin-portal .ap-notif-create{max-width:none;margin-bottom:14px;}.admin-portal .ap-notif-create h3{margin:0 0 12px;font-size:16px;}\n.admin-portal .ap-options{display:flex;flex-wrap:wrap;gap:8px;}.admin-portal .ap-option{height:44px;padding:0 16px;border-radius:999px;border:1.5px solid var(--ap-line);background:#fff;font-weight:600;font-size:14px;}.admin-portal .ap-option.selected{background:var(--ap-sel);border-color:var(--ap-sel);color:#fff;}\n.admin-portal .ap-notif-card{margin-bottom:14px;}.admin-portal .ap-notif-title{display:flex;align-items:center;gap:8px;min-width:0;}.admin-portal .ap-notif-title h4{margin:0;font-size:17px;overflow-wrap:anywhere;}.admin-portal .ap-cat{display:inline-flex;align-items:center;height:28px;padding:0 10px;border-radius:999px;background:var(--ap-chip);font-size:12.5px;font-weight:600;white-space:nowrap;}.admin-portal .ap-cat.ok{background:var(--ap-ok-bg);border:1px solid var(--ap-ok-line);color:var(--ap-ok);}.admin-portal .ap-cat.bad{background:var(--ap-bad-bg);border:1px solid var(--ap-bad-line);color:var(--ap-bad);}.admin-portal .ap-cat.gray{background:var(--ap-chip);color:#57534e;}\n.admin-portal .ap-notif-message{color:var(--ap-muted);font-size:14.5px;margin:6px 0 0;overflow-wrap:anywhere;white-space:pre-wrap;}.admin-portal .ap-progress{height:8px;border-radius:999px;background:var(--ap-chip);overflow:hidden;margin-top:10px;}.admin-portal .ap-progress i{display:block;height:100%;background:var(--ap-sel);border-radius:999px;}.admin-portal .ap-notif-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;}\n.admin-portal .ap-sheet{width:100%;max-width:560px;max-height:90dvh;overflow-y:auto;border-radius:28px 28px 0 0;padding:22px 16px calc(24px + env(safe-area-inset-bottom,0px));box-shadow:0 24px 70px rgba(28,25,23,.2);}.admin-portal .ap-sheet h3{margin:0 0 6px;font-family:"Source Serif 4",Georgia,serif;font-size:22px;}.admin-portal .ap-sheet-actions{display:flex;gap:8px;margin-top:14px;}.admin-portal .ap-sheet-actions .btn{flex:1;}\n@media(min-width:900px){.admin-portal .ap-sheet{border-radius:28px;padding:24px;}.admin-portal .ap-extension-desktop{display:block;}}\n@media(max-width:899px){.admin-portal .ap-gateway-grid{grid-template-columns:1fr;}.admin-portal .ap-extension-desktop{display:none;}.admin-portal .ap-extension-mobile{display:block;}.admin-portal .ap-notif-create{padding:14px!important;}.admin-portal .ap-notif-title{align-items:flex-start;flex-wrap:wrap;}.admin-portal .ap-notif-actions .btn{flex:1 1 auto;}.admin-portal .ap-table-card{border-radius:24px;}}\n`;

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
  const [editingNotif, setEditingNotif] = useState<NotificationItem | null>(null);
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
  const handleSavePolicy = async (nextPolicy: NewUserPolicy = policy) => {
    setIsSavingPolicy(true);
    try {
      const res = await authFetch('/api/admin/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy: nextPolicy }),
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

  // Edit Notification
  const handleEditNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotif) return;
    try {
      const res = await authFetch(`/api/admin/notifications/${editingNotif.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newNotifTitle, category: newNotifCategory, message: newNotifMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showNotification('Notification updated.');
      setEditingNotif(null); setIsCreatingNotif(false);
      setNewNotifTitle(''); setNewNotifMessage('');
      fetchAdminNotifications();
    } catch (e: any) { showError(e.message || 'Failed to update notification'); }
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
                  <button key={u.id} type="button" className="ap-user-card ap-user-card-visible" onClick={() => setSelectedUser(u)}>
                    <span className="ap-user-avatar">{u.name?.[0] || '?'}</span>
                    <span className="ap-user-body"><b>{u.name}</b><small>{u.email}</small><small className="ap-last-login">Joined: {u.created_at ? new Date(u.created_at).toLocaleDateString(undefined,{dateStyle:'medium'}) : '—'} · Last login: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString(undefined,{dateStyle:'short',timeStyle:'short'}) : 'Never'}</small><span className="ap-user-pills"><span className="warn">Expiring soon</span><span>Expires {new Date(u.access_expires_at!).toLocaleDateString(undefined,{dateStyle:'medium'})}</span></span></span><ChevronRight className="ap-user-chevron" aria-hidden="true" />
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
                      <th className="px-4 py-3.5">Joining Date</th>
                      <th className="px-4 py-3.5">Expiry Date</th>
                      <th className="px-4 py-3.5">Last Sign In</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {isLoadingUsers ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-stone-400">
                          Loading users...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-stone-400">
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
                            <td className="px-4 py-4 text-stone-500 text-[11px]">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
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
                                {isAdminAccount ? (
                                  <span className="text-stone-400 font-semibold">Protected</span>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openUser(u)}
                                      className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200 transition-colors"
                                    >
                                      {u.access_status === 'pending' ? 'Approve' : u.access_status === 'revoked' || isExpired ? 'Restore' : 'Set Expiry'}
                                    </button>
                                    {u.access_status !== 'revoked' && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateAccess(u.id, 'revoked')}
                                        className="px-2 py-1 rounded-lg text-rose-700 hover:bg-rose-50 font-semibold"
                                      >
                                        Revoke
                                      </button>
                                    )}
                                  </>
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
                    <span className="ap-user-avatar">{u.name?.[0] || '?'}</span>
                    <span className="ap-user-body">
                      <b>{u.name}</b>
                      <small>{u.email}</small>
                      <small className="ap-last-login">
                        Joined: {u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'} · Last login: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                      </small>
                      <span className="ap-user-pills">
                        <span className={u.access_status === 'active' && !isExpired ? 'ok' : u.access_status === 'pending' ? 'warn' : isExpired ? 'bad' : 'gray'}>
                          {u.access_status === 'active' && !isExpired ? <><CheckCircle2 className="w-3 h-3" />Active</> : isExpired ? 'Expired' : u.access_status === 'pending' ? 'Pending' : 'Revoked'}
                        </span>
                        {u.role === 'admin' && <span className="admin">Admin</span>}
                        <span>{u.role === 'admin' ? 'No expiry' : u.access_status === 'pending' ? 'No access yet' : u.access_status === 'revoked' ? 'Access revoked' : u.access_expires_at ? `Expires ${new Date(u.access_expires_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}` : 'No expiry'}</span>
                      </span>
                    </span>
                    <ChevronRight className="ap-user-chevron" aria-hidden="true" />
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
                    <dt>Sign-in method</dt><dd>{(selectedUser as any).sign_in_method || (selectedUser as any).method || (selectedUser as any).provider || '—'}</dd>
                    <dt>Registered</dt><dd>{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString(undefined,{dateStyle:'medium'}) : '—'}</dd>
                    <dt>Last sign-in</dt><dd>{selectedUser.last_sign_in_at ? new Date(selectedUser.last_sign_in_at).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}) : 'Never'}</dd>
                    <dt>Access</dt><dd>{selectedUser.role === 'admin' ? 'No expiry' : selectedUser.access_status === 'pending' ? 'No access yet' : selectedUser.access_status === 'revoked' ? 'Access revoked' : selectedUser.access_expires_at ? `Expires ${new Date(selectedUser.access_expires_at).toLocaleDateString(undefined,{dateStyle:'medium'})}` : 'No expiry'}</dd>
                    <dt>Days remaining</dt><dd>{selectedUser.role === 'admin' || !selectedUser.access_expires_at ? '—' : Math.max(0, Math.ceil((new Date(selectedUser.access_expires_at).getTime() - Date.now()) / 86400000))}</dd>
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
          <div>
            <h2 className="font-serif-title text-2xl font-bold text-stone-900">New User Policy</h2>
            <p className="text-sm text-stone-500 mb-4">What happens when someone signs in for the first time.</p>
            <div className="ap-policy" role="radiogroup" aria-label="New user policy">
              {[
                { id: 'auto_3_months' as NewUserPolicy, title: 'Automatic 3 months', desc: 'New users get 3 months as soon as they sign in.' },
                { id: 'auto_1_month' as NewUserPolicy, title: 'Automatic 1 month', desc: 'New users get 1 month as soon as they sign in.' },
                { id: 'approval_required' as NewUserPolicy, title: 'Admin approval required', desc: 'New users stay pending until you approve them.' },
              ].map((opt) => (
                <label key={opt.id} className="ap-policy-opt">
                  <input
                    type="radio"
                    name="policy"
                    value={opt.id}
                    checked={policy === opt.id}
                    disabled={isSavingPolicy}
                    onChange={() => { setPolicy(opt.id); handleSavePolicy(opt.id); }}
                  />
                  <span>
                    <span className="ap-policy-title">{opt.title}{policy === opt.id && <span className="ap-current-pill">Current</span>}</span>
                    <small>{opt.desc}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 3: EXTENSION REQUESTS ================= */}
        {activeTab === 'extensions' && (
          <div>
            <h2 className="font-serif-title text-2xl font-bold text-stone-900">Extension Requests</h2>
            <p className="text-sm text-stone-500 mb-4">Users asking for more time. Choose the new period when you approve.</p>
            {isLoadingExt ? (
              <div className="ap-empty">Loading requests...</div>
            ) : extensions.length === 0 ? (
              <div className="ap-empty">No pending requests.</div>
            ) : (
              <>
                <div className="ap-extension-desktop ap-table-card">
                  <div className="ap-table-scroll">
                    <table className="ap-table">
                      <thead><tr><th>User</th><th>Requested duration</th><th>Current / past expiry</th><th>Reason / note</th><th>Status</th><th className="r">Actions</th></tr></thead>
                      <tbody>
                        {extensions.map((ext) => (
                          <tr key={ext.id}>
                            <td><b className="ap-table-name">{ext.user_name}</b><span className="ap-table-email">{ext.user_email}</span></td>
                            <td><b>{ext.requested_duration}</b></td>
                            <td>{ext.current_expiry ? new Date(ext.current_expiry).toLocaleDateString(undefined,{dateStyle:'medium'}) : <span className="ap-muted">None</span>}</td>
                            <td>{ext.reason || <span className="ap-muted">—</span>}</td>
                            <td><span className={`ap-status-pill ${ext.status === 'pending' ? 'warn' : ext.status === 'approved' ? 'ok' : 'bad'}`}>{ext.status}</span></td>
                            <td className="r">
                              <div className="ap-actions">
                                {ext.status === 'pending' ? <>
                                  <button className="ap-soft-btn" type="button" onClick={() => handleReviewExtension(ext.id,'approve',30)}>Approve</button>
                                  <button className="ap-link-btn" type="button" onClick={() => handleReviewExtension(ext.id,'decline')}>Decline</button>
                                </> : <span className="ap-muted">Reviewed</span>}
                                <button className="ap-link-neutral" type="button" onClick={() => { const u = users.find(x => x.id === ext.user_id || x.id === (ext as any).uid); if (u) setSelectedUser(u); }}>View user</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="ap-extension-mobile">
                  {extensions.map((ext) => {
                    const u = users.find(x => x.id === ext.user_id || x.id === (ext as any).uid);
                    return <div key={`mobile-ext-${ext.id}`} className="admin-card ap-request-card">
                      <div className="ap-request-head"><div className="ap-request-user"><b>{ext.user_name}</b><small>{ext.user_email}</small></div><span className={`ap-status-pill ${ext.status === 'pending' ? 'warn' : ext.status === 'approved' ? 'ok' : 'bad'}`}>{ext.status}</span></div>
                      <div className="ap-user-pills"><span>{ext.requested_duration}</span><span>{ext.current_expiry ? `Expiry ${new Date(ext.current_expiry).toLocaleDateString(undefined,{dateStyle:'medium'})}` : 'No expiry'}</span></div>
                      {ext.reason && <p className="ap-request-note">“{ext.reason}”</p>}
                      <div className="ap-request-actions">
                        {ext.status === 'pending' && <><button className="btn solid small" type="button" onClick={() => handleReviewExtension(ext.id,'approve',30)}>Approve</button><button className="btn small danger" type="button" onClick={() => handleReviewExtension(ext.id,'decline')}>Decline</button></>}
                        {u && <button className="btn small" type="button" onClick={() => setSelectedUser(u)}>View user</button>}
                      </div>
                    </div>
                  })}
                </div>
              </>
            )}
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
                {!actionSuccess && !actionError && <li><time>—</time><span>No recent activity is available from the current API response.</span></li>}
              </ul>
            </div>
          </div>
        )}

        {/* ================= TAB 4: GATEWAY INFO BOX ================= */}
        {activeTab === 'gateway' && (
          <div>
            <h2 className="font-serif-title text-2xl font-bold text-stone-900">Gateway Info Box</h2>
            <p className="text-sm text-stone-500 mb-4">The info box students see on the gateway page.</p>
            <div className="ap-gateway-grid">
              <form onSubmit={handleSaveGatewayInfo} className="admin-card ap-gateway-editor">
                <div className="ap-nrow">
                  <b>Show on gateway</b>
                  <label className="ap-switch"><input type="checkbox" checked={gatewayInfo.visible} onChange={(e)=>setGatewayInfo({...gatewayInfo,visible:e.target.checked})} aria-label="Show on gateway"/><span className="ap-switch-track"/></label>
                </div>
                {[
                  ['heading','Heading','text'],['whatsapp','WhatsApp','tel'],['phone','Contact number','tel'],['email','Email','email'],['pricing','Pricing','text']
                ].map(([key,label,type])=><div className="ap-field" key={key}><label>{label}</label><input type={type} value={(gatewayInfo as any)[key] || ''} onChange={(e)=>setGatewayInfo({...gatewayInfo,[key]:e.target.value})}/></div>)}
                <div className="ap-field"><label>Main message</label><textarea value={gatewayInfo.message || ''} onChange={(e)=>setGatewayInfo({...gatewayInfo,message:e.target.value})}/></div>
                <div className="ap-field"><label>Additional message</label><textarea value={gatewayInfo.additional_notes || ''} onChange={(e)=>setGatewayInfo({...gatewayInfo,additional_notes:e.target.value})}/></div>
                <button className="btn solid block" type="submit" disabled={isSavingGateway}>{isSavingGateway ? 'Saving...' : 'Save gateway info'}</button>
              </form>
              <div><h3 className="ap-preview-title">Preview</h3><div className="ap-ginfo-preview">{gatewayInfo.visible ? <div className="ap-ginfo"><h4>{gatewayInfo.heading || 'Heading'}</h4><p>{gatewayInfo.message}</p>{gatewayInfo.additional_notes && <p>{gatewayInfo.additional_notes}</p>}<div className="ap-meta">{gatewayInfo.pricing && <span>{gatewayInfo.pricing}</span>}{gatewayInfo.whatsapp && <span>WhatsApp {gatewayInfo.whatsapp}</span>}{gatewayInfo.phone && <span>{gatewayInfo.phone}</span>}{gatewayInfo.email && <span>{gatewayInfo.email}</span>}</div></div> : <div className="ap-empty">Hidden from students.</div>}</div></div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: NOTIFICATIONS & READ TRACKING ================= */}
        {activeTab === 'notifications' && (
          <div>
            <h2 className="font-serif-title text-2xl font-bold text-stone-900">Notifications &amp; Read Tracking</h2>
            <p className="text-sm text-stone-500 mb-4">Publish updates and see who has read them.</p>
            <div className="admin-card ap-notif-create">
              <h3>New notification</h3>
              <div className="ap-field"><label>Title</label><input maxLength={80} value={newNotifTitle} onChange={(e)=>setNewNotifTitle(e.target.value)} placeholder="What's new?"/></div>
              <div className="ap-field"><label>Message</label><textarea value={newNotifMessage} onChange={(e)=>setNewNotifMessage(e.target.value)} placeholder="Tell users what changed…"/></div>
              <div className="ap-field"><label>Category</label><div className="ap-options">{(['New Content','Update','Important','General'] as NotificationCategory[]).map(cat=><button key={cat} type="button" className={`ap-option ${newNotifCategory === cat ? 'selected' : ''}`} onClick={()=>setNewNotifCategory(cat)}>{cat}</button>)}</div></div>
              <button className="btn solid block" type="button" disabled={!newNotifTitle.trim() || !newNotifMessage.trim()} onClick={(e)=>{ const form = (e.currentTarget.closest('.admin-card') as HTMLElement); const fake = { preventDefault:()=>{} } as React.FormEvent; void handleCreateNotification(fake); }}>{isLoadingNotifs ? 'Publishing…' : 'Publish notification'}</button>
            </div>

            <h3 className="ap-section-title">All notifications</h3>
            {isLoadingNotifs ? <div className="ap-empty">Loading notifications...</div> : notifications.length === 0 ? <div className="ap-empty">No notifications yet.</div> : (
              <div>
                {notifications.map((n)=>{
                  const total = users.filter(u=>u.role !== 'admin').length;
                  const seen = n.read_count || 0;
                  const pct = total ? Math.min(100, Math.round(seen/total*100)) : 0;
                  return <div key={n.id} className="admin-card ap-notif-card">
                    <div className="ap-nrow"><div className="ap-notif-title"><span className={`ap-cat ${n.category === 'New Content' ? 'ok' : n.category === 'Important' ? 'bad' : n.category === 'General' ? 'gray' : ''}`}>{n.category}</span><h4>{n.title}</h4></div><label className="ap-switch" title={n.is_active ? 'Active' : 'Inactive'}><input type="checkbox" checked={n.is_active} onChange={()=>handleToggleNotif(n.id)} aria-label="Active"/><span className="ap-switch-track"/></label></div>
                    <p className="ap-notif-message">{n.message}</p>
                    <div className="ap-user-pills"><span>{(n as any).created_at ? new Date((n as any).created_at).toLocaleDateString(undefined,{dateStyle:'medium'}) : '—'}</span><span className={n.is_active ? 'ok' : 'gray'}>{n.is_active ? 'Active' : 'Inactive'}</span><span>Seen {seen} / {total}</span></div>
                    <div className="ap-progress"><i style={{width:`${pct}%`}}/></div>
                    <div className="ap-notif-actions"><button className="btn small" type="button" onClick={()=>setSelectedNotifForReads(n)}><Eye className="w-4 h-4"/>Seen by</button><button className="btn small" type="button" onClick={()=>{setEditingNotif(n);setNewNotifTitle(n.title);setNewNotifCategory(n.category);setNewNotifMessage(n.message);setIsCreatingNotif(false);}}><Settings className="w-4 h-4"/>Edit</button><button className="btn small danger" type="button" onClick={()=>handleDeleteNotif(n.id)}><Trash2 className="w-4 h-4"/>Delete</button></div>
                  </div>
                })}
              </div>
            )}

            {(editingNotif || isCreatingNotif) && editingNotif && (
              <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/45">
                <form onSubmit={handleEditNotification} className="ap-sheet bg-white">
                  <h3>Edit notification</h3>
                  <div className="ap-field"><label>Title</label><input value={newNotifTitle} onChange={e=>setNewNotifTitle(e.target.value)}/></div>
                  <div className="ap-field"><label>Message</label><textarea value={newNotifMessage} onChange={e=>setNewNotifMessage(e.target.value)}/></div>
                  <div className="ap-field"><label>Category</label><div className="ap-options">{(['New Content','Update','Important','General'] as NotificationCategory[]).map(cat=><button key={cat} type="button" className={`ap-option ${newNotifCategory===cat?'selected':''}`} onClick={()=>setNewNotifCategory(cat)}>{cat}</button>)}</div></div>
                  <div className="ap-sheet-actions"><button className="btn solid" type="submit">Save changes</button><button className="btn" type="button" onClick={()=>{setEditingNotif(null);setNewNotifTitle('');setNewNotifMessage('')}}>Close</button></div>
                </form>
              </div>
            )}

            {isCreatingNotif && !editingNotif && (
              <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/45">
                <div className="ap-sheet bg-white">
                  <h3>New notification</h3><p className="ap-muted">Use the form above to publish a notification.</p>
                  <button className="btn block" type="button" onClick={()=>setIsCreatingNotif(false)}>Close</button>
                </div>
              </div>
            )}

            {selectedNotifForReads && (
              <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/45" onMouseDown={(e)=>{if(e.target===e.currentTarget)setSelectedNotifForReads(null)}}>
                <div className="ap-sheet bg-white">
                  <h3>{selectedNotifForReads.title}</h3><p className="ap-muted">Users who opened this notification.</p>
                  {(!selectedNotifForReads.read_by_users || selectedNotifForReads.read_by_users.length===0) ? <div className="ap-empty">Nobody has opened this notification yet.</div> : <ul className="ap-log">{selectedNotifForReads.read_by_users.map(r=><li key={r.user_id}><span><b>{r.name}</b><br/><small className="ap-muted">{r.email}</small></span><time>{new Date(r.read_at).toLocaleString(undefined,{dateStyle:'short',timeStyle:'short'})}</time></li>)}</ul>}
                  <button className="btn block" type="button" onClick={()=>setSelectedNotifForReads(null)}>Close</button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
    </>
  );
};
