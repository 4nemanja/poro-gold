import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';
import { Bell, ChevronDown, LogOut, Menu, RefreshCw, Settings, X, type LucideIcon } from 'lucide-react';
import { NotificationBadge } from '../../../features/notifications/components/NotificationBadge';
import { LanguageSwitcher } from '../../../i18n/components/LanguageSwitcher';
import { useI18n } from '../../../i18n/I18nProvider';
import { ThemeToggle } from '../../theme/ThemeToggle';
import { ProfileAvatar } from '../profile/ProfileAvatar';

export interface PortalNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  activeFor?: string[];
  compact?: boolean;
  emphasized?: boolean;
}

interface FloatingPortalNavbarProps {
  portalLabel: string;
  currentView: string;
  homeView: string;
  primaryItems: PortalNavItem[];
  moreItems?: PortalNavItem[];
  settingsView: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  unreadNotificationCount: number;
  onNavigate: (view: string) => void;
  onNotifications: () => void;
  onLogout: () => void | Promise<void>;
  onSwitchPortal?: () => void;
}

const itemIsActive = (item: PortalNavItem, currentView: string) => item.id === currentView || item.activeFor?.includes(currentView) === true;

export function FloatingPortalNavbar({
  portalLabel,
  currentView,
  homeView,
  primaryItems,
  moreItems = [],
  settingsView,
  displayName,
  email,
  avatarUrl,
  unreadNotificationCount,
  onNavigate,
  onNotifications,
  onLogout,
  onSwitchPortal,
}: FloatingPortalNavbarProps) {
  const { t } = useI18n();
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const shellRef = useRef<HTMLElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const compactItems = primaryItems.filter((item) => item.compact);
  const allItems = [...primaryItems, ...moreItems];
  const moreActive = [...compactItems, ...moreItems].some((item) => itemIsActive(item, currentView));

  useEffect(() => {
    if (!moreOpen && !profileOpen && !mobileOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
        setProfileOpen(false);
        setMobileOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMoreOpen(false);
        setProfileOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileOpen, moreOpen, profileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [mobileOpen]);

  const navigate = (view: string) => {
    setMoreOpen(false);
    setProfileOpen(false);
    setMobileOpen(false);
    onNavigate(view);
  };

  const moveMenuFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
    if (!items.length) return;
    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : event.key === 'ArrowDown' ? (currentIndex + 1) % items.length
        : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  };

  const openMenuWithArrow = (event: ReactKeyboardEvent<HTMLButtonElement>, open: () => void, menuRef: RefObject<HTMLDivElement | null>) => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    open();
    requestAnimationFrame(() => {
      const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
      items?.[event.key === 'ArrowUp' ? items.length - 1 : 0]?.focus();
    });
  };

  const navButtonClass = (active: boolean, emphasized = false) => `relative inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${active
    ? 'bg-white/10 text-white'
    : emphasized ? 'bg-blue-600 text-white hover:bg-blue-500' : 'text-gray-300 hover:bg-white/[0.07] hover:text-white'}`;

  return <div className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
    <header ref={shellRef} className="relative mx-auto flex h-14 max-w-[1500px] items-center gap-2 rounded-full border border-white/[0.08] bg-[#080c16]/[0.92] px-2.5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.3)] backdrop-blur-[18px] sm:h-16 sm:px-3">
      <button type="button" onClick={() => navigate(homeView)} className="flex shrink-0 items-center gap-2 rounded-full px-1.5 py-1.5 text-white transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" aria-label={`${portalLabel} ${t('navigation.overview')}`}>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-black text-[#080c16]">P</span>
        <span className="hidden text-sm font-bold tracking-[0.12em] sm:inline">PORO</span>
      </button>

      <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex" aria-label={portalLabel}>
        {primaryItems.map((item) => <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`${navButtonClass(itemIsActive(item, currentView), item.emphasized)} ${item.compact ? 'hidden xl:inline-flex' : ''}`}>
          <item.icon className="h-4 w-4 opacity-80" />{item.label}
          {itemIsActive(item, currentView) && <span className="absolute inset-x-4 -bottom-1 h-0.5 rounded-full bg-blue-400" />}
        </button>)}

        {(moreItems.length > 0 || compactItems.length > 0) && <div className={`relative ${moreItems.length === 0 ? 'xl:hidden' : ''}`}>
          <button type="button" aria-haspopup="menu" aria-expanded={moreOpen} onKeyDown={(event) => openMenuWithArrow(event, () => setMoreOpen(true), moreMenuRef)} onClick={() => { setMoreOpen((open) => !open); setProfileOpen(false); }} className={navButtonClass(moreActive)}>
            {t('navigation.more')}<ChevronDown className={`h-4 w-4 transition ${moreOpen ? 'rotate-180' : ''}`} />
          </button>
          {moreOpen && <div ref={moreMenuRef} role="menu" onKeyDown={moveMenuFocus} className="absolute left-1/2 top-full mt-3 max-h-[min(32rem,calc(100dvh-7rem))] w-64 -translate-x-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1320] p-2 shadow-2xl">
            {compactItems.map((item) => <button key={item.id} role="menuitem" type="button" onClick={() => navigate(item.id)} className={`w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition xl:hidden ${itemIsActive(item, currentView) ? 'flex bg-white/10 text-white' : 'flex text-gray-300 hover:bg-white/[0.07] hover:text-white'}`}><item.icon className="h-4 w-4" />{item.label}</button>)}
            {moreItems.map((item) => <button key={item.id} role="menuitem" type="button" onClick={() => navigate(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${itemIsActive(item, currentView) ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/[0.07] hover:text-white'}`}><item.icon className="h-4 w-4" />{item.label}</button>)}
          </div>}
        </div>}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <button type="button" onClick={onNotifications} aria-label={unreadNotificationCount > 0 ? `${t('navigation.notifications')} (${unreadNotificationCount})` : t('navigation.notifications')} className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${currentView === 'notifications' ? 'bg-white/10 text-white' : 'bg-white/[0.05] text-gray-300'}`}>
          <Bell className="h-4 w-4" /><NotificationBadge count={unreadNotificationCount} className="absolute -right-1 -top-1" />
        </button>
        <ThemeToggle className="!h-9 !w-9 !rounded-full !border-white/10 !bg-white/[0.05] !text-gray-300 !shadow-none hover:!bg-white/10 hover:!text-white" />

        <div className="relative hidden lg:block">
          <button type="button" aria-haspopup="menu" aria-expanded={profileOpen} onKeyDown={(event) => openMenuWithArrow(event, () => setProfileOpen(true), profileMenuRef)} onClick={() => { setProfileOpen((open) => !open); setMoreOpen(false); }} className="flex h-10 max-w-48 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] pl-1 pr-3 text-sm font-medium text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <ProfileAvatar name={displayName} email={email} url={avatarUrl} className="h-8 w-8" />
            <span className="truncate">{displayName}</span><ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition ${profileOpen ? 'rotate-180' : ''}`} />
          </button>
          {profileOpen && <div ref={profileMenuRef} role="menu" onKeyDown={moveMenuFocus} className="absolute right-0 top-full mt-3 w-72 rounded-2xl border border-white/10 bg-[#0d1320] p-2 shadow-2xl">
            <div className="border-b border-white/10 px-3 py-2.5"><p className="truncate text-sm font-semibold text-white">{displayName}</p><p className="truncate text-xs text-gray-400">{email}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-blue-400">{portalLabel}</p></div>
            <button role="menuitem" type="button" onClick={() => navigate(settingsView)} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-300 hover:bg-white/[0.07] hover:text-white"><Settings className="h-4 w-4" />{t('navigation.settings')}</button>
            {onSwitchPortal && <button role="menuitem" type="button" onClick={() => { setProfileOpen(false); onSwitchPortal(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-300 hover:bg-white/[0.07] hover:text-white"><RefreshCw className="h-4 w-4" />{t('navigation.switchPortal')}</button>}
            <div className="my-1 border-t border-white/10 px-3 pt-3"><LanguageSwitcher /></div>
            <button role="menuitem" type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200"><LogOut className="h-4 w-4" />{t('profile.signOut')}</button>
          </div>}
        </div>

        <button type="button" onClick={() => { setMobileOpen((open) => !open); setMoreOpen(false); setProfileOpen(false); }} aria-expanded={mobileOpen} aria-label={mobileOpen ? t('profile.closeNavigation') : t('profile.openNavigation')} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-gray-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 lg:hidden">
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {mobileOpen && <div className="absolute inset-x-0 top-full mt-3 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-3xl border border-white/10 bg-[#0d1320] p-3 shadow-2xl lg:hidden">
        <nav className="grid gap-1" aria-label={portalLabel}>{allItems.map((item) => <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${itemIsActive(item, currentView) ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/[0.07] hover:text-white'}`}><item.icon className="h-4 w-4" />{item.label}</button>)}</nav>
        <div className="mt-2 border-t border-white/10 pt-2">
          {!allItems.some((item) => item.id === settingsView) && <button type="button" onClick={() => navigate(settingsView)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-gray-300 hover:bg-white/[0.07] hover:text-white"><Settings className="h-4 w-4" />{t('navigation.settings')}</button>}
          {onSwitchPortal && <button type="button" onClick={() => { setMobileOpen(false); onSwitchPortal(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-gray-300 hover:bg-white/[0.07] hover:text-white"><RefreshCw className="h-4 w-4" />{t('navigation.switchPortal')}</button>}
          <div className="px-3 py-3"><LanguageSwitcher /></div>
          <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-red-300 hover:bg-red-500/10"><LogOut className="h-4 w-4" />{t('profile.signOut')}</button>
        </div>
      </div>}
    </header>
  </div>;
}
