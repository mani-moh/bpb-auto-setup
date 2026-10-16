import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Server, CheckCircle, AlertCircle, Clock, RefreshCw, Trash2,
  ExternalLink, Download, Upload, Settings, Shield, Activity, Copy, Eye, EyeOff
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import type { Deployment } from '../types';

export function DeploymentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = useApi();
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [health, setHealth] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [showKey, setShowKey] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.db?.deployments?.get?.(id);
        if (res?.success && res.data) {
          setDeployment(res.data);
          // Health check
          setTimeout(async () => {
            try {
              const hRes = await api.panel?.healthCheck?.(res.data.panelUrl, res.data.managementKey);
              if (hRes?.success) setHealth(hRes.data);
            } catch {}
          }, 500);
          // Load config
          try {
            const cRes = await api.panel?.getConfig?.(res.data.panelUrl, res.data.managementKey);
            if (cRes?.success) setConfig(cRes.data);
          } catch {}
        } else {
          setError(res?.error || 'Deployment not found');
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, api]);

  const handleDelete = async () => {
    if (!deployment || !confirm('Delete this deployment permanently? This removes only the local record; the Worker remains on Cloudflare until manually deleted.')) return;
    setDeleting(true);
    try {
      await api.db?.deployments?.delete?.(deployment.id);
      navigate('/');
    } catch (e: any) {
      setError(e?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const refreshHealth = async () => {
    if (!deployment) return;
    try {
      const res = await api.panel?.healthCheck?.(deployment.panelUrl, deployment.managementKey);
      if (res?.success) setHealth(res.data);
    } catch {}
  };

  const handleCopyUrl = () => {
    if (deployment?.panelUrl) navigator.clipboard.writeText(deployment.panelUrl);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (error && !deployment) {
    return (
      <div className="card text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-slate-900 mb-2">Failed to load deployment</h2>
        <p className="text-slate-500 mb-4">{error}</p>
        <button onClick={() => navigate('/')} className="btn-primary">Return to Dashboard</button>
      </div>
    );
  }

  if (!deployment) return null;

  const getStatusBadge = () => {
    switch (deployment.status) {
      case 'active': return <span className="badge-success"><CheckCircle className="h-3 w-3 mr-1" /> Active</span>;
      case 'deploying': return <span className="badge-info"><Clock className="h-3 w-3 mr-1" /> Deploying</span>;
      case 'error': return <span className="badge-error"><AlertCircle className="h-3 w-3 mr-1" /> Error</span>;
      default: return <span className="badge-warning">Inactive</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate('/')} className="btn-secondary text-sm inline-flex">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
      </button>

      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{deployment.name}</h2>
            <p className="text-slate-500">{deployment.type === 'workers' ? 'Cloudflare Workers' : 'Cloudflare Pages'} · Version {deployment.version}</p>
          </div>
          <div className="flex gap-2">{getStatusBadge()}</div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-6 text-sm">
          <div>
            <span className="text-slate-500 block">Account</span>
            <span className="font-medium text-slate-900 truncate">{deployment.accountEmail}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Worker</span>
            <span className="font-medium text-slate-900">{deployment.workerName}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Created</span>
            <span className="font-medium text-slate-900">{new Date(deployment.createdAt).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Connection */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary-600" />
            <h3 className="font-bold text-lg">Panel Connection</h3>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
              <span className="text-sm text-slate-600">Panel URL</span>
              <div className="flex gap-2">
                <a href={deployment.panelUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs"><ExternalLink className="h-3 w-3" /> Open</a>
                <button onClick={handleCopyUrl} className="btn-secondary text-xs"><Copy className="h-3 w-3" /> Copy</button>
              </div>
            </div>
            <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
              <span className="text-sm text-slate-600">Worker URL</span>
              <span className="text-sm text-slate-900 font-medium truncate max-w-[200px]">{deployment.workerUrl}</span>
            </div>
            <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
              <span className="text-sm text-slate-600">Secure Path</span>
              <span className="font-mono text-xs bg-slate-200 px-2 py-0.5 rounded">/{deployment.securePath}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center gap-4">
            <button onClick={refreshHealth} className="btn-secondary text-xs"><RefreshCw className="h-3 w-3 mr-1" /> Refresh Health</button>
            <span className={`text-xs font-medium ${health?.healthy ? 'text-green-600' : 'text-red-500'}`}>
              {health ? (health.healthy ? 'Healthy' : 'Unhealthy') : 'Unknown'}
            </span>
            {health?.latency && <span className="text-xs text-slate-400">{health.latency}ms</span>}
          </div>
        </div>

        {/* Management */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-lg">Management</h3>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Management Key</span>
              <button onClick={() => setShowKey(!showKey)} className="text-xs text-slate-500 hover:text-slate-700">{showKey ? 'Hide' : 'Show'}</button>
            </div>
            <div className="font-mono text-xs break-all bg-white border border-slate-200 rounded p-2">{showKey ? deployment.managementKey : '••••••••••••••••'}</div>
          </div>

          <div className="flex gap-2 pt-2">
            <a href={`${deployment.panelUrl}/${deployment.managementKey}/panel`} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm flex-1 text-center">Open Management</a>
          </div>
        </div>
      </div>

      {/* Config */}
      {config && (
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-600" />
            <h3 className="font-bold text-lg">Panel Config</h3>
          </div>
          <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-xs font-mono leading-relaxed">{JSON.stringify(config, null, 2)}</pre>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button onClick={() => navigate('/')} className="btn-secondary">Back to List</button>
        <button onClick={handleDelete} disabled={deleting} className="btn-danger flex items-center gap-1">
          <Trash2 className="h-4 w-4" /> {deleting ? 'Deleting...' : 'Delete Record'}
        </button>
      </div>
    </div>
  );
}
