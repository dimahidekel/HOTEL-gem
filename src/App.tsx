import React, { useCallback, useEffect, useState } from 'react';
import {
  Briefcase,
  Building2,
  LayoutDashboard,
  Menu,
  PlusSquare,
  Shield,
  X,
} from 'lucide-react';
import { INITIAL_ACTIVITY_LOG, SYNTHETIC_DEALS } from './data/syntheticDeals';
import {
  DealActivityItem,
  HotelDeal,
  NavRoute,
  WorkspaceTab,
} from './types/underwriting';
import { MasterPreflightResult } from './types/factory';
import {
  googleSignInDrive,
  initDriveAuth,
  logoutDrive,
} from './services/googleDriveAuth';
import { DashboardView } from './components/DashboardView';
import { AllDealsView } from './components/AllDealsView';
import { NewDealView } from './components/NewDealView';
import { DealWorkspaceView } from './components/DealWorkspaceView';
import { AdminUsersView } from './components/AdminUsersView';
import { GoogleDriveAuthBar } from './components/workspace/GoogleDriveAuthBar';

const NAV_ITEMS: {
  id: NavRoute;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'deals', label: 'All Deals', icon: Building2 },
  { id: 'workspace', label: 'Deal Workspace', icon: Briefcase },
  { id: 'new-deal', label: 'New Deal', icon: PlusSquare },
  { id: 'admin', label: 'Admin / Users', icon: Shield },
];

export default function App() {
  const [deals, setDeals] = useState<HotelDeal[]>(SYNTHETIC_DEALS);
  const [activityLog, setActivityLog] = useState<DealActivityItem[]>(INITIAL_ACTIVITY_LOG);
  const [route, setRoute] = useState<NavRoute>('dashboard');
  const [selectedDealId, setSelectedDealId] = useState<string>(SYNTHETIC_DEALS[0].id);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('decision-screen');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // In-memory Google Drive read-only OAuth & Master preflight state (never persisted to localStorage/sessionStorage)
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [driveUserEmail, setDriveUserEmail] = useState<string | null>(null);
  const [masterPreflight, setMasterPreflight] = useState<MasterPreflightResult | null>(null);
  const [isCheckingMaster, setIsCheckingMaster] = useState(false);
  const [driveAuthError, setDriveAuthError] = useState<string | null>(null);

  const runMasterPreflight = useCallback(async (token: string | null) => {
    setIsCheckingMaster(true);
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch('/api/factory/master-preflight', { headers });
      if (res.ok) {
        const data = (await res.json()) as MasterPreflightResult;
        setMasterPreflight(data);
      }
    } catch {
      // Leave null so UI reports MASTER_ACCESS_BLOCKED honestly
    } finally {
      setIsCheckingMaster(false);
    }
  }, []);

  useEffect(() => {
    void runMasterPreflight(null);
    const unsub = initDriveAuth(
      (user, token) => {
        setDriveUserEmail(user.email ?? user.displayName ?? 'Authorized Google Account');
        setDriveToken(token);
        setDriveAuthError(null);
        void runMasterPreflight(token);
      },
      () => {
        setDriveUserEmail(null);
        setDriveToken(null);
      }
    );
    return () => unsub();
  }, [runMasterPreflight]);

  const handleDriveSignIn = async () => {
    setDriveAuthError(null);
    setIsCheckingMaster(true);
    try {
      const { user, accessToken } = await googleSignInDrive();
      setDriveUserEmail(user.email ?? user.displayName ?? 'Authorized Google Account');
      setDriveToken(accessToken);
      await runMasterPreflight(accessToken);
    } catch (err) {
      setDriveAuthError(
        err instanceof Error ? err.message : 'Google Drive authorization was not completed.'
      );
      setIsCheckingMaster(false);
    }
  };

  const handleDriveRefresh = async () => {
    setDriveAuthError(null);
    await runMasterPreflight(driveToken);
  };

  const handleDriveSignOut = async () => {
    await logoutDrive();
    setDriveToken(null);
    setDriveUserEmail(null);
    setDriveAuthError(null);
    await runMasterPreflight(null);
  };

  const activeDeal = deals.find((d) => d.id === selectedDealId) ?? deals[0];

  const handleOpenDeal = (dealId: string, tab: WorkspaceTab = 'decision-screen') => {
    setSelectedDealId(dealId);
    setWorkspaceTab(tab);
    setRoute('workspace');
    setMobileMenuOpen(false);
  };

  const handleNavigate = (nextRoute: NavRoute) => {
    setRoute(nextRoute);
    setMobileMenuOpen(false);
  };

  const handleCreateDeal = (newDeal: HotelDeal) => {
    const t12 = newDeal.historicalInputs[newDeal.historicalInputs.length - 1];
    const pipTotal = newDeal.pipItems.reduce((s, p) => s + p.estimatedCost, 0);
    fetch('/api/factory/synthetic-deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newDeal.name,
        location: newDeal.location,
        rooms: newDeal.rooms,
        brand: newDeal.brand,
        askingPrice: newDeal.askingPrice,
        occupancyPct: t12?.occupancyPct ?? null,
        adr: t12?.adr ?? null,
        fbAndOtherRevenue: (t12?.fbRevenue ?? 0) + (t12?.otherRevenue ?? 0),
        estimatedPip: pipTotal,
        investmentNotes: newDeal.investmentNotes,
      }),
    }).catch(() => {
      // Session state still works locally in UI
    });
    setDeals((prev) => [newDeal, ...prev]);
    setActivityLog((prev) => [
      {
        id: `ACT-${Date.now()}`,
        dealId: newDeal.id,
        dealName: newDeal.name,
        date: newDeal.createdAt,
        actor: 'Session Intake',
        summary: `Logged synthetic deal (${newDeal.rooms} keys, ${newDeal.location}) in current browser session.`,
      },
      ...prev,
    ]);
    setSelectedDealId(newDeal.id);
    setWorkspaceTab('decision-screen');
    setRoute('workspace');
  };

  const handleUpdateDeal = (updatedDeal: HotelDeal, summaryText: string) => {
    setDeals((prev) => prev.map((d) => (d.id === updatedDeal.id ? updatedDeal : d)));
    setActivityLog((prev) => [
      {
        id: `ACT-${Date.now()}`,
        dealId: updatedDeal.id,
        dealName: updatedDeal.name,
        date: new Date().toISOString().slice(0, 10),
        actor: 'Underwriter Update',
        summary: summaryText,
      },
      ...prev,
    ]);
  };

  const routeLabel =
    NAV_ITEMS.find((item) => item.id === route)?.label ?? 'Dashboard';

  const SidebarContent = (
    <div className="flex flex-col h-full bg-[#0B1F3A] text-slate-200 select-none">
      {/* Brand Block */}
      <div className="px-5 h-16 flex items-center justify-between border-b border-slate-800/80">
        <button
          type="button"
          onClick={() => handleNavigate('dashboard')}
          className="text-left focus-visible:outline-2 focus-visible:outline-teal-400"
        >
          <span className="block font-display text-sm font-bold tracking-wider text-white whitespace-nowrap">
            HOTEL WORK DEV
          </span>
          <span className="block text-[11px] text-slate-400 whitespace-nowrap">
            Investment Underwriting
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation drawer"
          className="lg:hidden p-1.5 text-slate-300 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Primary Navigation */}
      <nav aria-label="Primary navigation" className="px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = route === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-teal-400 ${
                isActive
                  ? 'bg-[#0D7377] text-white'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Quick Deal Jump List */}
      <div className="px-4 py-4 mt-2 border-t border-slate-800/80 flex-1 overflow-y-auto">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
          Pipeline Deals ({deals.length})
        </div>
        <div className="space-y-1">
          {deals.map((d) => {
            const isSelected = route === 'workspace' && d.id === selectedDealId;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => handleOpenDeal(d.id, 'decision-screen')}
                className={`w-full text-left px-2.5 py-2 rounded text-xs transition-colors focus-visible:outline-2 focus-visible:outline-teal-400 ${
                  isSelected
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <div className="font-mono text-[11px] text-teal-300">{d.id}</div>
                <div className="truncate font-medium">{d.name}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  {d.location} · {d.posture}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Honest Scope Footnote */}
      <div className="px-5 py-3.5 border-t border-slate-800/80 text-[11px] text-slate-400 leading-snug">
        Synthetic Test Environment · Browser-session persistence only.
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200 sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile / Tablet Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full">
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on left, 1 primary CTA on right */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 rounded focus-visible:outline-2 focus-visible:outline-teal-700"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
              <span className="font-display font-semibold text-slate-900 whitespace-nowrap shrink-0">
                HOTEL WORK DEV
              </span>
              <span className="text-slate-400" aria-hidden="true">/</span>
              <span className="text-slate-600 whitespace-nowrap shrink-0">{routeLabel}</span>
              {route === 'workspace' && activeDeal && (
                <>
                  <span className="hidden sm:inline text-slate-400" aria-hidden="true">/</span>
                  <span className="hidden sm:inline font-mono text-xs text-teal-800 truncate max-w-[240px]">
                    {activeDeal.id} · {activeDeal.name}
                  </span>
                </>
              )}
            </nav>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => handleNavigate('new-deal')}
              className="px-4 py-2 text-xs font-medium text-white bg-[#0F294A] hover:bg-[#173964] rounded transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-teal-700"
            >
              New Deal
            </button>
          </div>
        </header>

        {/* Main Workspace Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto space-y-5">
          <GoogleDriveAuthBar
            preflight={masterPreflight}
            userEmail={driveUserEmail}
            isChecking={isCheckingMaster}
            authError={driveAuthError}
            onSignIn={handleDriveSignIn}
            onRefresh={handleDriveRefresh}
            onSignOut={handleDriveSignOut}
          />
          {route === 'dashboard' && (
            <DashboardView
              deals={deals}
              activityLog={activityLog}
              onOpenDeal={handleOpenDeal}
              onNavigate={handleNavigate}
            />
          )}
          {route === 'deals' && (
            <AllDealsView
              deals={deals}
              onOpenDeal={handleOpenDeal}
              onNavigate={handleNavigate}
            />
          )}
          {route === 'new-deal' && (
            <NewDealView
              nextIndex={deals.length + 1}
              onCreateDeal={handleCreateDeal}
              onCancel={() => handleNavigate('deals')}
            />
          )}
          {route === 'workspace' && (
            <DealWorkspaceView
              deals={deals}
              selectedDealId={selectedDealId}
              activeTab={workspaceTab}
              onSelectDeal={(id) => setSelectedDealId(id)}
              onSelectTab={(tab) => setWorkspaceTab(tab)}
              onUpdateDeal={handleUpdateDeal}
              driveAuthToken={driveToken}
              masterPreflight={masterPreflight}
            />
          )}
          {route === 'admin' && <AdminUsersView />}
        </main>

        {/* Quiet Institutional Footer */}
        <footer className="border-t border-slate-200 bg-white px-4 sm:px-8 py-3.5 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            HOTEL WORK DEV — Synthetic Hotel Investment Underwriting Demonstration
          </span>
          <span>
            All properties and financial statements are fictional. Session changes are not persisted to a database.
          </span>
        </footer>
      </div>
    </div>
  );
}
