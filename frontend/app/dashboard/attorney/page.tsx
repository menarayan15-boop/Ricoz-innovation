'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Search,
  Filter,
  Check,
  X,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  UserCheck,
  Briefcase,
  ChevronRight,
  Eye,
  RefreshCw,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { ApplicationRecord, VisaCategory } from '@/types';
import { apiClient, ApiError } from '@/services/apiClient';

export default function AttorneyWorkspacePage() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Missing Evidence Dialog State
  const [showEvidenceDialog, setShowEvidenceDialog] = useState<boolean>(false);
  const [reqDocName, setReqDocName] = useState<string>('');
  const [reqReason, setReqReason] = useState<string>('');

  const fetchCases = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.getApplications();
      if (res.success && res.applications) {
        setApplications(res.applications);
        if (!selectedCaseId && res.applications.length > 0) {
          setSelectedCaseId(res.applications[0]._id);
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        setErrorMessage('Authentication required. Please sign in with an Attorney or Admin account.');
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load cases.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const activeCase = applications.find((c) => c._id === selectedCaseId) || applications[0];

  const handleApproveCase = async () => {
    if (!activeCase) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await apiClient.recordAttorneyReview(activeCase._id, {
        status: 'approved',
        comments: 'Certified that all exhibits comply with USCIS evidentiary standards.',
      });
      if (res.success) {
        setSuccessMessage(`Case ${activeCase.title} approved and locked for submission.`);
        fetchCases();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to record approval.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase || !reqDocName.trim() || !reqReason.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.requestMissingEvidence(activeCase._id, {
        documentName: reqDocName.trim(),
        reason: reqReason.trim(),
      });
      if (res.success) {
        setSuccessMessage(`Evidence request for "${reqDocName}" dispatched to applicant.`);
        setShowEvidenceDialog(false);
        setReqDocName('');
        setReqReason('');
        fetchCases();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to request evidence.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Scale className="w-5 h-5 text-[#172B4D]" />
            <h1 className="text-xl font-bold text-[#172B4D]">
              Attorney Review &amp; Statutory Counsel Portal
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#627D98]">
            Adjudicate evidence sufficiency, record legal sign-offs, and issue formal missing evidence notices.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="md"
            onClick={fetchCases}
            disabled={isLoading}
            className="space-x-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </Button>
          <Badge variant="navy" size="md">
            Attorney Access Active
          </Badge>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3 bg-[#FFF5F5] border border-[#FFCDD2] rounded-lg text-xs text-[#C62828] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs font-bold">×</button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-xs text-[#166534] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16A34A]" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-xs font-bold">×</button>
        </div>
      )}

      {/* Main Grid: Case List (1/3) + Review Pane (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Casework Queue */}
        <div className="space-y-4">
          <Card padding="none">
            <div className="p-4 border-b border-[#F1F5F9] flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Assigned Petitions</CardTitle>
                <CardDescription>Live cases in MongoDB Atlas</CardDescription>
              </div>
              <Badge variant="neutral" size="sm">{applications.length} Cases</Badge>
            </div>

            <div className="divide-y divide-[#F1F5F9] max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <div className="p-6 text-center text-xs text-[#829AB1] space-y-2">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto text-[#172B4D]" />
                  <span>Loading cases...</span>
                </div>
              ) : applications.length > 0 ? (
                applications.map((c) => {
                  const applicantName =
                    typeof c.applicantId === 'object' && c.applicantId !== null
                      ? c.applicantId.name
                      : (c.formData?.applicantName as string) || 'Applicant';
                  const isSelected = c._id === selectedCaseId;

                  return (
                    <div
                      key={c._id}
                      onClick={() => setSelectedCaseId(c._id)}
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#F0F4F8] border-l-4 border-l-[#172B4D]'
                          : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-semibold text-xs text-[#172B4D]">
                          {applicantName}
                        </span>
                        <Badge variant="navy" size="sm">
                          {c.visaCategory}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-[#627D98] truncate mt-0.5">
                        {c.title}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-[#829AB1]">
                        <span>Status: {c.status}</span>
                        <span>ID: {c._id.slice(-6).toUpperCase()}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-[#829AB1]">
                  No assigned cases currently require legal review.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Case Adjudication Console */}
        <div className="lg:col-span-2 space-y-4">
          {activeCase ? (
            <Card>
              <CardContent className="p-6 space-y-6">
                {/* Case Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#F1F5F9]">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-lg font-bold text-[#172B4D]">
                        {typeof activeCase.applicantId === 'object' && activeCase.applicantId !== null
                          ? activeCase.applicantId.name
                          : (activeCase.formData?.applicantName as string) || activeCase.title}
                      </h2>
                      <Badge variant="navy" size="sm">{activeCase.visaCategory}</Badge>
                      <Badge
                        variant={
                          activeCase.status === 'approved_for_submission'
                            ? 'success'
                            : activeCase.status === 'under_attorney_review'
                            ? 'warning'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {activeCase.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#627D98] mt-0.5">
                      Case ID: <span className="font-mono">{activeCase._id}</span>
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEvidenceDialog(true)}
                      className="text-xs space-x-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Request Evidence</span>
                    </Button>
                    <Link href={`/dashboard/applications/${activeCase._id}`}>
                      <Button variant="primary" size="sm" className="text-xs space-x-1">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Open Dossier</span>
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Evidence Request Form Modal */}
                {showEvidenceDialog && (
                  <div className="p-4 bg-[#FFF8E1] border border-[#FFE082] rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#B78103] flex items-center space-x-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Issue Formal Missing Evidence Request</span>
                      </h4>
                      <button
                        onClick={() => setShowEvidenceDialog(false)}
                        className="text-xs font-bold text-[#B78103]"
                      >
                        ×
                      </button>
                    </div>
                    <form onSubmit={handleRequestEvidence} className="space-y-3">
                      <div>
                        <label className="text-[11px] font-semibold text-[#172B4D] block">
                          Document / Exhibit Name
                        </label>
                        <input
                          type="text"
                          value={reqDocName}
                          onChange={(e) => setReqDocName(e.target.value)}
                          placeholder="e.g. Certified LCA ETA-9035 or Peer Consultation Letter"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded mt-1"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-[#172B4D] block">
                          Legal Reason / Evidentiary Defect
                        </label>
                        <textarea
                          value={reqReason}
                          onChange={(e) => setReqReason(e.target.value)}
                          placeholder="Explain what is missing and why USCIS regulations require this evidence..."
                          className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded mt-1 h-16"
                          required
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowEvidenceDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isSubmitting}
                          className="bg-[#B78103] hover:bg-[#8F6300] text-white"
                        >
                          {isSubmitting ? 'Sending Request...' : 'Send Notice to Applicant'}
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Statutory Checklist Progress */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#486581]">
                      Statutory Evidentiary Checklist
                    </h3>
                    <span className="text-[11px] text-[#829AB1]">
                      {activeCase.checklist?.filter((i) => i.isCompleted).length || 0} / {activeCase.checklist?.length || 0} Items Checked
                    </span>
                  </div>

                  <div className="space-y-2">
                    {activeCase.checklist && activeCase.checklist.length > 0 ? (
                      activeCase.checklist.map((item) => (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded border text-xs flex items-center justify-between ${
                            item.isCompleted
                              ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                              : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#486581]'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            {item.isCompleted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-[#829AB1]" />
                            )}
                            <span className="font-medium">{item.label}</span>
                          </div>
                          <Badge variant={item.isCompleted ? 'success' : 'neutral'} size="sm">
                            {item.isCompleted ? 'Verified' : 'Pending'}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#829AB1]">No checklist items initialized.</p>
                    )}
                  </div>
                </div>

                {/* Missing Evidence Alerts on this case */}
                {activeCase.missingEvidenceRequests && activeCase.missingEvidenceRequests.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[#C62828] uppercase tracking-wider">
                      Outstanding Evidence Requests
                    </h4>
                    {activeCase.missingEvidenceRequests.map((req, i) => (
                      <div key={i} className="p-3 bg-[#FFF5F5] border border-[#FFCDD2] rounded text-xs space-y-1">
                        <span className="font-semibold text-[#C62828]">{req.documentName}</span>
                        <p className="text-[#4A5568]">{req.reason}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formal Attorney Sign-Off Box */}
                <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#CBD5E1] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="font-semibold text-xs text-[#172B4D] block">
                      Formal Attorney Review Sign-Off
                    </span>
                    <p className="text-[11px] text-[#627D98]">
                      Certifies that all exhibits have been reviewed against USCIS evidentiary standards for {activeCase.visaCategory}.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleApproveCase}
                    disabled={isSubmitting || activeCase.status === 'approved_for_submission'}
                    className="bg-[#172B4D] hover:bg-[#091E42] text-white shrink-0 space-x-1"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>{activeCase.status === 'approved_for_submission' ? 'Case Approved' : 'Sign & Lock Dossier'}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-xs text-[#829AB1]">
                Select an application from the queue to start attorney adjudication.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
