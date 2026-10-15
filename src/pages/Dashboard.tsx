import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Server, CheckCircle, AlertCircle, Clock, RefreshCw, Trash2, ExternalLink, Download, Upload, MoreVertical } from 'lucide-react';
import { useDeployments, useAccounts } from '../../hooks/useApi';
import type { Deployment } from '../../types';
import { formatDistanceToNow } from 'date-fns';

export function Dashboard() {
  const { deployments, loading, error, load, remove } = useDeployments();
  const { accounts } = useAccounts();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deployment? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await remove(id);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: Deployment['status']) => {
    switch (status) {
      case 'active':
        return <span className="badge-success"><CheckCircle className="h-3 w-3 mr-1" /> Active</span>;
      case 'deploying':
        return <span className="badge-info"><Clock className="h-3 w-3 mr-1" /> Deploying</span>;
      case 'error':
        return <span className="badge-error"><AlertCircle className="h-3 w-3 mr-1" /> Error</span>;
      default:
        return <span className="badge-warning">Inactive</span>;
    }
  };

  const getHealthBadge = (health?: Deployment['healthStatus']) => {
    switch (health) {
      case 'healthy':
        return <span className="badge-success"><CheckCircle className="h-3 w-3 mr-1" /> Healthy</span>;
      case 'unhealthy':
        return <span className="badge-error"><AlertCircle className="h-3 w-3 mr-1" /> Unhealthy</span>;
      default:
        return <span className="badge-warning">Unknown</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-slate-900 mb-2">Failed to load deployments</h2>
        <p className="text-slate-500 mb-4">{error}</p>
        <button onClick={load} className="btn-primary">
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Deployments</h2>
          <p className="text-slate-500 mt-1">Manage your BPB Worker Panel deployments</p>
        </div>
        <Link to="/setup" className="btn-primary">
          <Server className="h-4 w-4 mr-2" />
          New Deployment
        </Link>
      </div>

      {deployments.length === 0 ? (
        <div className="card text-center py-16">
          <Server className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No deployments yet</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Create your first BPB Worker Panel deployment by clicking the "New Deployment" button above.
          </p>
          <Link to="/setup" className="btn-primary inline-flex">
            <Server className="h-4 w-4 mr-2" />
            Create Deployment
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {deployments.map((deployment: Deployment) => (
            <div key={deployment.id} className="card relative">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">{deployment.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {deployment.type === 'workers' ? 'Cloudflare Workers' : 'Cloudflare Pages'}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 bg-slate-100 rounded-full text-slate-600">
                  v{deployment.version}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Status</span>
                  {getStatusBadge(deployment.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Health</span>
                  {getHealthBadge(deployment.healthStatus)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Account</span>
                  <span className="text-sm text-slate-900 truncate max-w-[150px]">{deployment.accountEmail}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Created</span>
                  <span className="text-sm text-slate-900">
                    {formatDistanceToNow(new Date(deployment.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-2">
                <a
                  href={deployment.panelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full btn-secondary"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Panel
                </a>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(deployment.panelUrl)}
                    className="btn-secondary text-sm"
                    title="Copy panel URL"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(deployment.id)}
                    disabled={deletingId === deployment.id}
                    className="btn-danger text-sm"
                    title="Delete deployment"
                  >
                    {deletingId === deployment.id ? (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Link
                to={`/deployments/${deployment.id}`}
                className="absolute inset-0 z-10"
                aria-label={`View ${deployment.name} details`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple copy icon
function Copy({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
  );
}