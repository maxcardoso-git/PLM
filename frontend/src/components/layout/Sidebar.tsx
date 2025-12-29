import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Workflow, FileText, Settings, Building2, User } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { clsx } from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Pipelines', href: '/pipelines', icon: Workflow },
  { name: 'Forms', href: '/forms', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { tenant, organization } = useTenant();

  return (
    <div className="flex flex-col w-64 bg-gray-900 text-white h-screen">
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <Link to="/" className="flex items-center gap-3">
          <img src="/PLM-logo.svg" alt="PLM" className="w-10 h-10" />
          <div>
            <h1 className="text-xl font-bold">PLM</h1>
            <p className="text-xs text-gray-400">Pipeline Management</p>
          </div>
        </Link>
      </div>

      {/* TAH Context Info */}
      <div className="p-4 border-b border-gray-800 space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Building2 size={14} />
          <span className="uppercase tracking-wider">Context (TAH)</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-800 rounded text-sm">
            <User size={14} className="text-gray-500" />
            <span className="text-gray-300 truncate">
              {tenant?.name || 'Not authenticated'}
            </span>
          </div>
          {organization && (
            <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-800 rounded text-sm">
              <Building2 size={14} className="text-gray-500" />
              <span className="text-gray-300 truncate">{organization.name}</span>
            </div>
          )}
        </div>
        {!tenant && (
          <p className="text-xs text-gray-500 italic">
            Login via TAH to access pipelines
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              to={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
        PLM v1.0.0
      </div>
    </div>
  );
}
