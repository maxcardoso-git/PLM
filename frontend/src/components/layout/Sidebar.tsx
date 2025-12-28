import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Workflow, FileText, Settings, ChevronDown } from 'lucide-react';
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
  const { tenant, organization, tenants, organizations, setTenant, setOrganization } = useTenant();

  return (
    <div className="flex flex-col w-64 bg-gray-900 text-white h-screen">
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Workflow className="text-blue-400" />
          PLM
        </h1>
        <p className="text-xs text-gray-400 mt-1">Pipeline Management</p>
      </div>

      {/* Tenant/Org Selector */}
      <div className="p-4 border-b border-gray-800 space-y-3">
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider">Tenant</label>
          <div className="relative mt-1">
            <select
              value={tenant?.id || ''}
              onChange={(e) => {
                const t = tenants.find((t) => t.id === e.target.value);
                if (t) setTenant(t);
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select tenant...</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {tenant && (
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider">Organization</label>
            <div className="relative mt-1">
              <select
                value={organization?.id || ''}
                onChange={(e) => {
                  const org = organizations.find((o) => o.id === e.target.value);
                  if (org) setOrganization(org);
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select organization...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
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
