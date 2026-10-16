import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Shield, Cloud, Server, CheckCircle, AlertCircle, Play, Pause, RotateCcw,
  ChevronRight, ChevronLeft, ExternalLink, Lock, User, Globe, Settings2, Sparkles
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import type { EmailConfig, WorkflowStep, Deployment } from '../types';

export function SetupWizard() {
  const navigate = useNavigate();
  const api = useApi();
  const [step, setStep] = useState<number>(0);
  const [email, setEmail] = useState<string>('');
  const [emailPassword, setEmailPassword] = useState<string>('');
  const [emailProvider, setEmailProvider] = useState<string>('manual');
  const [providerList, setProviderList] = useState<any[]>([]);
  const [providerUrl, setProviderUrl] = useState<string>('');
  const [domain, setDomain] = useState<string>('');
  const [cloudflareMode, setCloudflareMode] = useState<'existing' | 'new'>('existing');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenVerification, setTokenVerification] = useState<any>(null);
  const [workerName, setWorkerName] = useState<string>('');
  const [deployType, setDeployType] = useState<'workers' | 'pages'>('workers');
  const [preRelease, setPreRelease] = useState<boolean>(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Load providers on mount
  useEffect(() => {
    if (api.email && typeof api.email.providers === 'function') {
      api.email.providers().then((res: any) => {
        if (res?.success) setProviderList(res.data || []);
      });
    }
  }, [api]);

  const steps = [
    { title: 'Email Setup', icon: Mail },
    { title: 'Cloudflare Auth', icon: Shield },
    { title: 'Deployment Config', icon: Server },
    { title: 'Deploy', icon: Play },
    { title: 'Complete', icon: CheckCircle },
  ];

  // Email generation
  const generateEmail = useCallback(async () => {
    setErrorMessage('');
    try {
      const res = await api.email?.generate?.();
      if (res?.success && res.data) {
        const generated = res.data;
        setEmail(`${generated.localPart}@gmail.com`);
        setEmailPassword(generated.password);
        setWorkflowStep('email_setup');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to generate email');
    }
  }, [api]);

  // Email provisioning / browser open
  const openProviderSignup = useCallback(async () => {
    setErrorMessage('');
    try {
      const url = await api.email?.providerUrl?.(emailProvider);
      if (url && typeof url === 'string') {
        setProviderUrl(url);
        // Open visible browser for manual signup
        await api.browser?.open?.(false);
        await api.browser?.navigate?.(url);
        setIsBrowserOpen(true);
        setWorkflowStep('email_provisioning');
      } else if (url && url.success) {
        setProviderUrl(url.data);
        await api.browser?.open?.(false);
        await api.browser?.navigate?.(url.data);
        setIsBrowserOpen(true);
        setWorkflowStep('email_provisioning');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to open provider');
    }
  }, [api, emailProvider]);

  // Verify email (manual confirmation)
  const confirmEmailVerified = useCallback(async () => {
    setIsVerifying(true);
    setErrorMessage('');
    try {
      // In practice, user confirms they have access to the mailbox
      // We could poll IMAP or ask user to confirm
      await new Promise(r => setTimeout(r, 1000));
      setWorkflowStep('email_verification');
      setIsVerifying(false);
      setStep(1); // Move to cloudflare
    } catch (e: any) {
      setErrorMessage(e?.message || 'Verification failed');
      setIsVerifying(false);
    }
  }, []);

  // Validate token
  const validateToken = useCallback(async () => {
    setErrorMessage('');
    setTokenValid(null);
    setTokenVerification(null);
    if (!tokenInput.trim()) return;
    try {
      const res = await api.cloudflare?.validateToken?.(tokenInput.trim());
      if (res?.success) {
        setTokenVerification(res.data);
        setTokenValid(res.data?.valid || false);
        if (res.data?.valid) {
          setWorkflowStep('cloudflare_existing_token');
        }
      } else {
        setTokenValid(false);
        setErrorMessage(res?.error || 'Invalid token');
      }
    } catch (e: any) {
      setTokenValid(false);
      setErrorMessage(e?.message || 'Token validation failed');
    }
  }, [api, tokenInput]);

  // Start new Cloudflare signup in browser
  const startCloudflareSignup = useCallback(async () => {
    setErrorMessage('');
    try {
      const res = await api.cloudflare?.startSignup?.(email || '');
      if (res?.success && res.data?.url) {
        await api.browser?.open?.(false);
        await api.browser?.navigate?.(res.data.url);
        setIsBrowserOpen(true);
        setWorkflowStep('cloudflare_new_signup');
      } else {
        setErrorMessage(res?.error || 'Failed to start signup');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to start signup');
    }
  }, [api, email]);

  // Create token URL
  const createTokenUrl = useCallback(async () => {
    setErrorMessage('');
    try {
      const res = await api.cloudflare?.createTokenUrl?.();
      if (res?.success && res.data) {
        await api.browser?.open?.(false);
        await api.browser?.navigate?.(res.data);
        setIsBrowserOpen(true);
        setWorkflowStep('cloudflare_token_creation');
      } else {
        setErrorMessage(res?.error || 'Failed to create token URL');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to generate token URL');
    }
  }, [api]);

  // Deploy
  const deployPanel = useCallback(async () => {
    setIsDeploying(true);
    setErrorMessage('');
    setDeploymentResult(null);
    try {
      if (!tokenInput.trim() && !tokenVerification) {
        setErrorMessage('Cloudflare token required');
        setIsDeploying(false);
        return;
      }

      const token = tokenVerification ? undefined : tokenInput.trim();
      // We need account info - from verification or manual input
      const accountId = tokenVerification?.accountId || '';
      const accountEmail = tokenVerification?.email || email || '';
      const worker = workerName.trim() || 'bpb-panel';

      if (!worker) {
        setErrorMessage('Worker name is required');
        setIsDeploying(false);
        return;
      }

      const result = await api.deployment?.start?.({
        token: token || '',
        accountId,
        accountEmail,
        workerName: worker,
        deployType,
        preRelease,
      });

      if (result?.success && result.data) {
        setDeploymentResult(result.data);
        setWorkflowStep('complete');
        setStep(4);

        // Save to database
        const deployment: Partial<Deployment> = {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2),
          name: worker,
          accountId,
          accountEmail,
          type: deployType,
          workerName: worker,
          workerUrl: result.data.panelUrl,
          panelUrl: result.data.panelUrl,
          securePath: result.data.securePath || '',
          version: '5.1.1',
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          kvNamespaceId: result.data.kvNamespaceId || '',
          managementKey: result.data.managementKey || '',
        };
        await api.db?.deployments?.create?.(deployment as any);
      } else {
        setErrorMessage(result?.error || 'Deployment failed');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Deployment error');
    } finally {
      setIsDeploying(false);
    }
  }, [api, tokenInput, tokenVerification, email, workerName, deployType, preRelease]);

  // Navigation
  const canProceed = (currentStep: number) => {
    switch (currentStep) {
      case 0: return !!email && (emailProvider === 'custom-domain' ? !!domain : true);
      case 1: return tokenValid === true || !!tokenVerification;
      case 2: return !!workerName.trim();
      case 3: return true;
      default: return true;
    }
  };

  const nextStep = () => {
    if (canProceed(step) && step < steps.length - 1) {
      setStep(step + 1);
      if (step === 0) setWorkflowStep('email_verification');
      if (step === 1) setWorkflowStep('deployment_config');
    }
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  // Check browser state
  useEffect(() => {
    const check = async () => {
      const res = await api.browser?.isRunning?.();
      if (res?.success) setIsBrowserOpen(!!res.data);
    };
    check();
    const interval = setInterval(check, 3000);
    return () => clearInterval(interval);
  }, [api]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header with steps */}
      <div className="card">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">New Deployment</h2>
        <p className="text-slate-500">Set up your BPB Worker Panel with guided browser automation.</p>
        <div className="flex items-center gap-2 mt-6 overflow-x-auto">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const completed = i < step;
            return (
              <div key={s.title} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
                active ? 'bg-primary-50 text-primary-700 font-medium ring-1 ring-primary-200' :
                completed ? 'bg-green-50 text-green-700 font-medium' : 'text-slate-400'
              }`}>
                <Icon className="h-4 w-4" />
                <span>{s.title}</span>
                {completed && <CheckCircle className="h-3 w-3" />}
                {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-slate-300" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Errors */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Step 0: Email Setup */}
      {step === 0 && (
        <div className="card space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Email Setup</h3>
              <p className="text-sm text-slate-500">Generate or configure an email address for verification</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="label">Provider</label>
                <select
                  value={emailProvider}
                  onChange={e => setEmailProvider(e.target.value)}
                  className="input"
                >
                  {providerList.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Custom Domain (if using catch-all)</label>
                <input
                  type="text"
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  placeholder="example.com"
                  className="input"
                  disabled={emailProvider !== 'custom-domain'}
                />
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-slate-900">Generated Address</h4>
                <button onClick={generateEmail} className="btn-secondary text-xs">
                  <Sparkles className="h-3 w-3 mr-1" /> Generate
                </button>
              </div>

              {email ? (
                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="font-mono text-slate-900">{email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Lock className="h-4 w-4 text-slate-400" />
                    <span className="font-mono text-slate-600 truncate">{emailPassword}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-400 italic">Click Generate to create an address</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={openProviderSignup}
              disabled={!email || isBrowserOpen}
              className="btn-primary"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {isBrowserOpen ? 'Browser Open' : 'Open Provider Signup'}
            </button>
            {email && (
              <button onClick={confirmEmailVerified} disabled={isVerifying} className="btn-secondary">
                {isVerifying ? <RotateCcw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                I Confirmed Access
              </button>
            )}
          </div>

          {isBrowserOpen && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <Play className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 font-medium">Action Required in Browser</p>
                <p className="text-amber-600 text-sm">Complete the signup and verification directly in the visible browser window. Click "I Confirmed Access" when done.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 1: Cloudflare Auth */}
      {step === 1 && (
        <div className="card space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Cloudflare Account</h3>
              <p className="text-sm text-slate-500">Authenticate with Cloudflare to deploy</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setCloudflareMode('existing'); setTokenValid(null); setTokenVerification(null); }}
              className={`flex-1 px-4 py-3 rounded-xl border-2 text-sm font-medium transition ${
                cloudflareMode === 'existing' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <User className="h-4 w-4 mx-auto mb-1" /> Existing Account
            </button>
            <button
              onClick={() => { setCloudflareMode('new'); setTokenValid(null); setTokenVerification(null); }}
              className={`flex-1 px-4 py-3 rounded-xl border-2 text-sm font-medium transition ${
                cloudflareMode === 'new' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Globe className="h-4 w-4 mx-auto mb-1" /> First-Time Registration
            </button>
          </div>

          {cloudflareMode === 'existing' && (
            <div className="space-y-4">
              <div>
                <label className="label">API Token (scoped permissions required)</label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={e => { setTokenInput(e.target.value); setTokenValid(null); }}
                  placeholder="Paste your Cloudflare API token"
                  className={`input ${tokenValid === false ? 'input-error' : ''}`}
                />
                <p className="text-xs text-slate-400 mt-1">Requires Workers Scripts Edit, KV Storage Edit, Pages Edit, DNS Edit, User Details Read.</p>
              </div>
              <button onClick={validateToken} disabled={!tokenInput.trim()} className="btn-primary">
                <Shield className="h-4 w-4 mr-2" /> Validate Token
              </button>

              {tokenVerification && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-800 text-sm font-medium">Token valid — {tokenVerification.email}</p>
                  <p className="text-green-600 text-xs">Account ID: <span className="font-mono">{tokenVerification.accountId}</span></p>
                </div>
              )}
            </div>
          )}

          {cloudflareMode === 'new' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">We will open the official Cloudflare signup page in a visible browser with your email pre-filled.</p>
              <button onClick={startCloudflareSignup} className="btn-primary">
                <ExternalLink className="h-4 w-4 mr-2" /> Open Cloudflare Signup
              </button>
              {isBrowserOpen && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <Play className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-800 font-medium">Action Required in Browser</p>
                    <p className="text-amber-600 text-sm">Complete the Cloudflare account creation, email verification, and consent steps. After logging in, go to Profile → API Tokens to create a token with required permissions.</p>
                  </div>
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800 text-sm font-medium">Next Steps After Signup</p>
                <ol className="text-blue-700 text-sm list-decimal list-inside mt-1 space-y-1">
                  <li>Confirm email verification in your mailbox.</li>
                  <li>Log in to the Cloudflare dashboard.</li>
                  <li>Create an API Token with Workers Scripts Edit, KV Edit, Pages Edit, DNS Edit.</li>
                  <li>Copy the token and paste it in "Existing Account" mode above.</li>
                </ol>
              </div>
              <button onClick={createTokenUrl} className="btn-secondary text-sm">
                <Settings2 className="h-4 w-4 mr-1" /> Open Token Creation Page
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Deployment Config */}
      {step === 2 && (
        <div className="card space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Deployment Config</h3>
              <p className="text-sm text-slate-500">Review resources before deploying</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Worker / Project Name</label>
              <input
                type="text"
                value={workerName}
                onChange={e => setWorkerName(e.target.value)}
                placeholder="bpb-panel"
                className="input"
              />
              <p className="text-xs text-slate-400 mt-1">Used for the worker URL and subdomain.</p>
            </div>

            <div>
              <label className="label">Deployment Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeployType('workers')}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium ${deployType === 'workers' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}
                >
                  Workers
                </button>
                <button
                  onClick={() => setDeployType('pages')}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium ${deployType === 'pages' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}
                >
                  Pages
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <h4 className="font-medium text-slate-900">Deployment Preview</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Project</span> <span className="font-medium text-slate-900">{workerName || 'pending'}</span></div>
              <div><span className="text-slate-500">Type</span> <span className="font-medium text-slate-900 capitalize">{deployType}</span></div>
              <div><span className="text-slate-500">Version</span> <span className="font-medium text-slate-900">5.1.1 (stable)</span></div>
              <div><span className="text-slate-500">Account</span> <span className="font-medium text-slate-900 truncate">{tokenVerification?.email || email || 'pending'}</span></div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={preRelease} onChange={e => setPreRelease(e.target.checked)} className="rounded" />
              Use pre-release version (dev branch)
            </label>
          </div>
        </div>
      )}

      {/* Step 3: Deploy */}
      {step === 3 && (
        <div className="card space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Play className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Deploy</h3>
              <p className="text-sm text-slate-500">Confirm to create KV namespace and deploy the panel</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h4 className="font-medium text-amber-800 mb-2">Before You Confirm</h4>
            <ul className="text-amber-700 text-sm list-disc list-inside space-y-1">
              <li>A new KV namespace will be created.</li>
              <li>The worker script will be uploaded to Cloudflare.</li>
              <li>A subdomain will be enabled (for Workers).</li>
              <li>You can update or delete this deployment later from the dashboard.</li>
            </ul>
          </div>

          <button
            onClick={deployPanel}
            disabled={isDeploying || (!tokenInput.trim() && !tokenVerification)}
            className="btn-primary w-full py-3 text-lg"
          >
            {isDeploying ? (
              <>
                <RotateCcw className="h-5 w-5 animate-spin mr-2" /> Deploying...
              </>
            ) : (
              <>Confirm & Deploy</>
            )}
          </button>

          {deploymentResult && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-800 font-medium">
                <CheckCircle className="h-5 w-5" /> Deployment Complete
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-500">Panel URL</span><br /><a href={deploymentResult.panelUrl} target="_blank" rel="noopener noreferrer" className="text-green-700 font-medium hover:underline">{deploymentResult.panelUrl}</a></div>
                <div><span className="text-slate-500">Management Key</span><br /><span className="font-mono text-slate-700">{deploymentResult.managementKey}</span></div>
                <div><span className="text-slate-500">KV Namespace</span><br /><span className="font-mono text-slate-700">{deploymentResult.kvNamespaceId}</span></div>
                <div><span className="text-slate-500">Type</span><br /><span className="text-slate-700 capitalize">{deployType}</span></div>
              </div>
              <div className="flex gap-2 pt-2">
                <a href={deploymentResult.panelUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">Open Panel</a>
                <button onClick={() => navigate(`/deployments/${deploymentResult.id || 'new'}`)} className="btn-secondary text-sm">View Details</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 4 && (
        <div className="card text-center space-y-6 py-12">
          <div className="h-20 w-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">Deployment Complete</h3>
          <p className="text-slate-500 max-w-md mx-auto">Your BPB Worker Panel is deployed and ready. You can manage it from the dashboard or open the panel directly.</p>

          {deploymentResult && (
            <div className="bg-slate-50 rounded-xl p-4 text-left max-w-lg mx-auto space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Panel URL</span> <a href={deploymentResult.panelUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline font-medium truncate max-w-[200px]">{deploymentResult.panelUrl}</a></div>
              <div className="flex justify-between"><span className="text-slate-500">Management Key</span> <span className="font-mono text-xs truncate max-w-[200px]">{deploymentResult.managementKey}</span></div>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/')} className="btn-primary">Go to Dashboard</button>
            {deploymentResult?.panelUrl && (
              <a href={deploymentResult.panelUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">Open Panel</a>
            )}
          </div>
        </div>
      )}

      {/* Navigation buttons (except complete step which has its own) */}
      {step < 4 && (
        <div className="flex justify-between">
          <button onClick={prevStep} disabled={step === 0} className="btn-secondary">
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </button>
          <button onClick={nextStep} disabled={!canProceed(step)} className={`btn-primary ${!canProceed(step) ? 'opacity-50 cursor-not-allowed' : ''}`}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      )}
    </div>
  );
}
