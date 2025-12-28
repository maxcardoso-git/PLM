import { Link } from 'react-router-dom';
import { Workflow, FileText, Settings, ArrowRight } from 'lucide-react';
import { useTenant } from '../context/TenantContext';

export function DashboardPage() {
  const { tenant, organization } = useTenant();

  const quickLinks = [
    {
      title: 'Pipelines',
      description: 'Manage your workflow pipelines and Kanban boards',
      icon: Workflow,
      href: '/pipelines',
      color: 'bg-blue-500',
    },
    {
      title: 'Forms',
      description: 'Design and manage form definitions',
      icon: FileText,
      href: '/forms',
      color: 'bg-purple-500',
    },
    {
      title: 'Settings',
      description: 'Configure automations and integrations',
      icon: Settings,
      href: '/settings',
      color: 'bg-gray-500',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to PLM</h1>
        <p className="text-gray-500 mt-2">
          Pipeline Management - Your multi-tenant workflow engine
        </p>
      </div>

      {/* Context Info */}
      {tenant && organization && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">Current Context</h3>
              <p className="text-sm text-gray-500">
                {tenant.name} / {organization.name}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow group"
          >
            <div className={`w-12 h-12 rounded-lg ${link.color} flex items-center justify-center mb-4`}>
              <link.icon size={24} className="text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {link.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{link.description}</p>
            <div className="flex items-center gap-1 text-blue-600 text-sm mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              Go to {link.title}
              <ArrowRight size={16} />
            </div>
          </Link>
        ))}
      </div>

      {/* Getting Started */}
      {(!tenant || !organization) && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900">Getting Started</h3>
          <p className="text-blue-700 text-sm mt-2">
            Select a tenant and organization from the sidebar to start managing your pipelines.
          </p>
        </div>
      )}
    </div>
  );
}
