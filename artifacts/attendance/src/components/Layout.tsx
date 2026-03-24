import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import liveuLogo from "@/assets/liveu-logo.png";
import drivethruLogo from "@/assets/drivethru-logo.png";
import {
  LayoutGrid,
  UserRound,
  ClipboardList,
  CalendarCheck,
  Timer,
  MapPinned,
  Cog,
  BarChart3,
  LogOut,
  Bell,
  Wallet,
  ListChecks,
  ShieldCheck,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
  AlertCircle,
  CheckCircle2,
  Info,
  MapPin,
  ArrowRight,
  User,
  Sliders,
  Sun,
  Moon,
  BookOpen,
  ClipboardCheck,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type NavItem  = { href: string; label: string; icon: React.ElementType };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: LayoutGrid }],
  },
  {
    label: "Attendance",
    items: [
      { href: "/attendance/today",      label: "Today's Attendance", icon: ClipboardList   },
      { href: "/attendance/monthly",    label: "Monthly Sheet",      icon: CalendarCheck   },
      { href: "/attendance/approvals",  label: "Approvals",          icon: ClipboardCheck  },
    ],
  },
  {
    label: "HR Management",
    items: [
      { href: "/employees",        label: "Employees",        icon: UserRound   },
      { href: "/payroll",          label: "Payroll",          icon: Wallet      },
      { href: "/payroll-settings", label: "Payroll Settings", icon: Sliders     },
      { href: "/hr-settings",      label: "HR Settings",      icon: BookOpen    },
      { href: "/shifts",           label: "Shifts",           icon: Timer       },
      { href: "/leave-balances",   label: "Leave Balances",   icon: CalendarClock },
    ],
  },
  {
    label: "Organization",
    items: [
      { href: "/branches", label: "Branches", icon: MapPinned },
    ],
  },
  {
    label: "Analytics",
    items: [{ href: "/reports", label: "Reports", icon: BarChart3 }],
  },
  {
    label: "System",
    items: [
      { href: "/users",         label: "User Management", icon: ShieldCheck },
      { href: "/activity-logs", label: "Activity Logs",   icon: ListChecks  },
      { href: "/settings",      label: "Settings",        icon: Cog         },
    ],
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map(p => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type SearchResult = {
  type: "page" | "employee" | "branch";
  label: string;
  sub?: string;
  href: string;
  icon: React.ElementType;
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarLight, setSidebarLight] = useState<boolean>(() => localStorage.getItem("sidebar_theme") === "light");
  const [logoUrl, setLogoUrl] = useState<string>(() => localStorage.getItem("org_logo") || drivethruLogo);

  function toggleSidebarTheme() {
    setSidebarLight(prev => {
      const next = !prev;
      localStorage.setItem("sidebar_theme", next ? "light" : "dark");
      return next;
    });
  }

  /* s(dark, light) — returns the right class based on sidebar theme */
  const s = (dark: string, light: string) => sidebarLight ? light : dark;
  const [now, setNow] = useState(new Date());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem("auth_user") || "{}"); } catch { return {}; }
  })();
  const userName  = storedUser.fullName || storedUser.username || "Admin User";
  const userEmail = storedUser.email    || storedUser.username  || "admin@drivethru.com";
  const userRole  = storedUser.role     || "admin";

  useEffect(() => {
    const handler = () => setLogoUrl(localStorage.getItem("org_logo") || drivethruLogo);
    window.addEventListener("org_logo_updated", handler);
    return () => window.removeEventListener("org_logo_updated", handler);
  }, []);

  /* Live clock */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* Close notification dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Focus search input when opened */
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [searchOpen]);

  /* ⌘K / Ctrl+K shortcut to open search */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setSearchFocused(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  /* Close search on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
        setSelectedIdx(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Close search on navigation */
  useEffect(() => {
    setSearchFocused(false);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedIdx(-1);
    setSearchOpen(false);
  }, [location]);

  /* Debounced global search */
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setSearchResults([]); setSelectedIdx(-1); return; }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      setSelectedIdx(-1);
      const results: SearchResult[] = [];

      const allNavItems = NAV_GROUPS.flatMap(g => g.items);
      const ql = q.toLowerCase();

      allNavItems.forEach(item => {
        if (item.label.toLowerCase().includes(ql)) {
          results.push({ type: "page", label: item.label, href: item.href, icon: item.icon });
        }
      });

      try {
        const [empRes, branchRes] = await Promise.all([
          fetch(`${BASE}/api/employees?limit=200`).then(r => r.json()).catch(() => null),
          fetch(`${BASE}/api/branches`).then(r => r.json()).catch(() => null),
        ]);

        if (empRes?.employees) {
          empRes.employees
            .filter((e: any) => {
              const name = e.fullName || `${e.firstName || ""} ${e.lastName || ""}`.trim();
              return name.toLowerCase().includes(ql) || (e.employeeId || "").toLowerCase().includes(ql);
            })
            .slice(0, 5)
            .forEach((e: any) => {
              const name = e.fullName || `${e.firstName || ""} ${e.lastName || ""}`.trim();
              results.push({
                type: "employee",
                label: name,
                sub: `${e.employeeId} · ${e.department || ""}`,
                href: "/employees",
                icon: User,
              });
            });
        }

        if (Array.isArray(branchRes)) {
          branchRes
            .filter((b: any) =>
              b.name.toLowerCase().includes(ql) ||
              b.code.toLowerCase().includes(ql) ||
              (b.managerName || "").toLowerCase().includes(ql)
            )
            .slice(0, 4)
            .forEach((b: any) => {
              results.push({
                type: "branch",
                label: b.name,
                sub: `${b.code} · ${b.type.replace("_", " ")}`,
                href: "/branches",
                icon: Building2,
              });
            });
        }
      } catch { /* ignore */ }

      setSearchResults(results);
      setSearchLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  function navigateToResult(href: string) {
    setLocation(href);
    setSearchQuery("");
    setSearchResults([]);
    setSearchFocused(false);
    setSearchOpen(false);
    setSelectedIdx(-1);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchQuery("");
      setSearchFocused(false);
      setSelectedIdx(-1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (selectedIdx >= 0 && searchResults[selectedIdx]) {
        navigateToResult(searchResults[selectedIdx].href);
      } else if (searchResults.length > 0) {
        navigateToResult(searchResults[0].href);
      }
    }
  }

  async function handleLogout() {
    try {
      const token = localStorage.getItem("auth_token");
      if (token) {
        await fetch(`${BASE}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch { /* ignore */ }
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setLocation("/login");
  }

  return (
    /* Full-viewport container — no outer scroll */
    <div className="h-screen overflow-hidden bg-background flex">

      {/* ── Sidebar ─────────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col shadow-xl z-10 shrink-0 h-full transition-[width] duration-300 ease-in-out overflow-hidden",
          sidebarLight
            ? "bg-white text-gray-700 border-r border-gray-200"
            : "bg-sidebar text-sidebar-foreground border-r border-white/8",
          collapsed ? "w-[60px]" : "w-[220px]"
        )}
      >
        {/* Brand + collapse toggle */}
        <div className={cn(
          "flex items-center shrink-0",
          sidebarLight ? "border-b border-gray-200" : "border-b border-white/8",
          collapsed ? "justify-center py-4 px-0" : "px-4 pt-5 pb-4 gap-3"
        )}>
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0 overflow-hidden"
            style={{ boxShadow: "0 2px 10px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.06)" }}>
            {logoUrl
              ? <img src={logoUrl} alt="Logo" className="w-7 h-7 object-contain" />
              : <span className="font-extrabold text-sm text-primary">D</span>}
          </div>

          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <span className={cn("font-bold text-sm tracking-tight block truncate", s("text-white", "text-gray-800"))}>Drivethru</span>
                <span className={cn("text-[10px] block truncate", s("text-white/50", "text-gray-400"))}>Attendance Management</span>
              </div>
              {/* Light/dark toggle */}
              <button
                onClick={toggleSidebarTheme}
                className={cn("p-1 rounded-lg transition-colors shrink-0", s("hover:bg-white/10 text-white/40 hover:text-white", "hover:bg-gray-100 text-gray-400 hover:text-gray-700"))}
                title={sidebarLight ? "Switch to dark sidebar" : "Switch to light sidebar"}
              >
                {sidebarLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setCollapsed(true)}
                className={cn("p-1 rounded-lg transition-colors shrink-0", s("hover:bg-white/10 text-white/40 hover:text-white", "hover:bg-gray-100 text-gray-400 hover:text-gray-700"))}
                title="Collapse sidebar"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
            </>
          )}

        </div>

        {/* Expand button — collapsed only */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className={cn(
              "flex items-center justify-center py-3 transition-colors shrink-0",
              sidebarLight
                ? "hover:bg-gray-100 text-gray-400 hover:text-gray-700 border-b border-gray-200"
                : "hover:bg-white/10 text-white/40 hover:text-white border-b border-white/8"
            )}
            title="Expand sidebar"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}

        {/* Navigation — scrolls independently */}
        <nav className={cn(
          "flex-1 py-4 overflow-y-auto overflow-x-hidden min-h-0",
          collapsed ? "px-2 space-y-1" : "px-3 space-y-5"
        )}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className={cn("px-2 mb-1.5 text-[9px] font-bold uppercase tracking-widest select-none", s("text-white/35", "text-gray-400"))}>
                  {group.label}
                </p>
              )}

              {collapsed && (
                <div className={cn("my-2 border-t", s("border-white/10", "border-gray-200"))} />
              )}

              <div className={cn("space-y-0.5", collapsed && "space-y-1")}>
                {group.items.map((item) => {
                  const isActive =
                    location === item.href ||
                    (item.href !== "/" && location.startsWith(item.href + "/"));

                  /* ── Collapsed item ── */
                  if (collapsed) {
                    return (
                      <div key={item.href} className="relative group/tip" style={{ zIndex: isActive ? 1 : "auto" }}>
                        {/* Concave corner — top */}
                        {isActive && (
                          <span className="pointer-events-none absolute z-[2]"
                            style={{ right: -8, top: -10, width: 10, height: 10,
                              background: sidebarLight ? "#ffffff" : "hsl(var(--sidebar))", borderBottomLeftRadius: 10 }} />
                        )}
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center justify-center h-9 rounded-xl transition-all duration-150",
                            isActive
                              ? "nav-active-tab-sm bg-sidebar-active shadow-md shadow-sidebar-active/30"
                              : cn("w-full", s("hover:bg-white/10", "hover:bg-gray-100"))
                          )}
                        >
                          <item.icon className={cn(
                            "w-[17px] h-[17px] shrink-0",
                            isActive
                              ? "text-white"
                              : cn(s("text-white/45 group-hover/tip:text-white", "text-gray-400 group-hover/tip:text-gray-700"))
                          )} />
                        </Link>
                        {/* Concave corner — bottom */}
                        {isActive && (
                          <span className="pointer-events-none absolute z-[2]"
                            style={{ right: -8, bottom: -10, width: 10, height: 10,
                              background: sidebarLight ? "#ffffff" : "hsl(var(--sidebar))", borderTopLeftRadius: 10 }} />
                        )}
                        {/* Tooltip */}
                        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
                                        opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150">
                          <div className="bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                            {item.label}
                            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                          </div>
                        </div>
                      </div>
                    );
                  }

                  /* ── Expanded item ── */
                  return (
                    <div key={item.href} className="relative" style={{ zIndex: isActive ? 1 : "auto" }}>
                      {/* Concave corner — top */}
                      {isActive && (
                        <span className="pointer-events-none absolute z-[2]"
                          style={{ right: -12, top: -12, width: 12, height: 12,
                            background: sidebarLight ? "#ffffff" : "hsl(var(--sidebar))", borderBottomLeftRadius: 12 }} />
                      )}
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150",
                          isActive
                            ? "nav-active-tab bg-sidebar-active text-white shadow-lg shadow-sidebar-active/25"
                            : cn(s("text-white/55 hover:bg-white/8 hover:text-white", "text-gray-500 hover:bg-gray-100 hover:text-gray-800"))
                        )}
                      >
                        <item.icon className={cn(
                          "w-[15px] h-[15px] shrink-0 transition-colors",
                          isActive
                            ? "text-white"
                            : cn(s("text-white/45 group-hover:text-white", "text-gray-400 group-hover:text-gray-700"))
                        )} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {isActive && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s("bg-white/70", "bg-sidebar-active"))} />}
                      </Link>
                      {/* Concave corner — bottom */}
                      {isActive && (
                        <span className="pointer-events-none absolute z-[2]"
                          style={{ right: -12, bottom: -12, width: 12, height: 12,
                            background: sidebarLight ? "#ffffff" : "hsl(var(--sidebar))", borderTopLeftRadius: 12 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── User Profile Footer — always at bottom ── */}
        <div className={cn(
          "shrink-0",
          sidebarLight ? "border-t border-gray-200" : "border-t border-white/8",
          collapsed ? "p-2" : "p-3"
        )}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className={cn("w-8 h-8 rounded-full bg-sidebar-active/40 flex items-center justify-center text-[11px] font-bold", s("text-white border border-white/20", "text-white border border-sidebar-active/30"))}>
                {getInitials(userName)}
              </div>
              <button
                onClick={handleLogout}
                className={cn("transition-colors p-1 rounded-lg hover:text-red-400", s("text-white/40 hover:bg-white/10", "text-gray-400 hover:bg-gray-100"))}
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {/* User info row */}
              <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl">
                <div className={cn("w-8 h-8 rounded-full bg-sidebar-active/40 flex items-center justify-center text-[11px] font-bold shrink-0", s("text-white border border-white/20", "text-white border border-sidebar-active/30"))}>
                  {getInitials(userName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[12px] font-semibold truncate leading-tight", s("text-white", "text-gray-800"))}>{userName}</p>
                  <p className={cn("text-[10px] truncate leading-tight capitalize", s("text-white/45", "text-gray-400"))}>{userRole} · {userEmail}</p>
                </div>
              </div>
              {/* Logout button */}
              <button
                onClick={handleLogout}
                className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium hover:text-red-400 hover:bg-red-500/10 transition-all duration-150", s("text-white/50", "text-gray-500"))}
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Top header ─────────────────────────────────────────── */}
        <header className="h-14 bg-card border-b border-border flex items-center gap-3 px-5 shrink-0 shadow-sm z-10">

          {/* Left — branch + date/time */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <MapPin className="w-[14px] h-[14px] text-primary shrink-0" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Branch</span>
            <span className="text-border text-xs">:</span>
            <span className="font-semibold text-[13px] text-foreground truncate">
              {storedUser.branchName || "Head Office"}
            </span>
            <span className="mx-1 text-border">|</span>
            <span className="text-[12px] text-muted-foreground hidden sm:block">
              {now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="mx-1 text-border hidden sm:block">·</span>
            <span className="text-[12px] font-mono font-medium text-foreground tabular-nums hidden sm:block">
              {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>

          {/* Centre — search bar */}
          <div className="flex-1 flex justify-center px-4">
            <div ref={searchContainerRef} className="relative w-full max-w-sm">
              {searchOpen ? (
                <>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground z-10" />
                  <input
                    ref={searchRef}
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setSearchFocused(true); }}
                    onFocus={() => setSearchFocused(true)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search employees, branches, pages…"
                    className="w-full h-8 pl-8 pr-8 rounded-lg bg-muted border border-border text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(""); setSearchResults([]); searchRef.current?.focus(); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Results Dropdown */}
                  {searchFocused && searchQuery.trim() && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                      {searchLoading ? (
                        <div className="px-4 py-3 text-[13px] text-muted-foreground animate-pulse">Searching…</div>
                      ) : searchResults.length === 0 ? (
                        <div className="px-4 py-3 text-[13px] text-muted-foreground">No results for "{searchQuery}"</div>
                      ) : (
                        <>
                          {(["page", "employee", "branch"] as const).map(type => {
                            const group = searchResults.filter(r => r.type === type);
                            if (!group.length) return null;
                            const groupLabel = type === "page" ? "Pages" : type === "employee" ? "Employees" : "Branches";
                            return (
                              <div key={type}>
                                <div className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{groupLabel}</div>
                                {group.map((result, i) => {
                                  const globalIdx = searchResults.indexOf(result);
                                  const isSelected = globalIdx === selectedIdx;
                                  return (
                                    <button
                                      key={i}
                                      onMouseDown={() => navigateToResult(result.href)}
                                      onMouseEnter={() => setSelectedIdx(globalIdx)}
                                      className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                                        isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
                                      )}
                                    >
                                      <div className={cn(
                                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                                        isSelected ? "bg-primary/20" : "bg-muted"
                                      )}>
                                        <result.icon className={cn("w-3.5 h-3.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium truncate">{result.label}</p>
                                        {result.sub && <p className="text-[11px] text-muted-foreground truncate">{result.sub}</p>}
                                      </div>
                                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })}
                          <div className="px-3 py-2 border-t border-border text-[10px] text-muted-foreground">
                            Press <kbd className="bg-muted border border-border rounded px-1 py-0.5 font-mono">Enter</kbd> to go · <kbd className="bg-muted border border-border rounded px-1 py-0.5 font-mono">↑↓</kbd> to navigate · <kbd className="bg-muted border border-border rounded px-1 py-0.5 font-mono">Esc</kbd> to close
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-2 h-8 px-3 rounded-lg bg-muted border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all w-full"
                >
                  <Search className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 text-left">Search employees, branches, pages…</span>
                  <kbd className="text-[10px] bg-background border border-border rounded px-1.5 py-0.5 font-mono hidden md:inline">⌘K</kbd>
                </button>
              )}
            </div>
          </div>

          {/* Right — notification + user */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Notification bell */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotifOpen(o => !o)}
                className="relative p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <Bell className="w-[18px] h-[18px]" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-card animate-pulse" />
              </button>

              {/* Notification dropdown */}
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="font-semibold text-[13px]">Notifications</span>
                    <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">3</span>
                  </div>
                  <div className="divide-y divide-border max-h-72 overflow-y-auto">
                    {[
                      { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50", title: "12 Absent Today", desc: "Employees haven't checked in yet", time: "Just now" },
                      { icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-50", title: "5 Late Arrivals", desc: "Checked in after shift start time", time: "10 min ago" },
                      { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50", title: "Payroll Processed", desc: "March 2026 payroll is ready", time: "1 hr ago" },
                      { icon: Info, color: "text-blue-500", bg: "bg-blue-50", title: "New Employee Added", desc: "Kamal Perera joined Head Office", time: "2 hrs ago" },
                    ].map((n, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", n.bg)}>
                          <n.icon className={cn("w-4 h-4", n.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-foreground truncate">{n.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{n.desc}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{n.time}</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 border-t border-border">
                    <button className="w-full text-[12px] text-primary font-medium hover:underline text-center">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-border" />

            {/* User chip + dropdown */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold border border-primary/30 shrink-0">
                  {getInitials(userName)}
                </div>
                <div className="hidden md:block leading-tight text-left">
                  <p className="text-[12px] font-semibold text-foreground">{userName}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{userRole}</p>
                </div>
              </button>

              {/* User dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-border bg-muted/40">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px] font-bold border border-primary/30 shrink-0">
                        {getInitials(userName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-foreground truncate">{userName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{userEmail}</p>
                      </div>
                    </div>
                    <span className="mt-2 inline-block text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 font-medium capitalize">
                      {userRole}
                    </span>
                  </div>
                  {/* Logout */}
                  <div className="p-1.5">
                    <button
                      onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable page content — only this area scrolls */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
