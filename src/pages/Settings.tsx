import React, { useState } from 'react';
import { Settings, Globe, Monitor, HardDrive, ShieldCheck, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useSettings } from '../hooks/useApi';

export function SettingsPage() {
  const api = useApi();
  const { settings, load, set } = useSettings();
  const [saving, setSaving] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [logLevel, setLogLevel] = useState(settings.logLevel || 'info');
  const [telemetry, setTelemetry] = useState(settings.telemetryEnabled === 'true' || settings.telemetryEnabled === true);

  const handleSave = async () => {
    setSaving(true);
    try {
      await set('logLevel', logLevel);
      await set('telemetryEnabled', String(telemetry));
      await set('browserHeadless', 'false');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleClearData = async () => {
    if (!clearConfirm) { setClearConfirm(true); return; }
    try {
      // Delete all deployments, accounts, emails
      const res = await api.db?.deployments?.list?.();
      if (res?.success && res.data) {
        for (const d of res.data) {
          await api.db?.deployments?.delete?.(d.id);
        }
      }
      const aRes = await api.db?.accounts?.list?.();
      if (aRes?.success && aRes.data) {
        for (const a of aRes.data) {
          await api.db?.accounts?.delete?.(a.id);
        }
      }
      const eRes = await api.db?.emails?.list?.();
      if (eRes?.success && eRes.data) {
        for (const e of eRes.data) {
          await api.db?.emails?.delete?.(e.id);
        }
      }
      await load();
      setClearConfirm(false);
    } catch {}
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
          <p className="text-slate-500">Configure the application behavior and data storage.</p>
        </div>
      </div>

      <div className="card space-y-6">
        <h3 className="font-bold text-lg flex items-center gap-2"><Monitor className="h-5 w-5 text-primary-600" /> Browser</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Browser Mode</label>
            <select disabled className="input bg-slate-50" value="visible">
              <option>Visible (non-headless)</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">Headless is disabled for human verification steps.</p>
          </div>
          <div>
            <label className="label">Slow Motion (ms)</label>
            <input type="number" disabled value="0" className="input bg-slate-50" />
          </div>
        </div>
      </div>

      <div className="card space-y-6">
        <h3 className="font-bold text-lg flex items-center gap-2"><Globe className="h-5 w-5 text-blue-600" /> Email Provider</h3>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <h4 className="font-medium">Manual Signup</h4>
            <p className="text-xs text-slate-500">Open provider page and complete manually. Supported by any provider.</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <h4 className="font-medium">Custom Domain</h4>
            <p className="text-xs text-slate-500">Use your domain with catch-all or aliases.</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <h4 className="font-medium">API Providers</h4>
            <p className="text-xs text-slate-500">Mailgun, Hostinger — require paid plans.</p>
          </div>
        </div>
      </div>

      <div className="card space-y-6">
        <h3 className="font-bold text-lg flex items-center gap-2"><HardDrive className="h-5 w-5 text-amber-600" /> Storage & Logs</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Log Level</label>
            <select value={logLevel} onChange={e => setLogLevel(e.target.value)} className="input">
              <option>debug</option>
              <option>info</option>
              <option>warn</option>
              <option>error</option>
            </select>
          </div>
          <div>
            <label className="label">Telemetry</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setTelemetry(!telemetry)} className={`px-3 py-2 rounded-lg text-sm font-medium border ${telemetry ? 'bg-green-50 border-green-300 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                {telemetry ? 'Enabled' : 'Disabled'}
              </button>
              <span className="text-xs text-slate-400">No data sent unless enabled.</span>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-sm">
          <span className="text-slate-500">Data directory (local-only):</span>
          <span className="font-mono text-xs ml-1">{settings.dataDirectory || 'App user data folder'}</span>
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-red-600" /> Security</h3>
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <Trash2 className="h-5 w-5 text-red-500" />
          <div className="flex-1">
            <h4 className="font-medium text-red-800">Clear All Local Data</h4>
            <p className="text-xs text-red-600">Removes deployments, accounts, email configs, and workflow state from this device.</p>
          </div>
          <button
            onClick={handleClearData}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${clearConfirm ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
          >
            {clearConfirm ? 'Confirm Clear' : 'Clear Data'}
          </button>
        </div>
        {clearConfirm && (
          <div className="flex items-center gap-2 text-xs text-red-500">
            <AlertCircle className="h-3 w-3" />
            Click again to confirm. This action cannot be undone.
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
          Save Settings
        </button>
      </div>
    </div>
  );
}
