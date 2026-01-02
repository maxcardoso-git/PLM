import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Workflow, FileText, LayoutTemplate, Settings, Building2, User, Zap, LogOut } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { LanguageSelector } from './LanguageSelector';
import { clsx } from 'clsx';

const navigationKeys = [
  { key: 'dashboard', href: '/', icon: LayoutDashboard },
  { key: 'pipelineDesign', href: '/pipeline-design', icon: Workflow },
  { key: 'forms', href: '/forms', icon: FileText },
  { key: 'integrations', href: '/integrations', icon: Zap },
  { key: 'templates', href: '/templates', icon: LayoutTemplate },
  { key: 'settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { tenant, organization, user, logout } = useTenant();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await logout();
    // Redirect to TAH after logout
    window.location.href = 'http://72.61.52.70:3050';
  };

  return (
    <div className="flex flex-col w-64 bg-gray-900 text-white h-screen">
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <Link to="/" className="flex items-center gap-3">
          <img src="/PLM-Logo.png" alt="PLM" className="w-10 h-10" />
          <div>
            <h1 className="text-xl font-bold">PLM</h1>
            <p className="text-xs text-gray-400">{t('sidebar.pipelineManagement')}</p>
          </div>
        </Link>
      </div>

      {/* TAH Context Info */}
      <div className="p-4 border-b border-gray-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Building2 size={14} />
            <span className="uppercase tracking-wider">{t('sidebar.context')} (TAH)</span>
          </div>
          {user && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
              title="Sair"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
        <div className="space-y-1">
          {user ? (
            <>
              <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-800 rounded text-sm">
                <User size={14} className="text-blue-400" />
                <span className="text-gray-300 truncate" title={user.email}>
                  {user.name || user.email}
                </span>
              </div>
              {organization && (
                <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-800 rounded text-sm">
                  <Building2 size={14} className="text-gray-500" />
                  <span className="text-gray-300 truncate">{organization.name}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-800 rounded text-sm">
                <User size={14} className="text-gray-500" />
                <span className="text-gray-300 truncate">
                  {tenant?.name || t('sidebar.notAuthenticated')}
                </span>
              </div>
              {organization && (
                <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-800 rounded text-sm">
                  <Building2 size={14} className="text-gray-500" />
                  <span className="text-gray-300 truncate">{organization.name}</span>
                </div>
              )}
            </>
          )}
        </div>
        {!tenant && !user && (
          <p className="text-xs text-gray-500 italic">
            {t('sidebar.loginVia')}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigationKeys.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href));

          return (
            <Link
              key={item.key}
              to={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon size={20} />
              {t(`sidebar.${item.key}`)}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <LanguageSelector />
          <span className="text-xs text-gray-500">v1.0.0</span>
        </div>
      </div>
    </div>
  );
}
