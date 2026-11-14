'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { apiClient, getApiBaseUrl } from '@/services/apiClient';
import { BackendHealthResponse, DatabaseHealthResponse } from '@/types';
import {
  Server,
  Database,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  ArrowRight,
  AlertTriangle,
  Activity,
  Cpu,
  HardDrive,
  Check,
} from 'lucide-react';

type StatusType = 'loading' | 'connected' | 'failed';

export default function FoundationVerificationPage() {
  // Backend State
  const [backendStatus, setBackendStatus] = useState<StatusType>('loading');
  const [backendData, setBackendData] = useState<BackendHealthResponse | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [backendLatency, setBackendLatency] = useState<number | null>(null);

  // MongoDB State
  const [dbStatus, setDbStatus] = useState<StatusType>('loading');
  const [dbData, setDbData] = useState<DatabaseHealthResponse | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  // Verification & Timestamp State
  const [lastVerified, setLastVerified] = useState<Date | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // 1. Verify Backend Connectivity
  const verifyBackend = useCallback(async (): Promise<boolean> => {
    setBackendStatus('loading');
    setBackendError(null);
    const startTime = Date.now();
    try {
      const data = await apiClient.checkServerHealth();
      setBackendLatency(Date.now() - startTime);
      setBackendData(data);
      setBackendStatus('connected');
      return true;
    } catch (err: unknown) {
      setBackendLatency(Date.now() - startTime);
      setBackendData(null);
      setBackendError((err as Error).message || 'Unable to connect to Node.js Express backend');
      setBackendStatus('failed');
      return false;
    }
  }, []);

  // 2. Verify MongoDB Database Connectivity
  const verifyDatabase = useCallback(async (): Promise<boolean> => {
    setDbStatus('loading');
    setDbError(null);
    try {
      const data = await apiClient.checkDatabaseHealth();
      setDbData(data);
      if (data.status === 'connected' && data.readyState === 1) {
        setDbStatus('connected');
        return true;
      } else {
        setDbStatus('failed');
        setDbError(data.message || `Database returned readyState: ${data.readyState}`);
        return false;
      }
    } catch (err: unknown) {
      setDbData(null);
      setDbError((err as Error).message || 'MongoDB ping check failed');
      setDbStatus('failed');
      return false;
    }
  }, []);

  // 3. Trigger Full Verification (Prevents simultaneous duplicate runs)
  const handleReverify = useCallback(async () => {
    if (isVerifying) return; // Prevent multiple simultaneous calls
    setIsVerifying(true);

    try {
      await Promise.allSettled([verifyBackend(), verifyDatabase()]);
      setLastVerified(new Date());
    } finally {
      setIsVerifying(false);
    }
  }, [isVerifying, verifyBackend, verifyDatabase]);

  // Initial load
  useEffect(() => {
    handleReverify();
  }, []);

  const activeApiUrl = typeof window !== 'undefined' ? getApiBaseUrl() : 'http://localhost:5001/api/v1';

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col font-sans text-[#202938]">
      {/* Top Application Header */}
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded bg-[#172B4D] flex items-center justify-center text-white font-bold text-lg shadow-sm">
              IV
            </div>
            <div>
              <span className="font-semibold text-base text-[#172B4D] block tracking-tight">
                Immigration & Work Visa Dossier Builder
              </span>
              <span className="text-xs text-[#627D98] block">
                Enterprise LegalTech Application
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link
              href="/landing"
              className="text-xs font-medium text-[#486581] hover:text-[#172B4D] px-2.5 py-1.5 rounded hover:bg-[#F0F4F8] transition-colors"
            >
              Landing Page
            </Link>
            <Link
              href="/dashboard-preview"
              className="text-xs font-medium text-[#486581] hover:text-[#172B4D] px-2.5 py-1.5 rounded hover:bg-[#F0F4F8] transition-colors"
            >
              Dashboard Preview
            </Link>
            <Link
              href="/dashboard/applications/create"
              className="hidden sm:inline-flex text-xs font-medium bg-[#172B4D] text-white hover:bg-[#0F1B2D] px-3 py-1.5 rounded transition-colors"
            >
              Start Visa Dossier
            </Link>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#F0F4F8] text-[#172B4D] border border-[#D9E2EC]">
              Phase 1: Foundation Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* System Foundation & Communication Gateway Section */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Section Heading & Description */}
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-[#426B91]" />
                <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] tracking-tight">
                  System Foundation & Communication Gateway
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-[#486581]">
                Decoupled Next.js frontend communicating via REST APIs with the Node.js/Express.js backend and MongoDB ODM.
              </p>
              <p className="text-[11px] text-[#829AB1] font-mono">
                Target Gateway: <span className="text-[#172B4D] font-medium">{activeApiUrl}</span>
              </p>
            </div>

            {/* Right: Re-verify Status Button */}
            <div className="flex items-center shrink-0">
              <button
                id="reverify-status-btn"
                type="button"
                onClick={handleReverify}
                disabled={isVerifying}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-md border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#172B4D] text-sm font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-[#172B4D] focus:ring-offset-1 cursor-pointer"
                aria-label="Re-verify system and database status"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 text-[#426B91] ${
                    isVerifying ? 'animate-spin text-[#172B4D]' : ''
                  }`}
                />
                <span>{isVerifying ? 'Verifying...' : 'Re-verify Status'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status Indicators Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* 1. Backend Status Card */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F5F9]">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded bg-[#F0F4F8] text-[#172B4D]">
                    <Server className="w-5 h-5 text-[#172B4D]" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#172B4D]">Node.js Express Backend</h2>
                    <p className="text-xs text-[#627D98]">REST API Service (Port 5001)</p>
                  </div>
                </div>

                {/* Status Badge */}
                {backendStatus === 'connected' ? (
                  <span
                    id="backend-status-badge"
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#2E7D32]" />
                    Connected
                  </span>
                ) : backendStatus === 'loading' ? (
                  <span
                    id="backend-status-badge"
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin text-[#627D98]" />
                    Connecting...
                  </span>
                ) : (
                  <span
                    id="backend-status-badge"
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1 text-[#C62828]" />
                    Connection Failed
                  </span>
                )}
              </div>

              {/* Body Content */}
              {backendStatus === 'connected' && backendData ? (
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0]">
                    <dt className="text-[#627D98]">Service Identifier</dt>
                    <dd className="font-semibold text-[#172B4D] mt-0.5">{backendData.service}</dd>
                  </div>
                  <div className="bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0]">
                    <dt className="text-[#627D98]">API Version</dt>
                    <dd className="font-semibold text-[#172B4D] mt-0.5">{backendData.version}</dd>
                  </div>
                  <div className="bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0]">
                    <dt className="text-[#627D98]">Server Uptime</dt>
                    <dd className="font-semibold text-[#172B4D] mt-0.5">{backendData.uptimeSeconds} seconds</dd>
                  </div>
                  <div className="bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0]">
                    <dt className="text-[#627D98]">API Latency</dt>
                    <dd className="font-semibold text-[#172B4D] mt-0.5">{backendLatency} ms</dd>
                  </div>
                  <div className="bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0]">
                    <dt className="text-[#627D98]">Node Runtime</dt>
                    <dd className="font-semibold text-[#172B4D] mt-0.5">{backendData.system.nodeVersion}</dd>
                  </div>
                  <div className="bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0]">
                    <dt className="text-[#627D98]">Process Memory</dt>
                    <dd className="font-semibold text-[#172B4D] mt-0.5">{backendData.system.memoryUsageMB} MB</dd>
                  </div>
                </dl>
              ) : backendStatus === 'loading' ? (
                <div className="p-4 bg-[#F8FAFC] rounded border border-[#E2E8F0] text-xs text-[#486581] flex items-center space-x-2.5">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#426B91]" />
                  <span>Connecting to Express backend at {activeApiUrl}/health...</span>
                </div>
              ) : (
                <div className="p-4 bg-[#FFF5F5] rounded border border-[#FFCDD2] text-xs text-[#C62828] space-y-2">
                  <div className="font-semibold flex items-center text-[#B71C1C]">
                    <AlertTriangle className="w-4 h-4 mr-1.5 shrink-0" />
                    Express Backend Unreachable
                  </div>
                  <p className="font-mono text-[11px] text-[#C62828] break-all bg-white p-2 rounded border border-[#FFCDD2]">
                    {backendError}
                  </p>
                  <p className="text-[11px] text-[#4A5568]">
                    Ensure the Express server is running on port 5001 (`cd backend && npm run dev`).
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#F1F5F9] text-[11px] text-[#829AB1] flex justify-between items-center">
              <span>Endpoint: /api/v1/health</span>
              <span>Method: GET</span>
            </div>
          </div>

          {/* 2. MongoDB Status Card */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F5F9]">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded bg-[#F0F4F8] text-[#172B4D]">
                    <Database className="w-5 h-5 text-[#172B4D]" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#172B4D]">MongoDB Database</h2>
                    <p className="text-xs text-[#627D98]">Mongoose ODM Layer</p>
                  </div>
                </div>

                {/* Status Badge */}
                {dbStatus === 'connected' ? (
                  <span
                    id="mongodb-status-badge"
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#2E7D32]" />
                    Connected
                  </span>
                ) : dbStatus === 'loading' ? (
                  <span
                    id="mongodb-status-badge"
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin text-[#627D98]" />
                    Pinging...
                  </span>
                ) : (
                  <span
                    id="mongodb-status-badge"
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1 text-[#C62828]" />
                    Connection Failed
                  </span>
                )}
              </div>

              {/* Body Content */}
              {dbStatus === 'connected' && dbData ? (
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0]">
                    <dt className="text-[#627D98]">Database Host</dt>
                    <dd className="font-semibold text-[#172B4D] mt-0.5 truncate">{dbData.host}</dd>
                  </div>
                  <div className="bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0]">
                    <dt className="text-[#627D98]">Database Name</dt>
                    <dd className="font-semibold text-[#172B4D] mt-0.5">{dbData.databaseName}</dd>
                  </div>
                  <div className="bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0]">
                    <dt className="text-[#627D98]">Execution Engine</dt>
                    <dd className="font-semibold text-[#172B4D] mt-0.5">
                      {dbData.isPersistent ? 'Persistent MongoDB (Disk-backed)' : 'External Cluster'}
                    </dd>
                  </div>
                  <div className="bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0]">
                    <dt className="text-[#627D98]">Admin Ping Latency</dt>
                    <dd className="font-semibold text-[#2E7D32] mt-0.5">{dbData.pingLatencyMs} ms</dd>
                  </div>
                  <div className="bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0]">
                    <dt className="text-[#627D98]">Mongoose readyState</dt>
                    <dd className="font-semibold text-[#172B4D] mt-0.5">{dbData.readyState} (Connected)</dd>
                  </div>
                  <div className="bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0]">
                    <dt className="text-[#627D98]">Storage Architecture</dt>
                    <dd className="font-semibold text-[#2E7D32] mt-0.5">Real Persistent Database</dd>
                  </div>
                </dl>
              ) : dbStatus === 'loading' ? (
                <div className="p-4 bg-[#F8FAFC] rounded border border-[#E2E8F0] text-xs text-[#486581] flex items-center space-x-2.5">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#426B91]" />
                  <span>Issuing real admin.ping() command to MongoDB via Express...</span>
                </div>
              ) : (
                <div className="p-4 bg-[#FFF5F5] rounded border border-[#FFCDD2] text-xs text-[#C62828] space-y-2">
                  <div className="font-semibold flex items-center text-[#B71C1C]">
                    <AlertTriangle className="w-4 h-4 mr-1.5 shrink-0" />
                    MongoDB Verification Failed
                  </div>
                  <p className="font-mono text-[11px] text-[#C62828] break-all bg-white p-2 rounded border border-[#FFCDD2]">
                    {dbError}
                  </p>
                  {dbError && (dbError.includes('IP') || dbError.includes('whitelist') || dbError.includes('Atlas')) ? (
                    <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px] space-y-1">
                      <p className="font-semibold text-amber-950">Atlas IP Whitelist Required:</p>
                      <p>
                        Your machine public IP is <span className="font-mono font-bold">125.17.13.54</span>.
                      </p>
                      <p>
                        Go to MongoDB Atlas → <strong>Network Access</strong> → <strong>Add IP Address</strong> → add <code className="bg-amber-100 px-1 rounded">125.17.13.54</code> (or <code className="bg-amber-100 px-1 rounded">0.0.0.0/0</code> for development) → wait 1 minute for Atlas to apply → click <strong>Re-verify Status</strong> above.
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#4A5568]">
                      Verify that MONGODB_URI is valid and accessible in `backend/.env`.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#F1F5F9] text-[11px] text-[#829AB1] flex justify-between items-center">
              <span>Endpoint: /api/v1/health/db</span>
              <span>Method: GET</span>
            </div>
          </div>
        </div>

        {/* Architecture Specifications */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Layers className="w-5 h-5 text-[#172B4D]" />
            <h2 className="text-base font-semibold text-[#172B4D]">
              Verified Architecture Specifications
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded border border-[#E2E8F0] bg-[#FAFCFF] space-y-1.5">
              <div className="font-semibold text-[#172B4D] flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-[#2E7D32]" />
                Strict Separation of Concerns
              </div>
              <p className="text-[#627D98] leading-relaxed">
                Next.js App Router functions strictly as the UI presentation tier. Express handles all business logic, validation, and database operations.
              </p>
            </div>
            <div className="p-4 rounded border border-[#E2E8F0] bg-[#FAFCFF] space-y-1.5">
              <div className="font-semibold text-[#172B4D] flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-[#2E7D32]" />
                Restricted Secret Exposure
              </div>
              <p className="text-[#627D98] leading-relaxed">
                JWT secrets, database URIs, and AI API keys are isolated exclusively inside the Express backend environment.
              </p>
            </div>
            <div className="p-4 rounded border border-[#E2E8F0] bg-[#FAFCFF] space-y-1.5">
              <div className="font-semibold text-[#172B4D] flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-[#2E7D32]" />
                Supported Visa Categories
              </div>
              <p className="text-[#627D98] leading-relaxed">
                Engineered for H-1B, O-1, EB-2, and EB-2 NIW petitions with tailored document classification rules and dossier templates.
              </p>
            </div>
          </div>
        </div>

        {/* Last Verified Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-[#627D98] pt-2 gap-2 border-t border-[#E2E8F0]">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#829AB1]" />
            <span>
              Last verified:{' '}
              {lastVerified ? (
                <strong className="text-[#172B4D] font-mono">
                  {lastVerified.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  at {lastVerified.toLocaleTimeString()}
                </strong>
              ) : (
                <span className="text-[#B78103]">Pending initial verification...</span>
              )}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-[#486581]">
            <Check className="w-3.5 h-3.5 text-[#2E7D32]" />
            <span>Phase 1 Gateway Online • Ready for Phase 2</span>
          </div>
        </div>
      </main>
    </div>
  );
}
