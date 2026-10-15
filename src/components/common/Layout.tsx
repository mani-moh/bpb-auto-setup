import React, { ReactNode } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Layout, Menu, Home, Settings, Plus, Server, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface LayoutProps {
  children?: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const navigation = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/setup', label: 'New Deployment', icon: Plus },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <aside
        className={clsx(
          'fixed left-0 top-0 z-40 h-screen bg-white border-r border-slate-200 transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <Server className="h-8 w-8 text-primary-600" />
                <span className="font-bold text-xl text-slate-900">BPB Auto-Setup</span>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </NavLink>
            ))}

            <div className="mt-6 pt-6 border-t border-slate-200" />
            <div className="text-xs text-slate-400 px-3">
              {sidebarOpen && 'v1.0.0'}
            </div>
          </nav>
        </div>
      </aside>

      <main
        className={clsx(
          'transition-all duration-300 min-h-screen',
          sidebarOpen ? 'ml-64' : 'ml-20'
        )}
      >
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-sm border-b border-slate-200">
          <div className="h-full px-6 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-slate-900">
              {navigation.find(n => n.path === location.pathname)?.label || 'BPB Auto-Setup'}
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500 hidden sm:block">
                Local-first • Privacy-focused
              </span>
            </div>
          </div>
        </header>

        <div className="p-6">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
}