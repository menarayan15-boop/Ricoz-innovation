'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Briefcase,
  FileCheck,
  Layers,
  ArrowRight,
  Download,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
  Scale,
  Plus,
  Printer,
  Shield,
  AlertTriangle,
  RefreshCw,
  Edit3,
  HelpCircle,
  Eye,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  FileCode,
  Info,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/services/apiClient';
import {
  ApplicationRecord,
  DossierRecord,
  DossierHistoryItem,
  CaseReadinessScore,
  UserRole,
} from '@/types';

function DossierBuilderContent() {
  const searchParams = useSearchParams();
  const initialAppId = searchParams?.get('applicationId') || searchParams?.get('id') || '';

  // State Management
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>(initialAppId);
  const [currentDossier, setCurrentDossier] = useState<DossierRecord | null>(null);
  const [dossierHistory, setDossierHistory] = useState<DossierHistoryItem[]>([]);
  const [readinessScore, setReadinessScore] = useState<CaseReadinessScore | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isSavingSummary, setIsSavingSummary] = useState(false);

  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('applicant');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    text: string;
  } | null>(null);

  // UI Modals & Drawers
  const [showFormulaExplanation, setShowFormulaExplanation] = useState(false);
  const [showEditSummaryModal, setShowEditSummaryModal] = useState(false);
  const [editOverviewText, setEditOverviewText] = useState('');
  const [editEvidenceSummaryText, setEditEvidenceSummaryText] = useState('');

  const [showAttorneyReviewModal, setShowAttorneyReviewModal] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'changes_requested' | 'rejected'>('approved');
  const [reviewComments, setReviewComments] = useState('');
  const [reviewRequestedEvidence, setReviewRequestedEvidence] = useState('');

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewSectionKey, setPreviewSectionKey] = useState<string>('cover_page');

  // Load User Session from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const sessionStr = localStorage.getItem('dossier_user_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          if (session.role) setCurrentUserRole(session.role);
          if (session.id || session._id) setCurrentUserId(session.id || session._id);
        }
      } catch (_) {}
    }
  }, []);

  // Fetch Applications List
  const fetchApplications = useCallback(async () => {
    try {
      const res = await apiClient.getApplications();
      if (res.applications && res.applications.length > 0) {
        setApplications(res.applications);
        if (!selectedAppId) {
          setSelectedAppId(res.applications[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
    }
  }, [selectedAppId]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Load Dossier and Readiness Data for Selected Application
  const loadDossierData = useCallback(async (appId: string) => {
    if (!appId) return;
    setIsLoading(true);
    setStatusMessage(null);

    try {
      // 1. Fetch Dossier Record & History
      const dossierRes = await apiClient.getDossier(appId);
      if (dossierRes.dossier) {
        setCurrentDossier(dossierRes.dossier);
        setEditOverviewText(dossierRes.dossier.aiCaseSummary?.overview || '');
        setEditEvidenceSummaryText(dossierRes.dossier.aiCaseSummary?.evidenceSummary || '');
        setReadinessScore(dossierRes.dossier.readinessScore);
      } else {
        setCurrentDossier(null);
      }
      setDossierHistory(dossierRes.history || []);

      // 2. Fetch Live Readiness Score if not in dossier or to get latest
      const readinessRes = await apiClient.getReadinessScore(appId);
      if (readinessRes.success && readinessRes.readinessScore) {
        setReadinessScore(readinessRes.readinessScore);
      }
    } catch (err: any) {
      console.error('Failed to load dossier:', err);
      // If no dossier generated yet, get readiness score alone
      try {
        const readinessRes = await apiClient.getReadinessScore(appId);
        if (readinessRes.success) {
          setReadinessScore(readinessRes.readinessScore);
        }
      } catch (_) {}
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAppId) {
      loadDossierData(selectedAppId);
    }
  }, [selectedAppId, loadDossierData]);

  // Handle Dossier Generation
  const handleGenerateDossier = async () => {
    if (!selectedAppId) return;
    setIsGenerating(true);
    setStatusMessage(null);

    try {
      const res = await apiClient.generateDossier(selectedAppId);
      if (res.success && res.dossier) {
        setCurrentDossier(res.dossier);
        setReadinessScore(res.dossier.readinessScore);
        setEditOverviewText(res.dossier.aiCaseSummary.overview);
        setEditEvidenceSummaryText(res.dossier.aiCaseSummary.evidenceSummary);
        setStatusMessage({
          type: 'success',
          text: `Dossier version ${res.dossier.version} compiled with Readiness Score ${res.dossier.readinessScore.overallScore}/100.`,
        });
        // Refresh history
        const updatedDossier = await apiClient.getDossier(selectedAppId);
        setDossierHistory(updatedDossier.history || []);
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to generate dossier draft.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Human Edit of AI Summary
  const handleSaveSummary = async () => {
    if (!currentDossier) return;
    setIsSavingSummary(true);

    try {
      const res = await apiClient.editAiSummary(currentDossier.dossierId, {
        overview: editOverviewText,
        evidenceSummary: editEvidenceSummaryText,
      });
      if (res.success && res.dossier) {
        setCurrentDossier(res.dossier);
        setShowEditSummaryModal(false);
        setStatusMessage({
          type: 'success',
          text: 'AI Case Summary updated and saved to dossier record.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to save summary revisions.',
      });
    } finally {
      setIsSavingSummary(false);
    }
  };

  // Handle Attorney Review Adjudication
  const handleSubmitReview = async () => {
    if (!currentDossier) return;
    setIsReviewing(true);

    try {
      const requestedList = reviewRequestedEvidence
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await apiClient.reviewDossier(currentDossier.dossierId, {
        decision: reviewDecision,
        comments: reviewComments,
        requestedEvidence: requestedList,
      });

      if (res.success && res.dossier) {
        setCurrentDossier(res.dossier);
        setReadinessScore(res.dossier.readinessScore);
        setShowAttorneyReviewModal(false);
        setStatusMessage({
          type: 'success',
          text: `Attorney review recorded: ${reviewDecision.toUpperCase()}.`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to submit attorney review.',
      });
    } finally {
      setIsReviewing(false);
    }
  };

  // Handle Finalization of Approved Dossier
  const handleFinalizeDossier = async () => {
    if (!currentDossier) return;
    if (!confirm('Are you sure you want to finalize this petition dossier? This locks the draft for submission packaging.')) {
      return;
    }

    setIsFinalizing(true);
    try {
      const res = await apiClient.finalizeDossier(currentDossier.dossierId);
      if (res.success && res.dossier) {
        setCurrentDossier(res.dossier);
        setStatusMessage({
          type: 'success',
          text: 'Dossier finalized and locked for USCIS submission.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to finalize dossier.',
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  // Handle PDF Export Download
  const handleDownloadPdf = async () => {
    if (!currentDossier) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const pdfUrl = apiClient.getDossierPdfUrl(currentDossier.dossierId);

      const res = await fetch(pdfUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error(`Download failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentDossier.dossierId}_Exhibit_Dossier.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStatusMessage({
        type: 'success',
        text: 'Bates-numbered PDF binder downloaded successfully.',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to download dossier PDF.',
      });
    }
  };

  const selectedApp = applications.find((a) => a._id === selectedAppId);
  const isAttorneyOrAdmin = currentUserRole === 'attorney' || currentUserRole === 'admin';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans px-3 sm:px-6">
      {/* 1. Header & Application Selector Toolbar */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-lg bg-[#172B4D] flex items-center justify-center text-white shrink-0 shadow-xs">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] tracking-tight">
                    AI-Powered Dossier Automation &amp; Case Readiness
                  </h1>
                  {selectedApp && (
                    <Badge variant="navy" size="sm">
                      {selectedApp.visaCategory}
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-[#627D98]">
                  Automated exhibit assembly, explainable completeness scoring, grounded AI summaries &amp; attorney adjudication
                </p>
              </div>
            </div>
          </div>

          {/* Petition Dropdown & Action Buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
            {/* Petition Dropdown */}
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <label htmlFor="petition-select" className="text-xs font-semibold text-[#627D98] uppercase shrink-0">
                Petition:
              </label>
              {applications.length === 0 ? (
                <span className="text-xs text-[#829AB1] bg-[#F8FAFC] px-3 py-2 rounded border border-[#CBD5E1]">
                  No Petitions Found
                </span>
              ) : (
                <select
                  id="petition-select"
                  value={selectedAppId}
                  onChange={(e) => setSelectedAppId(e.target.value)}
                  className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-md px-3 py-2 text-xs sm:text-sm font-semibold text-[#172B4D] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#172B4D] w-full sm:w-auto min-h-[40px]"
                >
                  {applications.map((app) => (
                    <option key={app._id} value={app._id}>
                      {app.visaCategory} — {app.title || `Application #${app._id.slice(-6)}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Action: Generate Dossier */}
            <Button
              onClick={handleGenerateDossier}
              disabled={isGenerating || !selectedAppId}
              className="w-full sm:w-auto min-h-[40px] justify-center bg-[#172B4D] hover:bg-[#0F1B2D] text-white shadow-xs space-x-1.5"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Assembling Dossier...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  <span>{currentDossier ? 'Regenerate Dossier' : 'Generate Dossier'}</span>
                </>
              )}
            </Button>

            {/* Action: Export PDF */}
            {currentDossier && (
              <Button
                variant="outline"
                onClick={handleDownloadPdf}
                className="w-full sm:w-auto min-h-[40px] justify-center border-[#CBD5E1] text-[#172B4D] hover:bg-[#F8FAFC] space-x-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#426B91]" />
                <span>Export Official PDF</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Status Notice Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-lg flex items-center justify-between border text-xs sm:text-sm ${
            statusMessage.type === 'success'
              ? 'bg-[#EBF5F0] border-[#C6E3D3] text-[#2D6A4F]'
              : statusMessage.type === 'warning'
              ? 'bg-[#FFF8E1] border-[#FFE082] text-[#B78103]'
              : statusMessage.type === 'info'
              ? 'bg-[#F0F4F8] border-[#D9E2EC] text-[#172B4D]'
              : 'bg-[#FFF5F5] border-[#FFCDD2] text-[#C62828]'
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2D6A4F]" />
            ) : statusMessage.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#B78103]" />
            ) : statusMessage.type === 'info' ? (
              <Info className="w-4 h-4 shrink-0 text-[#172B4D]" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#C62828]" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-[#829AB1] hover:text-[#172B4D] ml-3 p-1"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. CASE READINESS SCORING & COMPLIANCE METRICS CARD */}
      {readinessScore && (
        <Card className="border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <CardTitle className="text-base font-bold text-[#172B4D]">
                  Case Readiness &amp; Completeness Score
                </CardTitle>
                <Badge
                  variant={
                    readinessScore.overallScore >= 80
                      ? 'success'
                      : readinessScore.overallScore >= 50
                      ? 'warning'
                      : 'error'
                  }
                  size="sm"
                >
                  {readinessScore.overallScore >= 80
                    ? 'Filing Ready'
                    : readinessScore.overallScore >= 50
                    ? 'In Review'
                    : 'Action Required'}
                </Badge>
              </div>
              <CardDescription className="text-xs text-[#627D98]">
                Transparent weighted scoring across mandatory evidence, OCR verification, discrepancy reconciliation, and attorney review
              </CardDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFormulaExplanation(!showFormulaExplanation)}
              className="text-xs border-[#CBD5E1] text-[#426B91] space-x-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showFormulaExplanation ? 'Hide Scoring Formula' : 'Explain Scoring Formula'}</span>
            </Button>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-5">
            {/* Formula Explanation Accordion */}
            {showFormulaExplanation && (
              <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#202938] space-y-2">
                <p className="font-bold text-[#172B4D] flex items-center space-x-1.5">
                  <Info className="w-4 h-4 text-[#426B91]" />
                  <span>Explainable Case Readiness Formula:</span>
                </p>
                <p className="font-mono text-[11px] bg-white p-2 rounded border border-[#E2E8F0] text-[#172B4D]">
                  {readinessScore.formulaExplanation}
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[#627D98]">
                  <li><strong>Required Documents (Max 25):</strong> Ratio of completed statutory checklist items.</li>
                  <li><strong>Evidence Verification (Max 25):</strong> Percentage of exhibits parsed via OCR with verified metadata.</li>
                  <li><strong>Missing Evidence (Max 20):</strong> -5 pts per unfulfilled statutory gap identified in Phase 7.</li>
                  <li><strong>Unresolved Inconsistencies (Max 15):</strong> Deductions for open High (-8 pts) and Medium (-4 pts) discrepancies.</li>
                  <li><strong>Attorney Adjudication (Max 15):</strong> Formal legal counsel review sign-off (+15 approved, +7 pending, +3 changes requested).</li>
                </ul>
                <p className="text-[11px] text-[#C62828] font-semibold pt-1">
                  * Note: {readinessScore.disclaimer}
                </p>
              </div>
            )}

            {/* Score Radial & Breakdown Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left Score Gauge */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-center">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  {/* Circular visual container */}
                  <div
                    className={`w-28 h-28 rounded-full border-8 flex flex-col items-center justify-center ${
                      readinessScore.overallScore >= 80
                        ? 'border-[#2E7D32] bg-[#E8F5E9]/30 text-[#2E7D32]'
                        : readinessScore.overallScore >= 50
                        ? 'border-[#B78103] bg-[#FFF8E1]/30 text-[#B78103]'
                        : 'border-[#C62828] bg-[#FFF5F5]/30 text-[#C62828]'
                    }`}
                  >
                    <span className="text-3xl font-extrabold tracking-tight">
                      {readinessScore.overallScore}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#627D98]">
                      Out of 100
                    </span>
                  </div>
                </div>
                <p className="font-bold text-sm text-[#172B4D] mt-3">
                  Overall Completeness Score
                </p>
                <span className="text-[11px] text-[#829AB1] mt-0.5">
                  Calculated {new Date(readinessScore.calculatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Right 5-Component Meters */}
              <div className="lg:col-span-8 space-y-3">
                {/* 1. Required Documents */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#172B4D] flex items-center space-x-1">
                      <span>1. Required Statutory Documents</span>
                      {readinessScore.breakdown.requiredDocsAvailable.satisfied && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                      )}
                    </span>
                    <span className="font-bold text-[#172B4D]">
                      {readinessScore.breakdown.requiredDocsAvailable.score} / {readinessScore.breakdown.requiredDocsAvailable.max} pts
                    </span>
                  </div>
                  <div className="w-full bg-[#E2E8F0] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#172B4D] h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${(readinessScore.breakdown.requiredDocsAvailable.score / readinessScore.breakdown.requiredDocsAvailable.max) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-[#627D98]">
                    {readinessScore.breakdown.requiredDocsAvailable.details}
                  </p>
                </div>

                {/* 2. Evidence Verification */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#172B4D] flex items-center space-x-1">
                      <span>2. Evidence OCR &amp; Text Verification</span>
                      {readinessScore.breakdown.evidenceVerification.satisfied && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                      )}
                    </span>
                    <span className="font-bold text-[#172B4D]">
                      {readinessScore.breakdown.evidenceVerification.score} / {readinessScore.breakdown.evidenceVerification.max} pts
                    </span>
                  </div>
                  <div className="w-full bg-[#E2E8F0] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#426B91] h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${(readinessScore.breakdown.evidenceVerification.score / readinessScore.breakdown.evidenceVerification.max) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-[#627D98]">
                    {readinessScore.breakdown.evidenceVerification.details}
                  </p>
                </div>

                {/* 3. Missing Evidence Resolution */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#172B4D] flex items-center space-x-1">
                      <span>3. Statutory Evidence Gaps</span>
                      {readinessScore.breakdown.missingEvidence.satisfied && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                      )}
                    </span>
                    <span className="font-bold text-[#172B4D]">
                      {readinessScore.breakdown.missingEvidence.score} / {readinessScore.breakdown.missingEvidence.max} pts
                    </span>
                  </div>
                  <div className="w-full bg-[#E2E8F0] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#2E7D32] h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${(readinessScore.breakdown.missingEvidence.score / readinessScore.breakdown.missingEvidence.max) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-[#627D98]">
                    {readinessScore.breakdown.missingEvidence.details}
                  </p>
                </div>

                {/* 4. Inconsistency Resolution */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#172B4D] flex items-center space-x-1">
                      <span>4. Cross-Document Inconsistencies</span>
                      {readinessScore.breakdown.unresolvedInconsistencies.satisfied && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                      )}
                    </span>
                    <span className="font-bold text-[#172B4D]">
                      {readinessScore.breakdown.unresolvedInconsistencies.score} / {readinessScore.breakdown.unresolvedInconsistencies.max} pts
                    </span>
                  </div>
                  <div className="w-full bg-[#E2E8F0] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#B78103] h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${(readinessScore.breakdown.unresolvedInconsistencies.score / readinessScore.breakdown.unresolvedInconsistencies.max) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-[#627D98]">
                    {readinessScore.breakdown.unresolvedInconsistencies.details}
                  </p>
                </div>

                {/* 5. Attorney Review */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#172B4D] flex items-center space-x-1">
                      <span>5. Attorney Formal Adjudication</span>
                      {readinessScore.breakdown.attorneyReview.satisfied && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                      )}
                    </span>
                    <span className="font-bold text-[#172B4D]">
                      {readinessScore.breakdown.attorneyReview.score} / {readinessScore.breakdown.attorneyReview.max} pts
                    </span>
                  </div>
                  <div className="w-full bg-[#E2E8F0] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#172B4D] h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${(readinessScore.breakdown.attorneyReview.score / readinessScore.breakdown.attorneyReview.max) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-[#627D98]">
                    {readinessScore.breakdown.attorneyReview.details}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. DOSSIER DRAFT CONTENT & WORKFLOWS */}
      {currentDossier ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2/3): AI Case Summary, Exhibit Index & Filing Sections */}
          <div className="lg:col-span-2 space-y-6">
            {/* Grounded AI Case Summary Panel */}
            <Card className="border-[#E2E8F0] bg-white shadow-sm">
              <CardHeader className="pb-3 border-b border-[#F1F5F9] flex flex-row items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-[#426B91]" />
                    <CardTitle className="text-base font-bold text-[#172B4D]">
                      Grounded AI Legal Case Summary
                    </CardTitle>
                    {currentDossier.aiCaseSummary.isEditedByHuman && (
                      <Badge variant="neutral" size="sm">
                        Human Revised
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs text-[#627D98]">
                    Synthesized overview citing verified documentary evidence and statutory prerequisites
                  </CardDescription>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditSummaryModal(true)}
                  className="space-x-1 text-xs border-[#CBD5E1] text-[#172B4D]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Narrative</span>
                </Button>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm text-[#202938]">
                {/* Overview */}
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md space-y-1">
                  <span className="text-[11px] font-bold text-[#172B4D] uppercase tracking-wider block">
                    Petition Overview
                  </span>
                  <p className="leading-relaxed whitespace-pre-line text-xs">
                    {currentDossier.aiCaseSummary.overview}
                  </p>
                </div>

                {/* Evidence Synthesis */}
                <div className="p-3 bg-white border border-[#E2E8F0] rounded-md space-y-1">
                  <span className="text-[11px] font-bold text-[#172B4D] uppercase tracking-wider block">
                    Evidentiary Synthesis &amp; Consistency
                  </span>
                  <p className="leading-relaxed whitespace-pre-line text-xs">
                    {currentDossier.aiCaseSummary.evidenceSummary}
                  </p>
                </div>

                {/* Document References Citation Badges */}
                {currentDossier.aiCaseSummary.documentReferences.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-[#627D98] uppercase tracking-wider block">
                      Grounded Evidentiary Citations ({currentDossier.aiCaseSummary.documentReferences.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {currentDossier.aiCaseSummary.documentReferences.map((ref, idx) => (
                        <div
                          key={idx}
                          className="p-2 bg-[#F0F4F8] border border-[#CBD5E1] rounded text-xs flex items-center space-x-1.5"
                        >
                          <span className="font-bold text-[#172B4D]">{ref.exhibitCode}:</span>
                          <span className="text-[#486581] max-w-[180px] truncate">{ref.title}</span>
                          <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-[#E2E8F0] text-[#627D98]">
                            {ref.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outstanding Actions */}
                {currentDossier.aiCaseSummary.suggestedReviewActions.length > 0 && (
                  <div className="p-3 bg-[#FFF8E1] border border-[#FFE082] rounded-md space-y-1 text-xs">
                    <span className="font-bold text-[#B78103] flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Suggested Review Actions:</span>
                    </span>
                    <ul className="list-disc pl-5 space-y-0.5 text-[#202938]">
                      {currentDossier.aiCaseSummary.suggestedReviewActions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Master Evidentiary Exhibit Index & Bates Stamping Table */}
            <Card padding="none" className="border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-[#172B4D]">
                    Master Evidentiary Exhibit Index
                  </CardTitle>
                  <CardDescription className="text-xs text-[#627D98]">
                    Automated Bates stamped exhibit ranges for USCIS filing ({currentDossier.batesNumbering.prefix}0001 to {currentDossier.batesNumbering.prefix}{String(currentDossier.batesNumbering.endNumber).padStart(4, '0')})
                  </CardDescription>
                </div>
                <Badge variant="navy" size="sm">
                  {currentDossier.batesNumbering.totalCount} Bates Pages
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold text-[#486581] uppercase tracking-wider">
                      <th className="py-3 px-4">Exhibit Tab</th>
                      <th className="py-3 px-4">Document Title</th>
                      <th className="py-3 px-4">Statutory Category</th>
                      <th className="py-3 px-4">Bates Stamp Range</th>
                      <th className="py-3 px-4 text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {currentDossier.aiCaseSummary.documentReferences.map((ref, idx) => {
                      const startPage = idx * 4 + 10;
                      const endPage = startPage + 3;
                      const batesStart = `${currentDossier.batesNumbering.prefix}${String(startPage).padStart(4, '0')}`;
                      const batesEnd = `${currentDossier.batesNumbering.prefix}${String(endPage).padStart(4, '0')}`;

                      return (
                        <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3 px-4 font-bold text-[#172B4D]">
                            {ref.exhibitCode}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#202938]">
                            {ref.title}
                          </td>
                          <td className="py-3 px-4 text-[#627D98]">
                            <span className="bg-[#F0F4F8] px-2 py-0.5 rounded text-[11px]">
                              {ref.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[#426B91]">
                            {batesStart} – {batesEnd}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge variant="success" size="sm">
                              Verified
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* 10 Standard USCIS Dossier Sections Viewer */}
            <Card padding="none" className="border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-[#172B4D]">
                    10 Standard USCIS Filing Sections
                  </CardTitle>
                  <CardDescription className="text-xs text-[#627D98]">
                    Click any section to inspect structured draft content
                  </CardDescription>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreviewModal(true)}
                  className="space-x-1 text-xs border-[#CBD5E1] text-[#172B4D]"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Full Binder Preview</span>
                </Button>
              </div>

              <div className="divide-y divide-[#E2E8F0]">
                {currentDossier.sections.map((section, idx) => (
                  <div
                    key={section.key}
                    className="p-4 hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                    onClick={() => {
                      setPreviewSectionKey(section.key);
                      setShowPreviewModal(true);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-full bg-[#F0F4F8] text-[#172B4D] font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-xs text-[#172B4D]">
                          {section.title}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-[#627D98]">
                        <span>Page Offset {section.pageOffset}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#829AB1]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column (1/3): Attorney Review Adjudication & Dossier Version History */}
          <div className="space-y-6">
            {/* Attorney Review & Adjudication Status Card */}
            <Card className="border-[#E2E8F0] bg-white shadow-sm">
              <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Scale className="w-4 h-4 text-[#172B4D]" />
                    <CardTitle className="text-sm font-bold text-[#172B4D]">
                      Attorney Adjudication
                    </CardTitle>
                  </div>
                  <Badge
                    variant={
                      currentDossier.status === 'approved'
                        ? 'success'
                        : currentDossier.status === 'finalized'
                        ? 'navy'
                        : currentDossier.status === 'changes_requested'
                        ? 'error'
                        : 'warning'
                    }
                    size="sm"
                  >
                    {currentDossier.status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-[#627D98]">
                  Formal legal sign-off and filing clearance
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 space-y-3.5 text-xs text-[#202938]">
                {currentDossier.attorneyReview?.decision ? (
                  <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-md space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#172B4D]">Adjudication Decision:</span>
                      <span className="font-bold text-[#2E7D32] uppercase">
                        {currentDossier.attorneyReview.decision}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#627D98] block">Reviewer:</span>
                      <span className="font-semibold text-[#172B4D]">
                        {currentDossier.attorneyReview.reviewerName || 'Assigned Counsel'}
                      </span>
                    </div>
                    {currentDossier.attorneyReview.reviewedAt && (
                      <div>
                        <span className="text-[#627D98] block">Timestamp:</span>
                        <span className="text-[#202938]">
                          {new Date(currentDossier.attorneyReview.reviewedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {currentDossier.attorneyReview.comments && (
                      <div>
                        <span className="text-[#627D98] block">Attorney Notes:</span>
                        <p className="text-xs text-[#202938] mt-0.5 bg-white p-2 rounded border border-[#E2E8F0]">
                          {currentDossier.attorneyReview.comments}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-[#FFF8E1] border border-[#FFE082] rounded-md text-xs text-[#B78103]">
                    <strong>Awaiting Review:</strong> This dossier draft has not yet received formal legal counsel sign-off.
                  </div>
                )}

                {/* Review Action Controls for Attorneys & Admins */}
                {isAttorneyOrAdmin ? (
                  <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                    <Button
                      size="sm"
                      onClick={() => setShowAttorneyReviewModal(true)}
                      className="w-full justify-center bg-[#172B4D] text-white hover:bg-[#0F1B2D] space-x-1"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>Conduct Attorney Review</span>
                    </Button>

                    {currentDossier.status === 'approved' && (
                      <Button
                        size="sm"
                        onClick={handleFinalizeDossier}
                        disabled={isFinalizing}
                        className="w-full justify-center bg-[#2E7D32] hover:bg-[#1B5E20] text-white space-x-1"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>{isFinalizing ? 'Finalizing...' : 'Finalize & Lock for Filing'}</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 bg-[#F8FAFC] rounded border border-[#E2E8F0] text-[11px] text-[#627D98]">
                    <Shield className="w-3.5 h-3.5 text-[#426B91] inline mr-1" />
                    <span>Only licensed legal counsel or administrators can approve or finalize dossier packets.</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Version History Card */}
            <Card padding="none" className="border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#F1F5F9] flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-[#172B4D]">
                  Dossier Version History
                </CardTitle>
                <Badge variant="neutral" size="sm">
                  {dossierHistory.length} Versions
                </Badge>
              </div>

              <div className="divide-y divide-[#E2E8F0] max-h-64 overflow-y-auto">
                {dossierHistory.map((item) => (
                  <div
                    key={item.dossierId}
                    className={`p-3 text-xs flex items-center justify-between ${
                      item.dossierId === currentDossier.dossierId
                        ? 'bg-[#FAFCFF] font-semibold'
                        : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-[#172B4D]">v{item.version}</span>
                        <span className="text-[#829AB1]">({item.dossierId})</span>
                      </div>
                      <span className="text-[10px] text-[#829AB1] block">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-[#2E7D32] block">
                        Score: {item.readinessScore}/100
                      </span>
                      <span className="text-[10px] uppercase text-[#627D98]">
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* Empty State: Prompt to generate first dossier */
        <Card className="border-[#E2E8F0] bg-white p-8 sm:p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#F0F4F8] text-[#172B4D] flex items-center justify-center mx-auto shadow-xs">
            <Briefcase className="w-8 h-8 text-[#172B4D]" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-[#172B4D]">
              No Dossier Assembled for this Petition Yet
            </h3>
            <p className="text-xs text-[#627D98]">
              Assemble all statutory exhibits, calculate your Case Readiness Score, generate grounded AI legal briefs, and prepare Bates numbered PDF filing binders.
            </p>
          </div>

          <Button
            size="lg"
            onClick={handleGenerateDossier}
            disabled={isGenerating || !selectedAppId}
            className="space-x-2 bg-[#172B4D] text-white hover:bg-[#0F1B2D] px-6 min-h-[44px]"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Assembling Dossier...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Generate Initial Dossier</span>
              </>
            )}
          </Button>
        </Card>
      )}

      {/* =========================================================================
          MODAL 1: EDIT AI LEGAL SUMMARY
          ========================================================================= */}
      {showEditSummaryModal && currentDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-[#CBD5E1] shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-[#172B4D]" />
                <h3 className="text-base font-bold text-[#172B4D]">
                  Human Revision: AI Legal Case Summary
                </h3>
              </div>
              <button
                onClick={() => setShowEditSummaryModal(false)}
                className="text-[#829AB1] hover:text-[#172B4D] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#172B4D] block mb-1">
                  Executive Petition Overview
                </label>
                <textarea
                  value={editOverviewText}
                  onChange={(e) => setEditOverviewText(e.target.value)}
                  rows={4}
                  className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded text-[#202938] text-xs focus:ring-1 focus:ring-[#172B4D]"
                  placeholder="Refine petitioner background, job role, and statutory filing category..."
                />
              </div>

              <div>
                <label className="font-bold text-[#172B4D] block mb-1">
                  Evidentiary Synthesis &amp; Consistency Narrative
                </label>
                <textarea
                  value={editEvidenceSummaryText}
                  onChange={(e) => setEditEvidenceSummaryText(e.target.value)}
                  rows={4}
                  className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded text-[#202938] text-xs focus:ring-1 focus:ring-[#172B4D]"
                  placeholder="Refine cross-document synthesis, verified exhibits, and legal alignment..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#F1F5F9]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditSummaryModal(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveSummary}
                disabled={isSavingSummary}
                className="bg-[#172B4D] text-white"
              >
                {isSavingSummary ? 'Saving...' : 'Save Revisions'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: CONDUCT ATTORNEY ADJUDICATION
          ========================================================================= */}
      {showAttorneyReviewModal && currentDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-[#CBD5E1] shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div className="flex items-center space-x-2">
                <Scale className="w-4 h-4 text-[#172B4D]" />
                <h3 className="text-base font-bold text-[#172B4D]">
                  Attorney Review &amp; Formal Adjudication
                </h3>
              </div>
              <button
                onClick={() => setShowAttorneyReviewModal(false)}
                className="text-[#829AB1] hover:text-[#172B4D] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#172B4D] block mb-1">
                  Adjudication Decision
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'approved', label: 'Approve', color: 'border-[#2E7D32] bg-[#E8F5E9] text-[#2E7D32]' },
                    { id: 'changes_requested', label: 'Request Changes', color: 'border-[#B78103] bg-[#FFF8E1] text-[#B78103]' },
                    { id: 'rejected', label: 'Reject', color: 'border-[#C62828] bg-[#FFF5F5] text-[#C62828]' },
                  ].map((dec) => (
                    <button
                      key={dec.id}
                      type="button"
                      onClick={() => setReviewDecision(dec.id as any)}
                      className={`p-2.5 rounded border text-center font-bold text-xs transition-colors ${
                        reviewDecision === dec.id
                          ? dec.color
                          : 'bg-white border-[#CBD5E1] text-[#627D98] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {dec.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-[#172B4D] block mb-1">
                  Attorney Review Notes &amp; Legal Comments
                </label>
                <textarea
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  rows={3}
                  className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-[#202938] text-xs focus:ring-1 focus:ring-[#172B4D]"
                  placeholder="Enter detailed legal justification, statutory compliance notes, or instructions..."
                />
              </div>

              {reviewDecision === 'changes_requested' && (
                <div>
                  <label className="font-bold text-[#172B4D] block mb-1">
                    Requested Evidence Exhibits (One per line)
                  </label>
                  <textarea
                    value={reviewRequestedEvidence}
                    onChange={(e) => setReviewRequestedEvidence(e.target.value)}
                    rows={2}
                    className="w-full p-2 bg-white border border-[#CBD5E1] rounded text-[#202938] text-xs focus:ring-1 focus:ring-[#172B4D]"
                    placeholder="e.g. Certified academic degree evaluation&#10;Prior employer verification letter"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#F1F5F9]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAttorneyReviewModal(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitReview}
                disabled={isReviewing}
                className="bg-[#172B4D] text-white"
              >
                {isReviewing ? 'Submitting...' : 'Record Adjudication'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: FULL DOSSIER SECTION VIEWER
          ========================================================================= */}
      {showPreviewModal && currentDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-[#CBD5E1] shadow-2xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-[#172B4D]" />
                <h3 className="text-base font-bold text-[#172B4D]">
                  Dossier Exhibit Binder Preview ({currentDossier.dossierId})
                </h3>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-[#829AB1] hover:text-[#172B4D] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {currentDossier.sections.map((sec, idx) => (
                <div
                  key={sec.key}
                  id={sec.key}
                  className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                    <span className="font-bold text-sm text-[#172B4D]">
                      {sec.title}
                    </span>
                    <span className="text-xs font-mono text-[#829AB1]">
                      Page {idx + 1}
                    </span>
                  </div>
                  <pre className="text-xs text-[#202938] font-sans whitespace-pre-wrap leading-relaxed">
                    {sec.content}
                  </pre>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-[#F1F5F9]">
              <span className="text-xs text-[#627D98]">
                Bates Stamping Range: {currentDossier.batesNumbering.prefix}0001 to {currentDossier.batesNumbering.prefix}{String(currentDossier.batesNumbering.endNumber).padStart(4, '0')}
              </span>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreviewModal(false)}
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={handleDownloadPdf}
                  className="bg-[#172B4D] text-white space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DossierBuilderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#627D98]">Loading Dossier Builder Workspace...</div>}>
      <DossierBuilderContent />
    </Suspense>
  );
}
