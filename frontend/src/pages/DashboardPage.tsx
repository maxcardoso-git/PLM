import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Workflow, FileText, Settings, ArrowRight, LayoutGrid, CheckCircle2, Clock, Users } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { api } from '../services/api';

interface DashboardStats {
  totalPipelines: number;
  publishedPipelines: number;
  draftPipelines: number;
  totalForms: number;
}

export function DashboardPage() {
  const { tenant, organization } = useTenant();
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats>({
    totalPipelines: 0,
    publishedPipelines: 0,
    draftPipelines: 0,
    totalForms: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!organization) return;

      setLoadingStats(true);
      try {
        const [allPipelines, publishedPipelines, draftPipelines, allForms] = await Promise.all([
          api.getPipelines(),
          api.getPipelines('published'),
          api.getPipelines('draft'),
          api.getForms(),
        ]);

        setStats({
          totalPipelines: allPipelines.items?.length || 0,
          publishedPipelines: publishedPipelines.items?.length || 0,
          draftPipelines: draftPipelines.items?.length || 0,
          totalForms: allForms.items?.length || 0,
        });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [organization]);

  const quickLinks = [
    {
      titleKey: 'sidebar.pipelines',
      descKey: 'dashboard.pipelinesDesc',
      icon: Workflow,
      href: '/pipelines',
      color: 'bg-blue-500',
    },
    {
      titleKey: 'dashboard.formsTitle',
      descKey: 'dashboard.formsDesc',
      icon: FileText,
      href: '/forms',
      color: 'bg-purple-500',
    },
    {
      titleKey: 'dashboard.settingsTitle',
      descKey: 'dashboard.settingsDesc',
      icon: Settings,
      href: '/settings',
      color: 'bg-gray-500',
    },
  ];

  const statCards = [
    {
      labelKey: 'dashboard.totalPipelines',
      value: stats.totalPipelines,
      icon: LayoutGrid,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      labelKey: 'dashboard.published',
      value: stats.publishedPipelines,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      labelKey: 'dashboard.drafts',
      value: stats.draftPipelines,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      labelKey: 'dashboard.formsTitle',
      value: stats.totalForms,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-500 mt-2">
          {t('dashboard.overview')}
        </p>
      </div>

      {/* Context Info */}
      {tenant && organization && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 mb-8 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Users size={24} />
            </div>
            <div className="flex-1">
              <p className="text-blue-100 text-sm">{t('dashboard.currentContext')}</p>
              <h3 className="font-semibold text-lg">
                {tenant.name} / {organization.name}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {organization && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <div key={stat.labelKey} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon size={20} className={stat.color} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {loadingStats ? '-' : stat.value}
                  </p>
                  <p className="text-xs text-gray-500">{t(stat.labelKey)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Links */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.quickLinks')}</h2>
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
              {t(link.titleKey)}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{t(link.descKey)}</p>
            <div className="flex items-center gap-1 text-blue-600 text-sm mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight size={16} />
            </div>
          </Link>
        ))}
      </div>

      {/* Getting Started */}
      {(!tenant || !organization) && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900">{t('dashboard.gettingStarted')}</h3>
          <p className="text-blue-700 text-sm mt-2">
            {t('dashboard.selectTenantMsg')}
          </p>
        </div>
      )}
    </div>
  );
}
