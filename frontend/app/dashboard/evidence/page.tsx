'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Scale,
  FileText,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Play,
  Download,
  Printer,
  ChevronRight,
  Filter,
  Check,
  X,
  Eye,
  ExternalLink,
  Clock,
  Layers,
  Sparkles,
  Info,
  Calendar,
  Briefcase,
  GraduationCap,
  User,
  DollarSign,
  FileCheck,
  PlusCircle,
  Edit3,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/services/apiClient';
import {
  ApplicationRecord,
  DocumentRecord,
  Phase7Finding,
  Phase7FindingSeverity,
  Phase7ReviewStatus,
  EvidenceAnalysisItem,
  EvidenceGapItem,
  EvidenceMappingItem,
  EvidenceReport,
  EvidenceMatrixData,
  EvidenceMatrixRow,
} from '@/types';

function EvidenceIntelligenceContent() {
  const searchParams = useSearchParams();
  const urlAppId = searchParams.get('applicationId');

  // 1. Application & Navigation State
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);
  const [availableDocs, setAvailableDocs] = useState<DocumentRecord[]>([]);

  // 2. Active Tab & Loading
  const [activeTab, setActiveTab] = useState<'overview' | 'findings' | 'matrix' | 'gaps' | 'criteria'>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);

  // 3. Evidence Data
  const [analyses, setAnalyses] = useState<EvidenceAnalysisItem[]>([]);
  const [findings, setFindings] = useState<Phase7Finding[]>([]);
  const [gaps, setGaps] = useState<EvidenceGapItem[]>([]);
  const [mappings, setMappings] = useState<EvidenceMappingItem[]>([]);
  const [coveragePercentage, setCoveragePercentage] = useState<number>(0);
  const [matrixData, setMatrixData] = useState<EvidenceMatrixData | null>(null);
  const [matrixFilter, setMatrixFilter] = useState<string>('all');

  // 4. Filtering State for Review Queue
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 5. Human Review Modal State
  const [reviewModalFinding, setReviewModalFinding] = useState<Phase7Finding | null>(null);
  const [reviewStatusChoice, setReviewStatusChoice] = useState<Phase7ReviewStatus>('confirmed');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [humanCorrection, setHumanCorrection] = useState<string>('');
  const [requestedDocName, setRequestedDocName] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  // 6. Waive Gap Modal State
  const [waiveModalGap, setWaiveModalGap] = useState<EvidenceGapItem | null>(null);
  const [waiveReason, setWaiveReason] = useState<string>('');
  const [isSubmittingWaive, setIsSubmittingWaive] = useState<boolean>(false);

  // 7. Edit Criterion Mapping Modal State
  const [editMappingModal, setEditMappingModal] = useState<EvidenceMappingItem | null>(null);
  const [mappingStatusChoice, setMappingStatusChoice] = useState<'supported' | 'partially_supported' | 'unsupported' | 'needs_review'>('supported');
  const [mappingNotes, setMappingNotes] = useState<string>('');
  const [isSubmittingMapping, setIsSubmittingMapping] = useState<boolean>(false);

  // 8. Dossier Report Modal State
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [reportData, setReportData] = useState<EvidenceReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // 1. Initial Load: Fetch User Applications
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setIsLoading(true);
        const res = await apiClient.getApplications({ limit: 50 });
        if (res.success && res.applications) {
          setApplications(res.applications);

          // Priority: URL query param -> localStorage -> first application
          let activeId = urlAppId;
          if (!activeId && typeof window !== 'undefined') {
            activeId = localStorage.getItem('dossier_selected_evidence_app_id') || '';
          }
          if (!activeId || !res.applications.some((a) => a._id === activeId)) {
            activeId = res.applications.length > 0 ? res.applications[0]._id : '';
          }

          setSelectedAppId(activeId);
          if (activeId && typeof window !== 'undefined') {
            localStorage.setItem('dossier_selected_evidence_app_id', activeId);
          }

          const found = res.applications.find((a) => a._id === activeId);
          if (found) setSelectedApp(found);
        } else {
          setApplications([]);
        }
      } catch (err: any) {
        if (err.statusCode === 503) {
          setStatusMessage({
            type: 'error',
            text: 'Database service is currently connecting to Atlas. Please ensure your IP is whitelisted.',
          });
        } else if (err.statusCode === 401) {
          setStatusMessage({
            type: 'warning',
            text: 'Session expired. Please log in to view evidence analysis.',
          });
        } else {
          setStatusMessage({
            type: 'error',
            text: err.message || 'Failed to load visa petitions.',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchApplications();
  }, [urlAppId]);

  // ---------------------------------------------------------------------------
  // 2. Fetch Evidence & Documents whenever selectedAppId changes
  // ---------------------------------------------------------------------------
  const loadEvidenceData = async (appId: string) => {
    if (!appId) {
      setFindings([]);
      setGaps([]);
      setMappings([]);
      setAnalyses([]);
      setMatrixData(null);
      setAvailableDocs([]);
      return;
    }
    try {
      setIsLoading(true);
      setIsLoadingDocs(true);
      setStatusMessage(null);

      // Fetch documents and evidence datasets concurrently
      const [findingsRes, gapsRes, mappingsRes, analysesRes, matrixRes, docsRes] =
        await Promise.allSettled([
          apiClient.getEvidenceFindings(appId),
          apiClient.getEvidenceGaps(appId),
          apiClient.getEvidenceMappings(appId),
          apiClient.getEvidenceAnalyses(appId),
          apiClient.getEvidenceMatrix(appId),
          apiClient.getApplicationDocuments(appId, { limit: 50 }),
        ]);

      if (findingsRes.status === 'fulfilled' && findingsRes.value.success) {
        setFindings(findingsRes.value.findings || []);
      }
      if (gapsRes.status === 'fulfilled' && gapsRes.value.success) {
        setGaps(gapsRes.value.gaps || []);
      }
      if (mappingsRes.status === 'fulfilled' && mappingsRes.value.success) {
        setMappings(mappingsRes.value.mappings || []);
        setCoveragePercentage(mappingsRes.value.coveragePercentage || 0);
      }
      if (analysesRes.status === 'fulfilled' && analysesRes.value.success) {
        setAnalyses(analysesRes.value.analyses || []);
      }
      if (matrixRes.status === 'fulfilled' && matrixRes.value.success) {
        setMatrixData(matrixRes.value.data || null);
      }
      if (docsRes.status === 'fulfilled' && docsRes.value.success) {
        setAvailableDocs(docsRes.value.documents || []);
      }
    } catch (err: any) {
      // Handled silently
    } finally {
      setIsLoading(false);
      setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (selectedAppId) {
      const found = applications.find((a) => a._id === selectedAppId);
      if (found) setSelectedApp(found);
      if (typeof window !== 'undefined') {
        localStorage.setItem('dossier_selected_evidence_app_id', selectedAppId);
      }
      loadEvidenceData(selectedAppId);
    }
  }, [selectedAppId]);

  // ---------------------------------------------------------------------------
  // 3. Trigger Cross-Document Analysis
  // ---------------------------------------------------------------------------
  const handleRunAnalysis = async () => {
    if (!selectedAppId) return;

    if (availableDocs.length < 2) {
      setStatusMessage({
        type: 'warning',
        text: `Cross-document verification requires at least 2 uploaded exhibits. Currently only ${availableDocs.length} exhibit is uploaded. Please upload additional evidence to proceed.`,
      });
      return;
    }

    try {
      setIsAnalyzing(true);
      setStatusMessage(null);
      const res = await apiClient.runEvidenceAnalysis(selectedAppId);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Analysis complete: ${res.data.findings.length} findings, ${res.data.gaps.length} gaps, ${res.data.analysis.summaryMetrics.coveragePercentage}% criteria coverage.`,
        });
        setFindings(res.data.findings || []);
        setGaps(res.data.gaps || []);
        setMappings(res.data.mappings || []);
        setCoveragePercentage(res.data.analysis.summaryMetrics.coveragePercentage || 0);

        // Refresh analyses history and comparison matrix
        const [analysesRes, matrixRes] = await Promise.all([
          apiClient.getEvidenceAnalyses(selectedAppId),
          apiClient.getEvidenceMatrix(selectedAppId),
        ]);
        if (analysesRes.success) setAnalyses(analysesRes.analyses || []);
        if (matrixRes.success) setMatrixData(matrixRes.data || null);
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to complete evidence analysis.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Save Human Legal Review
  // ---------------------------------------------------------------------------
  const handleSaveReview = async () => {
    if (!reviewModalFinding) return;
    try {
      setIsSubmittingReview(true);
      let notes = reviewNotes;
      if (reviewStatusChoice === 'evidence_requested' && requestedDocName.trim()) {
        notes = `${notes ? notes + ' | ' : ''}Requested Exhibit: ${requestedDocName.trim()}`;
      }

      const res = await apiClient.reviewEvidenceFinding(reviewModalFinding._id, {
        reviewStatus: reviewStatusChoice,
        reviewNotes: notes.trim() || undefined,
        humanCorrection: humanCorrection.trim() || undefined,
      });

      if (res.success) {
        setFindings((prev) =>
          prev.map((f) => (f._id === reviewModalFinding._id ? res.finding : f))
        );
        setReviewModalFinding(null);
        setReviewNotes('');
        setHumanCorrection('');
        setRequestedDocName('');
        setStatusMessage({
          type: 'success',
          text: `Finding [${res.finding.findingId}] updated to ${res.finding.reviewStatus.replace(/_/g, ' ')}.`,
        });
      }
    } catch (err: any) {
      alert(`Failed to save review: ${err.message}`);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Save Waive Gap
  // ---------------------------------------------------------------------------
  const handleSaveWaiveGap = async () => {
    if (!waiveModalGap) return;
    try {
      setIsSubmittingWaive(true);
      const res = await apiClient.resolveEvidenceGap(waiveModalGap._id, {
        resolutionStatus: 'waived',
        waivedReason: waiveReason.trim() || 'Waived per attorney legal determination.',
      });

      if (res.success) {
        setGaps((prev) =>
          prev.map((g) => (g._id === waiveModalGap._id ? res.gap : g))
        );
        setWaiveModalGap(null);
        setWaiveReason('');
        setStatusMessage({
          type: 'success',
          text: `Evidence gap for [${res.gap.requiredItem}] updated to waived.`,
        });
      }
    } catch (err: any) {
      alert(`Failed to waive evidence gap: ${err.message}`);
    } finally {
      setIsSubmittingWaive(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 6. Save Criterion Mapping Update
  // ---------------------------------------------------------------------------
  const handleSaveMapping = async () => {
    if (!editMappingModal) return;
    try {
      setIsSubmittingMapping(true);
      const res = await apiClient.updateEvidenceMapping(editMappingModal._id, {
        status: mappingStatusChoice,
        notes: mappingNotes.trim() || undefined,
      });

      if (res.success) {
        setMappings((prev) =>
          prev.map((m) => (m._id === editMappingModal._id ? res.mapping : m))
        );
        setEditMappingModal(null);
        setMappingNotes('');
        setStatusMessage({
          type: 'success',
          text: `Criterion [${res.mapping.criterionTitle}] updated to ${res.mapping.status.replace(/_/g, ' ')}.`,
        });
      }
    } catch (err: any) {
      alert(`Failed to update criteria mapping: ${err.message}`);
    } finally {
      setIsSubmittingMapping(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 7. Open Structured Report Preview
  // ---------------------------------------------------------------------------
  const handleOpenReport = async () => {
    if (!selectedAppId) return;
    try {
      setIsLoadingReport(true);
      setReportModalOpen(true);
      const res = await apiClient.getEvidenceReport(selectedAppId);
      if (res.success) {
        setReportData(res.report);
      }
    } catch (err: any) {
      alert(`Failed to load evidence report: ${err.message}`);
    } finally {
      setIsLoadingReport(false);
    }
  };

  // Filtered Findings
  const filteredFindings = findings.filter((f) => {
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && f.reviewStatus !== statusFilter) return false;
    return true;
  });

  // Severity Breakdown
  const severityBreakdown = {
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
    informational: findings.filter((f) => f.severity === 'informational').length,
  };

  // Filtered Matrix Rows
  const filteredMatrixRows = (matrixData?.rows || []).filter((r) => {
    if (matrixFilter === 'all') return true;
    return r.domain.toLowerCase().includes(matrixFilter.toLowerCase());
  });

  const getSeverityBadge = (sev: Phase7FindingSeverity) => {
    switch (sev) {
      case 'high':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <AlertCircle className="w-3 h-3 mr-1 text-red-600" />
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
            Medium
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Info className="w-3 h-3 mr-1 text-blue-600" />
            Low
          </span>
        );
      case 'informational':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-slate-500" />
            Informational
          </span>
        );
    }
  };

  const getStatusBadge = (status: Phase7ReviewStatus) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Check className="w-3 h-3 mr-1 text-emerald-600" />
            Confirmed
          </span>
        );
      case 'corrected':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
            <FileCheck className="w-3 h-3 mr-1 text-purple-600" />
            Corrected
          </span>
        );
      case 'dismissed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 line-through">
            <X className="w-3 h-3 mr-1 text-slate-400" />
            Dismissed
          </span>
        );
      case 'evidence_requested':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
            <HelpCircle className="w-3 h-3 mr-1 text-amber-600" />
            Evidence Requested
          </span>
        );
      case 'assigned_for_attorney_review':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Scale className="w-3 h-3 mr-1 text-indigo-600" />
            Assigned to Attorney
          </span>
        );
      case 'awaiting_review':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-800 border border-yellow-300">
            <Clock className="w-3 h-3 mr-1 text-yellow-600" />
            Awaiting Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* 1. Header & Application Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-[#172B4D] rounded-lg text-white">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#091E42] tracking-tight">
                Evidence Intelligence
              </h1>
              <p className="text-sm text-slate-500">
                Cross-document verification, discrepancy detection & statutory visa criteria mapping
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          {/* Petition Dropdown */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <label htmlFor="petition-select" className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0">
              Petition:
            </label>
            {applications.length === 0 ? (
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400 bg-slate-100 px-3 py-2 rounded border border-slate-200 flex-1 sm:flex-none">
                  No Petitions Found
                </span>
                <Link
                  href="/dashboard/applications/create"
                  className="inline-flex items-center justify-center text-xs font-semibold bg-[#172B4D] text-white px-3 py-2 rounded shadow-sm hover:bg-[#091E42] min-h-[40px]"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  <span>Create</span>
                </Link>
              </div>
            ) : (
              <select
                id="petition-select"
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                className="bg-white border border-slate-300 rounded-md px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#172B4D] w-full sm:w-auto min-h-[40px]"
              >
                <option value="" disabled>
                  Select a Visa Petition...
                </option>
                {applications.map((app) => (
                  <option key={app._id} value={app._id}>
                    {app.visaCategory} — {app.title || `Application #${app._id.slice(-6)}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Action: Run Analysis */}
          <div className="relative group w-full sm:w-auto">
            <Button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || !selectedAppId || availableDocs.length < 2}
              className={`w-full sm:w-auto min-h-[40px] flex items-center justify-center space-x-2 shadow-sm ${
                availableDocs.length < 2 && !isAnalyzing
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed hover:bg-slate-300'
                  : 'bg-[#172B4D] hover:bg-[#091E42] text-white'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                  <span>Analyzing Evidence...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1 text-emerald-400 fill-emerald-400" />
                  <span>Run Cross-Document Analysis</span>
                </>
              )}
            </Button>

            {/* Explanatory Tooltip when prerequisites are not met */}
            {availableDocs.length < 2 && !isAnalyzing && selectedAppId && (
              <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 hidden group-hover:block z-30 bg-[#091E42] text-white text-[11px] p-2.5 rounded shadow-lg w-64 max-w-xs">
                <p className="font-semibold text-amber-300">Prerequisite Notice:</p>
                <p className="mt-0.5">
                  Cross-document comparison requires at least 2 uploaded exhibits. This petition currently has{' '}
                  <strong>{availableDocs.length}</strong> uploaded exhibit.
                </p>
                <Link
                  href={`/dashboard/documents?applicationId=${selectedAppId}`}
                  className="mt-1.5 inline-block text-blue-300 underline font-semibold"
                >
                  Go to Documents & Upload Exhibits →
                </Link>
              </div>
            )}
          </div>

          {/* Action: Dossier Report */}
          <Button
            variant="outline"
            onClick={handleOpenReport}
            disabled={!selectedAppId}
            className="w-full sm:w-auto min-h-[40px] justify-center border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center space-x-1"
          >
            <Printer className="w-4 h-4 mr-1 text-slate-500" />
            <span>Dossier Report</span>
          </Button>
        </div>
      </div>

      {/* Status Notice Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between border text-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : statusMessage.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : statusMessage.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : statusMessage.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            ) : statusMessage.type === 'info' ? (
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 ml-3"
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Key Metrics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Documents Analyzed */}
        <Card padding="none" className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                Documents Analyzed
              </p>
              <p className="text-2xl font-bold text-[#091E42] mt-1">
                {analyses.length > 0 ? analyses[0].summaryMetrics.documentsAnalyzed : availableDocs.length}
              </p>
              <p className="text-xs text-slate-400 mt-1 truncate">
                {analyses.length > 0
                  ? `Run ${analyses[0].analysisId.slice(-6)} verified`
                  : `${availableDocs.length} uploaded exhibit${availableDocs.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-700 rounded-lg shrink-0 flex items-center justify-center self-center">
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Metric 2: Potential Issues */}
        <Card padding="none" className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                Potential Issues Flagged
              </p>
              <div className="flex items-baseline space-x-2 mt-1">
                <p className="text-2xl font-bold text-[#091E42]">{findings.length}</p>
                {severityBreakdown.high > 0 && (
                  <span className="text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                    {severityBreakdown.high} High
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 truncate">
                {findings.filter((f) => f.reviewStatus === 'awaiting_review').length} awaiting review
              </p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-700 rounded-lg shrink-0 flex items-center justify-center self-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Metric 3: Evidence Gaps */}
        <Card padding="none" className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                Missing Evidence Gaps
              </p>
              <p className="text-2xl font-bold text-[#091E42] mt-1">{gaps.length}</p>
              <p className="text-xs text-slate-400 mt-1 truncate">
                {gaps.filter((g) => g.resolutionStatus === 'open').length} unfulfilled statutory items
              </p>
            </div>
            <div className="p-3 bg-red-50 text-red-700 rounded-lg shrink-0 flex items-center justify-center self-center">
              <HelpCircle className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Metric 4: Statutory Criteria Coverage */}
        <Card padding="none" className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                Criteria Coverage
              </p>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <p className="text-2xl font-bold text-[#091E42]">
                  {mappings.length > 0 ? `${coveragePercentage}%` : '0%'}
                </p>
                <span className="text-xs font-medium text-slate-500 truncate">
                  {mappings.length > 0
                    ? `(${mappings.filter((m) => m.status === 'supported').length}/${mappings.length} met)`
                    : 'Not evaluated'}
                </span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-[#172B4D] h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${mappings.length > 0 ? coveragePercentage : 0}%` }}
                />
              </div>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg shrink-0 flex items-center justify-center self-center">
              <Scale className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Five-Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-[#172B4D] text-[#172B4D]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Overview & Runs
          </button>
          <button
            onClick={() => setActiveTab('findings')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'findings'
                ? 'border-[#172B4D] text-[#172B4D]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>Review Queue</span>
            {findings.length > 0 && (
              <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full">
                {findings.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'border-[#172B4D] text-[#172B4D]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Comparison Matrix
          </button>
          <button
            onClick={() => setActiveTab('gaps')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'gaps'
                ? 'border-[#172B4D] text-[#172B4D]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>Evidence Gaps</span>
            {gaps.length > 0 && (
              <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                {gaps.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('criteria')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'criteria'
                ? 'border-[#172B4D] text-[#172B4D]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Visa Criteria Mapping
          </button>
        </nav>
      </div>

      {/* 4. Tab 1: Overview & Runs History */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Case Context Banner */}
          {selectedApp && (
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Visa Category</span>
                    <p className="font-bold text-[#091E42] text-base mt-0.5">{selectedApp.visaCategory}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Petition Title</span>
                    <p className="font-medium text-slate-700 mt-0.5">{selectedApp.title || 'Untitled Case'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Current Status</span>
                    <div className="mt-0.5">
                      <Badge variant="neutral" className="text-xs font-semibold uppercase">
                        {selectedApp.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Uploaded Exhibits</span>
                    <div className="mt-0.5 flex items-center space-x-2">
                      <span className="font-medium text-slate-800">{availableDocs.length} files</span>
                      <Link
                        href={`/dashboard/documents?applicationId=${selectedAppId}`}
                        className="text-xs text-[#172B4D] underline hover:text-[#091E42]"
                      >
                        Manage Documents
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Action & Methodology Note */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start space-x-3">
            <Info className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-800 text-sm">Dual Verification Engine Architecture</p>
              <p className="mt-1">
                Findings combine <strong>deterministic rule validation</strong> (identity normalization, timeline chronology, degree conferral checks, LCA wage rate verification) with <strong>AI contextual analysis</strong>. Severity levels reflect human review priority and never constitute legal fraud determinations.
              </p>
            </div>
          </div>

          {/* Past Analysis Runs Table */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-[#091E42]">Analysis History & Runs</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Log of automated cross-document verification executions for this petition
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadEvidenceData(selectedAppId)}
                className="text-xs border-slate-300 text-slate-600"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                <span>Refresh Runs</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {analyses.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No cross-document analysis has been run on this petition yet.</p>
                  <Button
                    onClick={handleRunAnalysis}
                    disabled={isAnalyzing || availableDocs.length < 2}
                    className="mt-3 bg-[#172B4D] text-white text-xs"
                  >
                    Run First Analysis
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Run ID</th>
                        <th className="py-3 px-4">Executed At</th>
                        <th className="py-3 px-4">Duration</th>
                        <th className="py-3 px-4">Docs</th>
                        <th className="py-3 px-4">Issues</th>
                        <th className="py-3 px-4">Gaps</th>
                        <th className="py-3 px-4">Coverage</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analyses.map((a) => (
                        <tr key={a._id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono text-xs font-bold text-[#172B4D]">
                            {a.analysisId}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            {new Date(a.startedAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {a.durationMs ? `${a.durationMs}ms` : '—'}
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-slate-700">
                            {a.summaryMetrics.documentsAnalyzed}
                          </td>
                          <td className="py-3 px-4 text-xs font-medium">
                            <span className="text-slate-800">{a.summaryMetrics.findingsCount}</span>
                            {a.summaryMetrics.findingsBySeverity.high > 0 && (
                              <span className="ml-1 text-red-600 font-bold">
                                ({a.summaryMetrics.findingsBySeverity.high} High)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-slate-700">
                            {a.summaryMetrics.gapsCount}
                          </td>
                          <td className="py-3 px-4 text-xs font-bold text-[#172B4D]">
                            {a.summaryMetrics.coveragePercentage}%
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. Tab 2: Findings Review Queue */}
      {activeTab === 'findings' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase mr-1">Severity:</span>
              {['all', 'high', 'medium', 'low', 'informational'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    severityFilter === sev
                      ? 'bg-[#172B4D] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sev.charAt(0).toUpperCase() + sev.slice(1)}
                  {sev === 'high' && severityBreakdown.high > 0 && ` (${severityBreakdown.high})`}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase mr-1">Review:</span>
              {['all', 'awaiting_review', 'confirmed', 'corrected', 'dismissed'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === st
                      ? 'bg-[#172B4D] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {/* Findings List */}
          {filteredFindings.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-lg">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Discrepancy Findings</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No findings match the current filter criteria, or all extracted facts across application exhibits are consistent.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFindings.map((finding) => (
                <Card
                  key={finding._id}
                  className="border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-all"
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        {/* Badges Row */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-500">
                            {finding.findingId}
                          </span>
                          {getSeverityBadge(finding.severity)}
                          <span className="text-xs bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded border border-slate-200 capitalize">
                            {finding.category.replace(/_/g, ' ')}
                          </span>
                          {getStatusBadge(finding.reviewStatus)}
                          <span className="text-xs text-slate-400">
                            Confidence: {Math.round(finding.confidence * 100)}%
                          </span>
                        </div>

                        {/* Title & Explanation */}
                        <h4 className="text-base font-bold text-[#091E42]">{finding.title}</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {finding.explanation}
                        </p>

                        {/* Affected Documents Pills */}
                        {finding.affectedDocuments && finding.affectedDocuments.length > 0 && (
                          <div className="pt-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                              Compared Exhibits:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {finding.affectedDocuments.map((ad, idx) => (
                                <div
                                  key={idx}
                                  className="inline-flex items-center text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-slate-700"
                                >
                                  <FileText className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                  <span className="font-medium">{ad.documentTitle}</span>
                                  {ad.extractedValue && (
                                    <span className="ml-1.5 font-mono text-[#172B4D] bg-white px-1 rounded border border-slate-200">
                                      &quot;{ad.extractedValue}&quot;
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Extracted Values Side-by-Side Table */}
                        {finding.extractedValues && finding.extractedValues.length > 1 && (
                          <div className="pt-2">
                            <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5 text-xs">
                              <span className="font-semibold text-slate-700 block mb-1">
                                Discrepancy Extracted Values:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {finding.extractedValues.map((ev, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-white p-2 rounded border border-slate-200"
                                  >
                                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                                      Source: {ev.source}
                                    </span>
                                    <span className="font-mono font-bold text-[#091E42] text-xs">
                                      {ev.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Recommended Action */}
                        <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-md text-xs text-amber-900 mt-2 flex items-start space-x-2">
                          <HelpCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-semibold">Recommended Review Action: </span>
                            <span>{finding.recommendedReviewAction}</span>
                          </div>
                        </div>

                        {/* Review History / Notes if already reviewed */}
                        {finding.reviewNotes && (
                          <div className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-700">
                            <span className="font-semibold text-slate-800">Attorney / Reviewer Notes: </span>
                            <span>{finding.reviewNotes}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="flex-shrink-0 pt-2 md:pt-0">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setReviewModalFinding(finding);
                            setReviewStatusChoice(
                              finding.reviewStatus === 'awaiting_review'
                                ? 'confirmed'
                                : finding.reviewStatus
                            );
                            setReviewNotes(finding.reviewNotes || '');
                            setHumanCorrection(finding.humanCorrection || '');
                            setRequestedDocName('');
                          }}
                          className="border-[#172B4D] text-[#172B4D] hover:bg-[#172B4D] hover:text-white text-xs font-semibold"
                        >
                          Review Finding
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. Tab 3: Cross-Document Comparison Matrix */}
      {activeTab === 'matrix' && (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-[#091E42]">
                Cross-Document Attribute Matrix
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Side-by-side comparison of extracted identity, academic, employment, and wage attributes
              </CardDescription>
            </div>
            {/* Filter by Domain */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500 font-semibold uppercase">Filter Domain:</span>
              <select
                value={matrixFilter}
                onChange={(e) => setMatrixFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
              >
                <option value="all">All Domains</option>
                <option value="identity">Identity</option>
                <option value="education">Education</option>
                <option value="employment">Employment</option>
                <option value="wage">Wage Compliance</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {filteredMatrixRows.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No comparison matrix attributes extracted yet.</p>
                <p className="text-xs text-slate-400 mt-1">Run an analysis to generate the attribute matrix.</p>
              </div>
            ) : (
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Evidentiary Domain</th>
                    <th className="py-3 px-4">Attribute Tested</th>
                    <th className="py-3 px-4">Extracted Values Across Exhibits</th>
                    <th className="py-3 px-4">Consistency Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMatrixRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-700 flex items-center space-x-1.5">
                        {row.domain === 'Identity' && <User className="w-4 h-4 text-blue-600" />}
                        {row.domain === 'Education' && <GraduationCap className="w-4 h-4 text-emerald-600" />}
                        {row.domain === 'Employment' && <Briefcase className="w-4 h-4 text-purple-600" />}
                        {row.domain === 'Wage Compliance' && <DollarSign className="w-4 h-4 text-emerald-700" />}
                        <span>{row.domain}</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{row.attribute}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {row.values.length === 0 ? (
                          <span className="text-slate-400 italic">Not detected in exhibits</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {row.values.map((v, i) => (
                              <span
                                key={i}
                                className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-xs font-mono text-[#172B4D]"
                                title={`Source: ${v.documentTitle}`}
                              >
                                {v.extractedValue}
                                <span className="text-[10px] text-slate-400 ml-1">({v.documentTitle.slice(0, 15)})</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {row.status === 'consistent' && (
                          <Badge variant="success">Consistent</Badge>
                        )}
                        {row.status === 'discrepancy' && (
                          <Badge variant="error">Discrepancy Detected</Badge>
                        )}
                        {row.status === 'single_source' && (
                          <Badge variant="info">Single Source</Badge>
                        )}
                        {row.status === 'missing' && (
                          <Badge variant="neutral">Not Found</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* 7. Tab 4: Evidence Gap Analysis */}
      {activeTab === 'gaps' && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
            <h3 className="text-base font-bold text-[#091E42]">Statutory Evidence Gap Checklist</h3>
            <p className="text-xs text-slate-500 mt-1">
              Required evidentiary exhibits for {selectedApp?.visaCategory || 'Visa'} petition adjudication under 8 CFR regulations.
            </p>
          </div>

          <div className="space-y-3">
            {gaps.length === 0 ? (
              <div className="p-8 text-center bg-white border rounded-lg text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm font-semibold text-slate-700">No Evidence Gaps Identified</p>
                <p className="text-xs text-slate-500 mt-1">All mandatory statutory exhibit categories have attached evidence.</p>
              </div>
            ) : (
              gaps.map((gap) => (
                <Card
                  key={gap._id}
                  className={`border-slate-200 bg-white shadow-sm ${
                    gap.resolutionStatus === 'waived'
                      ? 'border-l-4 border-l-slate-300 opacity-75'
                      : gap.priority === 'high'
                      ? 'border-l-4 border-l-red-500'
                      : 'border-l-4 border-l-amber-500'
                  }`}
                >
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-[#091E42]">{gap.requiredItem}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            gap.priority === 'high'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {gap.priority} Priority
                        </span>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded uppercase ${
                            gap.resolutionStatus === 'open'
                              ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                              : gap.resolutionStatus === 'waived'
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {gap.resolutionStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{gap.description}</p>
                      <p className="text-[11px] text-slate-400 italic">{gap.statutoryImportance}</p>
                      {gap.waivedReason && (
                        <p className="text-[11px] text-slate-600 font-medium bg-slate-50 p-1.5 rounded border border-slate-200 mt-1">
                          Waiver Reason: {gap.waivedReason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {gap.resolutionStatus === 'open' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setWaiveModalGap(gap);
                              setWaiveReason('');
                            }}
                            className="text-xs border-slate-300 text-slate-600"
                          >
                            Waive Gap
                          </Button>
                          <Link
                            href={`/dashboard/documents?applicationId=${selectedAppId}`}
                            className="inline-flex items-center text-xs font-semibold bg-[#172B4D] hover:bg-[#091E42] text-white px-3 py-1.5 rounded-md shadow-sm"
                          >
                            <span>Upload Exhibit</span>
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Link>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* 8. Tab 5: Statutory Criteria Mapping */}
      {activeTab === 'criteria' && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#091E42]">
                Statutory Criteria Coverage: {selectedApp?.visaCategory}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mapping of uploaded exhibits to required statutory evidentiary prongs
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-600">Total Coverage:</span>
              <span className="text-base font-bold text-[#172B4D] bg-slate-100 px-2.5 py-1 rounded">
                {mappings.length > 0 ? `${coveragePercentage}%` : 'Not evaluated'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {mappings.length === 0 ? (
              <div className="p-8 text-center bg-white border rounded-lg text-slate-400">
                <Scale className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold text-slate-700">No Criteria Mappings Evaluated</p>
                <p className="text-xs text-slate-500 mt-1">Run an analysis to map exhibits to statutory visa criteria.</p>
              </div>
            ) : (
              mappings.map((m) => (
                <Card key={m._id} className="border-slate-200 bg-white shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-[#091E42]">{m.criterionTitle}</span>
                          {m.criterionProng && (
                            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {m.criterionProng}
                            </span>
                          )}
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded ${
                              m.status === 'supported'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.status === 'partially_supported'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {m.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{m.statutoryBasis}</p>
                        {m.notes && (
                          <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                            <strong>Attorney Evaluation:</strong> {m.notes}
                          </p>
                        )}

                        {/* Mapped Documents */}
                        {m.mappedDocuments && m.mappedDocuments.length > 0 && (
                          <div className="pt-2">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                              Attached Supporting Exhibits:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {m.mappedDocuments.map((doc, idx) => (
                                <div
                                  key={idx}
                                  className="inline-flex items-center text-xs bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-slate-700"
                                >
                                  <FileCheck className="w-3 h-3 text-emerald-600 mr-1" />
                                  <span>{doc.documentTitle}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Edit Mapping Button */}
                      <div className="flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditMappingModal(m);
                            setMappingStatusChoice(m.status);
                            setMappingNotes(m.notes || '');
                          }}
                          className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center space-x-1"
                        >
                          <Edit3 className="w-3 h-3 mr-1" />
                          <span>Evaluate Criterion</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* 9. Human Verification Action Modal */}
      {reviewModalFinding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-[#091E42]">Human Legal Review</h3>
                <p className="text-xs text-slate-500">Record auditor decision on discrepancy</p>
              </div>
              <button
                onClick={() => setReviewModalFinding(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-2 bg-slate-50 p-3 rounded border border-slate-200">
              <span className="font-bold text-slate-700 block">{reviewModalFinding.title}</span>
              <p className="text-slate-600">{reviewModalFinding.explanation}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Review Decision:</label>
                <select
                  value={reviewStatusChoice}
                  onChange={(e) => setReviewStatusChoice(e.target.value as Phase7ReviewStatus)}
                  className="w-full border border-slate-300 rounded p-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#172B4D]"
                >
                  <option value="confirmed">Confirm Finding (Valid Discrepancy)</option>
                  <option value="corrected">Corrected (Human Rectified)</option>
                  <option value="dismissed">Dismiss (False Positive / Adjudicator Note)</option>
                  <option value="evidence_requested">Request Additional Evidence</option>
                  <option value="assigned_for_attorney_review">Assign for Senior Attorney Review</option>
                </select>
              </div>

              {reviewStatusChoice === 'corrected' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Human Correction Value:</label>
                  <input
                    type="text"
                    value={humanCorrection}
                    onChange={(e) => setHumanCorrection(e.target.value)}
                    placeholder="e.g. Correct start date: 06/01/2021"
                    className="w-full border border-slate-300 rounded p-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#172B4D]"
                  />
                </div>
              )}

              {reviewStatusChoice === 'evidence_requested' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Requested Evidence Exhibit:</label>
                  <input
                    type="text"
                    value={requestedDocName}
                    onChange={(e) => setRequestedDocName(e.target.value)}
                    placeholder="e.g. Official Birth Certificate or Passport Bio-Page"
                    className="w-full border border-slate-300 rounded p-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#172B4D]"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reviewer Justification / Notes:</label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Record justification for adjudicator audit trail..."
                  className="w-full border border-slate-300 rounded p-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#172B4D]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => setReviewModalFinding(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveReview}
                disabled={isSubmittingReview}
                className="bg-[#172B4D] hover:bg-[#091E42] text-white text-xs font-semibold"
              >
                {isSubmittingReview ? 'Saving Decision...' : 'Save Decision'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Waive Evidence Gap Modal */}
      {waiveModalGap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-[#091E42]">Waive Evidence Gap</h3>
                <p className="text-xs text-slate-500">Record legal justification for omission</p>
              </div>
              <button
                onClick={() => setWaiveModalGap(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs bg-amber-50 p-3 rounded border border-amber-200 text-amber-900">
              <span className="font-bold block">{waiveModalGap.requiredItem}</span>
              <p className="mt-1">{waiveModalGap.statutoryImportance}</p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-700 block">Waiver Justification / Legal Basis:</label>
              <textarea
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                rows={3}
                placeholder="Explain why this statutory item is not required for this petition..."
                className="w-full border border-slate-300 rounded p-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#172B4D]"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => setWaiveModalGap(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveWaiveGap}
                disabled={isSubmittingWaive}
                className="bg-[#172B4D] hover:bg-[#091E42] text-white text-xs font-semibold"
              >
                {isSubmittingWaive ? 'Saving...' : 'Confirm Waiver'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Edit Criteria Mapping Modal */}
      {editMappingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-[#091E42]">Evaluate Criterion</h3>
                <p className="text-xs text-slate-500">Update statutory prong evaluation</p>
              </div>
              <button
                onClick={() => setEditMappingModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs bg-slate-50 p-3 rounded border border-slate-200">
              <span className="font-bold text-slate-800 block">{editMappingModal.criterionTitle}</span>
              <p className="text-slate-600 mt-1">{editMappingModal.statutoryBasis}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Evidentiary Status:</label>
                <select
                  value={mappingStatusChoice}
                  onChange={(e) => setMappingStatusChoice(e.target.value as any)}
                  className="w-full border border-slate-300 rounded p-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#172B4D]"
                >
                  <option value="supported">Supported (Sufficient exhibits attached)</option>
                  <option value="partially_supported">Partially Supported (Requires additional evidence)</option>
                  <option value="needs_review">Needs Review (Ambiguous evidence)</option>
                  <option value="unsupported">Unsupported (No exhibits attached)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Attorney Assessment Notes:</label>
                <textarea
                  value={mappingNotes}
                  onChange={(e) => setMappingNotes(e.target.value)}
                  rows={3}
                  placeholder="Record assessment notes for this statutory prong..."
                  className="w-full border border-slate-300 rounded p-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#172B4D]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => setEditMappingModal(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveMapping}
                disabled={isSubmittingMapping}
                className="bg-[#172B4D] hover:bg-[#091E42] text-white text-xs font-semibold"
              >
                {isSubmittingMapping ? 'Saving...' : 'Update Criterion'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 12. Dossier Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-[#172B4D]" />
                <h3 className="text-base font-bold text-[#091E42]">
                  Evidence Review Dossier Summary
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="text-xs flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  <span>Print Dossier</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `evidence-report-${selectedAppId}.json`;
                    a.click();
                  }}
                  className="text-xs flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  <span>Export JSON</span>
                </Button>
                <button
                  onClick={() => setReportModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
              {isLoadingReport || !reportData ? (
                <div className="p-12 text-center text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#172B4D]" />
                  <p>Generating Evidence Review Dossier...</p>
                </div>
              ) : (
                <>
                  {/* Report Header */}
                  <div className="border-b pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl font-bold text-[#091E42]">
                          IMMIGRATION & WORK VISA DOSSIER SUMMARY
                        </h2>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          Report ID: {reportData.reportId} | Generated:{' '}
                          {new Date(reportData.generatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right text-xs">
                        <span className="font-semibold text-slate-800 block">Audited By:</span>
                        <span className="text-slate-600">{reportData.generatedBy.name}</span>
                        <span className="text-slate-400 block capitalize">
                          Role: {reportData.generatedBy.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Stats */}
                  <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-center text-xs">
                    <div>
                      <span className="text-slate-400 uppercase font-semibold block">Exhibits</span>
                      <span className="text-base font-bold text-[#091E42]">
                        {reportData.summary.documentsCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-semibold block">Issues Flagged</span>
                      <span className="text-base font-bold text-[#091E42]">
                        {reportData.summary.findingsCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-semibold block">Open Gaps</span>
                      <span className="text-base font-bold text-red-700">
                        {reportData.summary.gapsCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-semibold block">Coverage</span>
                      <span className="text-base font-bold text-[#172B4D]">
                        {reportData.summary.criteriaCoveragePercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Verified Facts */}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
                      Verified Baseline Facts
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
                      {reportData.verifiedFacts.map((fact, idx) => (
                        <li key={idx}>{fact}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Discrepancies Table */}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
                      Discrepancies & Findings Audit Trail
                    </h4>
                    <table className="w-full text-xs text-left border border-slate-200">
                      <thead className="bg-slate-50 uppercase text-slate-500 font-semibold border-b">
                        <tr>
                          <th className="p-2">ID</th>
                          <th className="p-2">Title</th>
                          <th className="p-2">Severity</th>
                          <th className="p-2">Status</th>
                          <th className="p-2">Explanation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.findings.map((f) => (
                          <tr key={f.id}>
                            <td className="p-2 font-mono font-bold">{f.id}</td>
                            <td className="p-2 font-medium">{f.title}</td>
                            <td className="p-2 uppercase font-semibold">{f.severity}</td>
                            <td className="p-2 capitalize">{f.reviewStatus.replace(/_/g, ' ')}</td>
                            <td className="p-2 text-slate-600">{f.explanation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Statutory Coverage */}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
                      Statutory Visa Criteria Evaluation
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {reportData.statutoryCriteria.map((c, idx) => (
                        <div key={idx} className="p-2 border rounded bg-slate-50 flex justify-between items-center">
                          <span className="font-medium text-slate-800">{c.criterion}</span>
                          <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-white border">
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer Notice */}
                  <div className="pt-4 border-t text-[11px] text-slate-400 text-center">
                    {reportData.auditNotes}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EvidencePage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#172B4D]" />
          <p className="text-sm">Loading Evidence Intelligence Workspace...</p>
        </div>
      }
    >
      <EvidenceIntelligenceContent />
    </Suspense>
  );
}
