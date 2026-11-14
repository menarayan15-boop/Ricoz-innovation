'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  FolderKanban,
  FileCheck,
  Clock,
  AlertTriangle,
  FileText,
  Briefcase,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ChevronRight,
  Scale,
  RefreshCw,
  AlertCircle,
  Upload,
  Download,
  Trash2,
  CheckSquare,
  Square,
  Shield,
  Save,
  Send,
  User,
  GraduationCap,
  History,
  Edit,
  Tag,
  Check,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ApplicationRecord, DocumentRecord, ChecklistItem, ApplicationStatus } from '@/types';
import { apiClient, ApiError } from '@/services/apiClient';

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params?.id as string;

  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'checklist' | 'profile' | 'visa_specifics' | 'documents' | 'history'>('checklist');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);

  // Status Modal State
  const [statusModalOpen, setStatusModalOpen] = useState<boolean>(false);
  const [newStatus, setNewStatus] = useState<ApplicationStatus>('in_progress');
  const [statusReason, setStatusReason] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Add Custom Item Modal State
  const [customItemModalOpen, setCustomItemModalOpen] = useState<boolean>(false);
  const [customLabel, setCustomLabel] = useState<string>('');
  const [customSection, setCustomSection] = useState<string>('Additional Evidentiary Exhibits');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [customRequired, setCustomRequired] = useState<boolean>(false);

  const fetchApplicationDetails = async () => {
    if (!applicationId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [appRes, docsRes] = await Promise.all([
        apiClient.getApplication(applicationId),
        apiClient.getApplicationDocuments(applicationId).catch(() => ({ success: true, count: 0, documents: [] })),
      ]);

      if (appRes.success && appRes.application) {
        setApplication(appRes.application);
        setNewStatus(appRes.application.status);
      }
      if (docsRes.success && docsRes.documents) {
        setDocuments(docsRes.documents);
      }
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        setErrorMessage('Authentication required. Please log in.');
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : 'Failed to retrieve application details.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationDetails();
  }, [applicationId]);

  const handleToggleChecklist = async (itemId: string, currentStatus: boolean) => {
    if (!application) return;
    setTogglingItemId(itemId);
    setSuccessMessage(null);
    setErrorMessage(null);

    const updatedStatus = !currentStatus;

    // Optimistic local update
    const previousChecklist = [...(application.checklist || [])];
    const updatedChecklist = previousChecklist.map((item) =>
      item.id === itemId ? { ...item, isCompleted: updatedStatus } : item
    );
    setApplication({ ...application, checklist: updatedChecklist });

    try {
      const res = await apiClient.toggleChecklistItem(application._id, itemId, updatedStatus);
      if (res.success && res.checklist) {
        setApplication((prev) =>
          prev
            ? {
                ...prev,
                checklist: res.checklist,
                progressPercentage: res.progressPercentage !== undefined ? res.progressPercentage : prev.progressPercentage,
              }
            : null
        );
      }
    } catch (err) {
      setApplication((prev) => (prev ? { ...prev, checklist: previousChecklist } : null));
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update checklist item.');
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleAddCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application || !customLabel.trim()) return;
    try {
      const res = await apiClient.addCustomChecklistItem(application._id, {
        label: customLabel.trim(),
        section: customSection.trim() || 'Additional Exhibits',
        description: customDescription.trim(),
        required: customRequired,
      });
      if (res.success && res.checklist) {
        setApplication((prev) =>
          prev
            ? {
                ...prev,
                checklist: res.checklist,
                progressPercentage: res.progressPercentage !== undefined ? res.progressPercentage : prev.progressPercentage,
              }
            : null
        );
        setCustomItemModalOpen(false);
        setCustomLabel('');
        setCustomDescription('');
        setSuccessMessage('Custom evidence item added to dossier checklist.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to add custom checklist item.');
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application) return;
    setIsUpdatingStatus(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.updateApplicationStatus(application._id, newStatus, statusReason.trim() || undefined);
      if (res.success && res.application) {
        setApplication(res.application);
        setStatusModalOpen(false);
        setStatusReason('');
        setSuccessMessage(`Application status transitioned to ${newStatus}.`);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update application status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDownload = async (doc: DocumentRecord) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const downloadUrl = apiClient.getDownloadUrl(doc._id);
      
      const res = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error(`Failed to download file (HTTP ${res.status})`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error initiating file download.');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to remove this evidentiary exhibit?')) return;
    try {
      const res = await apiClient.deleteDocument(docId);
      if (res.success) {
        setDocuments((prev) => prev.filter((d) => d._id !== docId));
        setSuccessMessage('Document exhibit deleted successfully.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete document.');
    }
  };

  const getStatusBadge = (status?: ApplicationStatus) => {
    switch (status) {
      case 'dossier_prepared':
      case 'approved_for_submission':
        return <Badge variant="success">Ready for Filing</Badge>;
      case 'ready_for_final_review':
        return <Badge variant="navy">Ready for Review</Badge>;
      case 'under_attorney_review':
        return <Badge variant="warning">Under Legal Review</Badge>;
      case 'evidence_pending':
      case 'documents_pending':
        return <Badge variant="warning">Evidence Pending</Badge>;
      case 'changes_requested':
        return <Badge variant="error">Changes Requested</Badge>;
      case 'in_progress':
        return <Badge variant="info">In Progress</Badge>;
      case 'archived':
        return <Badge variant="neutral">Archived</Badge>;
      default:
        return <Badge variant="neutral">Draft</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-[#172B4D] mx-auto" />
        <p className="text-xs text-[#627D98]">Loading dossier case from MongoDB Atlas...</p>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center space-y-4 bg-white rounded-lg border border-[#E2E8F0] p-8">
        <AlertTriangle className="w-10 h-10 text-[#C62828] mx-auto" />
        <h2 className="text-base font-bold text-[#172B4D]">Application Not Found</h2>
        <p className="text-xs text-[#627D98] max-w-sm mx-auto">
          The requested dossier record could not be found or you do not have permission to access it.
        </p>
        <Link href="/dashboard/applications">
          <Button size="sm" variant="outline">
            ← Back to Applications
          </Button>
        </Link>
      </div>
    );
  }

  const applicantName =
    application.applicantDetails?.fullName ||
    (typeof application.applicantId === 'object' && application.applicantId !== null
      ? application.applicantId.name
      : (application.formData?.applicantName as string) || 'Applicant');

  const sponsorName =
    application.employmentDetails?.currentEmployer ||
    (application.formData?.employerName as string) ||
    'Direct Petition';

  const progress = application.progressPercentage !== undefined ? application.progressPercentage : 0;

  // Group checklist items by section
  const groupedChecklist = (application.checklist || []).reduce(
    (acc, item) => {
      const sec = item.section || 'General Evidentiary Requirements';
      if (!acc[sec]) acc[sec] = [];
      acc[sec].push(item);
      return acc;
    },
    {} as Record<string, ChecklistItem[]>
  );

  const specDetails = (application.categorySpecificDetails || {}) as Record<string, unknown>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Status Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/applications"
          className="inline-flex items-center text-xs text-[#627D98] hover:text-[#172B4D] space-x-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Applications</span>
        </Link>
        <div className="flex items-center space-x-2 text-[11px] font-mono text-[#829AB1]">
          <span>Case ID: {application._id}</span>
          <span>•</span>
          <span>Version: v{application.concurrencyVersion || 1}</span>
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

      {/* Case Header Card */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold text-[#172B4D]">
                {application.title}
              </h1>
              <Badge variant="navy">{application.visaCategory}</Badge>
              {getStatusBadge(application.status)}
            </div>
            <p className="text-xs text-[#627D98]">
              Beneficiary: <strong className="text-[#172B4D]">{applicantName}</strong> • Sponsor: <strong className="text-[#172B4D]">{sponsorName}</strong>
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link href={`/dashboard/applications/create?id=${application._id}`}>
              <Button size="sm" variant="outline" className="space-x-1.5 text-xs">
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Questionnaire</span>
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatusModalOpen(true)}
              className="space-x-1.5 text-xs"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Change Status</span>
            </Button>
            <Link href={`/dashboard/documents?id=${application._id}`}>
              <Button size="sm" className="space-x-1.5 text-xs bg-[#172B4D]">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Exhibits</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="pt-2 border-t border-[#F1F5F9] space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#627D98]">
            <span className="font-semibold text-[#172B4D]">Statutory Evidentiary Preparation Progress</span>
            <span>{progress}% complete</span>
          </div>
          <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#2E7D32] h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Status Transition Modal */}
      {statusModalOpen && (
        <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#172B4D]">Transition Preparation Status</h4>
            <button onClick={() => setStatusModalOpen(false)} className="text-xs font-bold text-[#627D98]">×</button>
          </div>
          <form onSubmit={handleUpdateStatus} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#172B4D] block">Target Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ApplicationStatus)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded mt-1 font-medium"
                >
                  <option value="draft">Draft</option>
                  <option value="in_progress">In Progress</option>
                  <option value="evidence_pending">Evidence Pending</option>
                  <option value="under_attorney_review">Under Legal Review</option>
                  <option value="ready_for_final_review">Ready for Final Review</option>
                  <option value="approved_for_submission">Ready for Filing</option>
                  <option value="dossier_prepared">Dossier Prepared</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#172B4D] block">Transition Reason / Milestone Note</label>
                <input
                  type="text"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="e.g. Certified LCA uploaded; moving to attorney review."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setStatusModalOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isUpdatingStatus}>
                {isUpdatingStatus ? 'Updating...' : 'Commit Status Change'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-[#E2E8F0] flex items-center space-x-2 text-xs">
        {[
          { id: 'checklist', label: 'Evidence Checklist' },
          { id: 'profile', label: 'Applicant Profile' },
          { id: 'visa_specifics', label: 'Visa Questionnaire' },
          { id: 'documents', label: `Exhibits (${documents.length})` },
          { id: 'history', label: `Audit Log (${application.statusHistory?.length || 1})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-3.5 py-2.5 font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-[#172B4D] text-[#172B4D]'
                : 'border-transparent text-[#627D98] hover:text-[#172B4D]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Evidence Checklist (Subphase 4.8) */}
      {activeTab === 'checklist' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Statutory Evidentiary Checklist</CardTitle>
                <CardDescription>
                  Tracking mandatory, conditional, and custom exhibits for {application.visaCategory} filing.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCustomItemModalOpen(true)}
                className="space-x-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Exhibit</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            {customItemModalOpen && (
              <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#172B4D]">Add Custom Exhibit Requirement</h4>
                  <button onClick={() => setCustomItemModalOpen(false)} className="text-xs font-bold text-[#627D98]">×</button>
                </div>
                <form onSubmit={handleAddCustomItem} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#172B4D] block">Exhibit Label</label>
                      <input
                        type="text"
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                        placeholder="e.g. Expert Letter from Stanford Dean"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded mt-1"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#172B4D] block">Section Category</label>
                      <input
                        type="text"
                        value={customSection}
                        onChange={(e) => setCustomSection(e.target.value)}
                        placeholder="e.g. Peer Testimonials"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#172B4D] block">Description / Notes</label>
                    <input
                      type="text"
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="Brief guidance for attorney or applicant..."
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded mt-1"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center space-x-2 text-xs">
                      <input
                        type="checkbox"
                        checked={customRequired}
                        onChange={(e) => setCustomRequired(e.target.checked)}
                        className="rounded text-[#172B4D]"
                      />
                      <span>Mark as mandatory exhibit</span>
                    </label>
                    <div className="space-x-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setCustomItemModalOpen(false)}>Cancel</Button>
                      <Button type="submit" size="sm">Save Requirement</Button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {Object.keys(groupedChecklist).length > 0 ? (
              Object.entries(groupedChecklist).map(([sectionName, items]) => (
                <div key={sectionName} className="space-y-3">
                  <h3 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider border-b border-[#F1F5F9] pb-1.5 flex items-center justify-between">
                    <span>{sectionName}</span>
                    <span className="text-[10px] text-[#829AB1] font-normal font-mono">
                      {items.filter((i) => i.isCompleted).length}/{items.length} Completed
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const isToggling = togglingItemId === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => !isToggling && handleToggleChecklist(item.id, item.isCompleted)}
                          className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start space-x-3 ${
                            item.isCompleted
                              ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                              : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
                          }`}
                        >
                          <button
                            type="button"
                            className="mt-0.5 shrink-0 text-[#172B4D] focus:outline-none"
                            disabled={isToggling}
                          >
                            {isToggling ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-[#426B91]" />
                            ) : item.isCompleted ? (
                              <CheckSquare className="w-4 h-4 text-[#2E7D32]" />
                            ) : (
                              <Square className="w-4 h-4 text-[#829AB1]" />
                            )}
                          </button>
                          <div className="space-y-0.5 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-[#172B4D]">
                                {item.label}
                              </span>
                              <div className="flex items-center space-x-1.5">
                                {item.isCustom && <Badge variant="neutral" size="sm">Custom</Badge>}
                                <Badge variant={item.required ? 'navy' : 'neutral'} size="sm">
                                  {item.required ? 'Required' : 'Conditional'}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-[11px] text-[#627D98] leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#829AB1] text-center py-6">
                No checklist items initialized for this application.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: Applicant Profile */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Applicant Biographical &amp; Employment Details</CardTitle>
              <Link href={`/dashboard/applications/create?id=${application._id}`}>
                <Button size="sm" variant="outline" className="text-xs space-x-1">
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit in Wizard</span>
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-2 text-xs">
            {/* Personal Details */}
            <div className="space-y-3">
              <h4 className="font-bold text-[#172B4D] uppercase tracking-wider border-b border-[#F1F5F9] pb-1.5">
                Personal Identification
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[#829AB1] block">Full Legal Name:</span>
                  <span className="font-semibold text-[#172B4D]">{application.applicantDetails?.fullName || applicantName}</span>
                </div>
                <div>
                  <span className="text-[#829AB1] block">Date of Birth:</span>
                  <span className="font-semibold text-[#172B4D]">{application.applicantDetails?.dateOfBirth || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[#829AB1] block">Nationality:</span>
                  <span className="font-semibold text-[#172B4D]">{application.applicantDetails?.nationality || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[#829AB1] block">Email:</span>
                  <span className="font-semibold text-[#172B4D]">{application.applicantDetails?.email || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[#829AB1] block">Phone:</span>
                  <span className="font-semibold text-[#172B4D]">{application.applicantDetails?.phone || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[#829AB1] block">A-Number:</span>
                  <span className="font-semibold text-[#172B4D]">{application.applicantDetails?.alienRegistrationNumber || 'None'}</span>
                </div>
              </div>
            </div>

            {/* Academic Credentials */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-[#172B4D] uppercase tracking-wider border-b border-[#F1F5F9] pb-1.5">
                Academic Credentials
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[#829AB1] block">Highest Degree:</span>
                  <span className="font-semibold text-[#172B4D]">{application.educationDetails?.highestQualification || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[#829AB1] block">Institution:</span>
                  <span className="font-semibold text-[#172B4D]">{application.educationDetails?.institution || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[#829AB1] block">Field of Study:</span>
                  <span className="font-semibold text-[#172B4D]">{application.educationDetails?.fieldOfStudy || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[#829AB1] block">Graduation Year:</span>
                  <span className="font-semibold text-[#172B4D]">{application.educationDetails?.graduationYear || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[#829AB1] block">Foreign Degree Evaluated:</span>
                  <span className="font-semibold text-[#172B4D]">{application.educationDetails?.foreignDegreeEvaluated ? 'Yes (NACES)' : 'No'}</span>
                </div>
              </div>
            </div>

            {/* Employment Details */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-[#172B4D] uppercase tracking-wider border-b border-[#F1F5F9] pb-1.5">
                Employment &amp; Position
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[#829AB1] block">Current Employer:</span>
                  <span className="font-semibold text-[#172B4D]">{application.employmentDetails?.currentEmployer || sponsorName}</span>
                </div>
                <div>
                  <span className="text-[#829AB1] block">Job Title:</span>
                  <span className="font-semibold text-[#172B4D]">{application.employmentDetails?.jobTitle || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[#829AB1] block">Annual Salary:</span>
                  <span className="font-semibold text-[#172B4D]">{application.employmentDetails?.annualSalary ? `$${application.employmentDetails.annualSalary}` : 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[#829AB1] block">Work Location:</span>
                  <span className="font-semibold text-[#172B4D]">{application.employmentDetails?.workLocationCity ? `${application.employmentDetails.workLocationCity}, ${application.employmentDetails.workLocationState || ''}` : 'Not specified'}</span>
                </div>
              </div>
              {application.employmentDetails?.dutiesSummary && (
                <div className="pt-2">
                  <span className="text-[#829AB1] block">Duties Summary:</span>
                  <p className="text-[#486581] mt-1 leading-relaxed bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0]">
                    {application.employmentDetails.dutiesSummary}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: Visa Specifics */}
      {activeTab === 'visa_specifics' && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CardTitle className="text-base">{application.visaCategory} Questionnaire Responses</CardTitle>
              <Badge variant="navy">{application.visaCategory}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2 text-xs">
            {application.visaCategory === 'H-1B' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[#829AB1] block">LCA ETA-9035 Number:</span>
                    <span className="font-semibold text-[#172B4D]">{(specDetails.lcaNumber as string) || 'Pending'}</span>
                  </div>
                  <div>
                    <span className="text-[#829AB1] block">SOC Code:</span>
                    <span className="font-semibold text-[#172B4D]">{(specDetails.socCode as string) || 'Not specified'}</span>
                  </div>
                </div>
                {Boolean(specDetails.specialtyOccupationArgument) && (
                  <div>
                    <span className="text-[#829AB1] block">Specialty Occupation Justification:</span>
                    <p className="text-[#486581] mt-1 leading-relaxed bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0]">
                      {String(specDetails.specialtyOccupationArgument)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {application.visaCategory === 'O-1' && (
              <div className="space-y-3">
                <div>
                  <span className="text-[#829AB1] block">Evidentiary Criteria Claimed:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {Array.isArray(specDetails.criteriaMet) && specDetails.criteriaMet.length > 0 ? (
                      specDetails.criteriaMet.map((c, i) => (
                        <Badge key={i} variant="navy" size="sm">{String(c)}</Badge>
                      ))
                    ) : (
                      <span className="text-[#486581]">None selected</span>
                    )}
                  </div>
                </div>
                {Boolean(specDetails.achievementsSummary) && (
                  <div>
                    <span className="text-[#829AB1] block">Sustained Acclaim Summary:</span>
                    <p className="text-[#486581] mt-1 leading-relaxed bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0]">
                      {String(specDetails.achievementsSummary)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {application.visaCategory === 'EB-2' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[#829AB1] block">Track:</span>
                    <span className="font-semibold text-[#172B4D]">{(specDetails.subCategory as string) || 'Advanced Degree'}</span>
                  </div>
                  <div>
                    <span className="text-[#829AB1] block">PERM ETA-9089 Case Number:</span>
                    <span className="font-semibold text-[#172B4D]">{(specDetails.permCaseNumber as string) || 'Pending'}</span>
                  </div>
                </div>
              </div>
            )}

            {application.visaCategory === 'EB-2-NIW' && (
              <div className="space-y-4">
                <div>
                  <span className="text-[#829AB1] block">Proposed Endeavor:</span>
                  <span className="font-bold text-[#172B4D] text-sm">{(specDetails.proposedEndeavorTitle as string) || 'Not specified'}</span>
                </div>
                {Boolean(specDetails.prong1SubstantialMerit) && (
                  <div>
                    <span className="font-semibold text-[#172B4D] block">Prong 1: Substantial Merit &amp; National Importance</span>
                    <p className="text-[#486581] mt-1 bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0]">
                      {String(specDetails.prong1SubstantialMerit)}
                    </p>
                  </div>
                )}
                {Boolean(specDetails.prong2WellPositioned) && (
                  <div>
                    <span className="font-semibold text-[#172B4D] block">Prong 2: Well-Positioned Track Record</span>
                    <p className="text-[#486581] mt-1 bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0]">
                      {String(specDetails.prong2WellPositioned)}
                    </p>
                  </div>
                )}
                {Boolean(specDetails.prong3NationalImportance) && (
                  <div>
                    <span className="font-semibold text-[#172B4D] block">Prong 3: Balance of U.S. National Interest</span>
                    <p className="text-[#486581] mt-1 bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0]">
                      {String(specDetails.prong3NationalImportance)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: Case Documents */}
      {activeTab === 'documents' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Uploaded Evidentiary Exhibits</CardTitle>
                <CardDescription>Document records associated with Case ID {application._id}.</CardDescription>
              </div>
              <Link href={`/dashboard/documents?id=${application._id}`}>
                <Button size="sm" className="space-x-1 text-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload More Files</span>
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {documents.length > 0 ? (
              documents.map((doc) => (
                <div
                  key={doc._id}
                  className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <FileText className="w-4 h-4 text-[#172B4D] shrink-0" />
                    <div className="truncate">
                      <span className="font-semibold text-[#172B4D] block truncate">{doc.originalFilename}</span>
                      <span className="text-[11px] text-[#627D98]">{(doc.fileSize / 1024).toFixed(0)} KB • Category: {doc.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <Badge variant={doc.reviewStatus === 'verified' ? 'success' : 'warning'} size="sm">
                      {doc.reviewStatus}
                    </Badge>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-1 hover:text-[#172B4D]"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc._id)}
                      className="p-1 hover:text-[#C62828]"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[#829AB1] space-y-2">
                <FileText className="w-8 h-8 text-[#CBD5E1] mx-auto" />
                <p>No documents uploaded for this case yet.</p>
                <Link href={`/dashboard/documents?id=${application._id}`}>
                  <Button size="sm" variant="outline">Upload First Exhibit</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 5: Status Audit Log */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Transition Audit Trail</CardTitle>
            <CardDescription>
              Chronological history of case preparation milestones and authorized status transitions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2 text-xs">
            {application.statusHistory && application.statusHistory.length > 0 ? (
              <div className="border-l-2 border-[#172B4D] pl-4 space-y-4">
                {application.statusHistory.map((item, idx) => (
                  <div key={idx} className="relative space-y-1">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#172B4D]" />
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(item.status)}
                      <span className="text-[11px] text-[#829AB1]">
                        {new Date(item.changedAt).toLocaleString()}
                      </span>
                    </div>
                    {item.reason && (
                      <p className="text-[#486581] font-medium">{item.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#829AB1]">No status transitions recorded.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
