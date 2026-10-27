import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Activity, Bell, BriefcaseBusiness, Building2, CalendarDays, ChevronDown, CircleDollarSign, ClipboardCheck, Languages, LayoutDashboard, LogOut, Menu, ShieldCheck, UserRound, UsersRound, X } from 'lucide-react';
import { Notice } from '../components/ui';
import { useWorkspace } from '../hooks/useWorkspace';
import { text, type Language } from '../i18n';

const LANG_KEY = 'karyapulse.language.v1';

export function WorkspaceShell() {
  const workspace = useWorkspace();
  const location = useLocation();
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem(LANG_KEY) === 'ta' ? 'ta' : 'en');
  const [menuOpen, setMenuOpen] = useState(false);
  const t = text(language);
  const navigation = useMemo(() => [
    { to: '/', label: t.dashboard, icon: LayoutDashboard },
    { to: '/shifts', label: t.shifts, icon: CalendarDays },
    { to: '/pay', label: t.pay, icon: CircleDollarSign },
    { to: '/safety', label: t.safety, icon: ShieldCheck },
    { to: '/feedback', label: t.feedback, icon: ClipboardCheck },
    { to: '/skills', label: t.skills, icon: BriefcaseBusiness },
    ...(workspace.role === 'admin' || workspace.role === 'supervisor' ? [{ to: '/team', label: t.team, icon: UsersRound }] : []),
    { to: '/alerts', label: t.alerts, icon: Bell },
  ], [t, workspace.role]);

  useEffect(() => {
    const page = navigation.find((item) => item.to === location.pathname);
    document.title = `${page?.label ?? 'Workspace'} | KaryaPulse`;
  }, [language, location.pathname, navigation]);

  const changeLanguage = (next: Language) => {
    setLanguage(next);
    localStorage.setItem(LANG_KEY, next);
    document.documentElement.lang = next;
  };

  return <div className="app-frame">
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <div className="brand-lockup"><div className="brand-mark"><Activity size={21} strokeWidth={2.4} /></div><div><strong>KaryaPulse</strong><span>WORKFORCE TRUST</span></div><button className="icon-button mobile-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={19} /></button></div>
      <div className="sidebar-org"><div className="org-mark"><Building2 size={18} /></div><div className="org-copy"><span className="tiny-label">WORKSPACE</span><strong>{workspace.org?.name ?? 'Select an organization'}</strong></div><ChevronDown size={15} className="muted" /></div>
      <nav className="main-nav" aria-label="Main navigation">{navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}><Icon size={18} strokeWidth={1.9} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="trust-card"><div className="trust-card-icon"><ShieldCheck size={17} /></div><div><strong>People first, always</strong><span>Safer work starts with clear information.</span></div></div><div className="profile-row"><div className="avatar">{(workspace.data.workers.find((worker) => worker.id === workspace.workerId)?.name ?? 'KP').split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div className="profile-info"><strong>{workspace.data.workers.find((worker) => worker.id === workspace.workerId)?.name ?? workspace.user?.displayName ?? 'Workspace user'}</strong><span>{workspace.role}</span></div>{workspace.mode === 'firebase' && <button className="icon-button" aria-label="Sign out" onClick={() => void workspace.logOut()}><LogOut size={17} /></button>}</div></div>
    </aside>
    {menuOpen && <button className="mobile-scrim" aria-label="Close navigation overlay" onClick={() => setMenuOpen(false)} />}
    <div className="main-column">
      <header className="topbar">
        <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
        <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{workspace.org?.industry === 'construction' ? t.construction : t.college}</strong></div>
        <div className="topbar-controls">
          {workspace.mode === 'demo' ? <label className="select-control"><span className="live-dot" />{t.demo}<select aria-label="Select demo organization" value={workspace.orgId} onChange={(event) => workspace.switchOrganization(event.target.value)}>{workspace.data.organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select><ChevronDown size={14} /></label> : workspace.memberships.length > 1 ? <label className="select-control"><span className="live-dot" />{workspace.org?.name ?? t.live}<select aria-label="Select organization" value={workspace.orgId} onChange={(event) => workspace.switchOrganization(event.target.value)}>{workspace.memberships.map((membership) => <option key={membership.organizationId} value={membership.organizationId}>{membership.organizationName}</option>)}</select><ChevronDown size={14} /></label> : <span className="live-pill"><span className="live-dot" />{t.live}</span>}
          {workspace.mode === 'demo' && <label className="role-select"><UserRound size={16} /><select aria-label="Switch demo persona" value={workspace.role} onChange={(event) => workspace.setDemoRole(event.target.value as 'worker' | 'supervisor' | 'admin')}><option value="worker">Worker view</option><option value="supervisor">Supervisor view</option><option value="admin">Administrator view</option></select><ChevronDown size={14} /></label>}
          <label className="language-select"><Languages size={16} /><select aria-label={t.language} value={language} onChange={(event) => changeLanguage(event.target.value as Language)}><option value="en">EN</option><option value="ta">தமிழ்</option></select></label>
        </div>
      </header>
      <main className="content-area">
        {workspace.error && <Notice tone={workspace.user ? 'error' : 'info'}>{workspace.error}</Notice>}
        <Outlet context={{ language }} />
      </main>
      <footer className="app-footer"><span>© {new Date().getFullYear()} KaryaPulse</span><span>Work with clarity. Return home safe.</span></footer>
    </div>
  </div>;
}
