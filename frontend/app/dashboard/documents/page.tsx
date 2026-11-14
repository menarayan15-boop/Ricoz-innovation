'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Upload,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Trash2,
  RefreshCw,
  AlertCircle,
  FileUp,
  Eye,
  History,
  X,
  Check,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileSpreadsheet,
  FileCode,
  Tag,
  Activity,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ApplicationRecord, DocumentRecord, DocumentActivityRecord, DocumentWorkspaceStats } from '@/types';
import { apiClient, ApiError } from '@/services/apiClient';

function DocumentsContent() {
  const searchParams = useSearchParams();
  const urlApplicationId = searchParams.get('id');

  // Application & Document state
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>(urlApplicationId || '');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [stats, setStats] = useState<DocumentWorkspaceStats>({
    totalDocuments: 0,
    pendingReview: 0,
    verifiedDocuments: 0,
    correctionsRequested: 0,
  });

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search, Filter & Pagination state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [versionDoc, setVersionDoc] = useState<DocumentRecord | null>(null);
  const [versionHistory, setVersionHistory] = useState<DocumentRecord[]>([]);
  const [reviewDoc, setReviewDoc] = useState<DocumentRecord | null>(null);
  const [activityDoc, setActivityDoc] = useState<DocumentRecord | null>(null);
  const [activityHistory, setActivityHistory] = useState<DocumentActivityRecord[]>([]);

  // Upload Form State (within modal)
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadCategory, setUploadCategory] = useState<string>('other');
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadChecklistItemId, setUploadChecklistItemId] = useState<string>('');
  const [suggestedCategory, setSuggestedCategory] = useState<{
    suggestedCategory: string;
    confidence: number;
    reason: string;
  } | null>(null);
  const [categoryRegistry, setCategoryRegistry] = useState<
    Array<{ id: string; label: string; description: string; visaCategory: string }>
  >([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Replacement version form state
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [versionNotes, setVersionNotes] = useState<string>('');
  const [isSubmittingVersion, setIsSubmittingVersion] = useState<boolean>(false);

  // Attorney Review state
  const [reviewStatus, setReviewStatus] = useState<string>('verified');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  // Preview zoom state
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch User's Applications & Global Document Stats
  useEffect(() => {
    const loadApplicationsAndStats = async () => {
      setIsLoading(true);
      try {
        const [appRes, statsRes] = await Promise.all([
          apiClient.getApplications({ limit: 50 }),
          apiClient.getDocumentStats(),
        ]);

        if (appRes.success && appRes.applications) {
          setApplications(appRes.applications);
          if (!selectedAppId && appRes.applications.length > 0) {
            setSelectedAppId(appRes.applications[0]._id);
          } else if (urlApplicationId) {
            setSelectedAppId(urlApplicationId);
          }
        }

        if (statsRes.success && statsRes.stats) {
          setStats(statsRes.stats);
        }
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) {
          setErrorMessage('Session expired. Please log in.');
        } else {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load workspace.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadApplicationsAndStats();
  }, [urlApplicationId]);

  // 2. Fetch Documents for Selected Application with Filters & Pagination
  const fetchDocuments = async () => {
    if (!selectedAppId) {
      setDocuments([]);
      return;
    }
    try {
      const res = await apiClient.getApplicationDocuments(selectedAppId, {
        category: categoryFilter,
        status: statusFilter,
        search: searchQuery,
        page: currentPage,
        limit: 10,
      });

      if (res.success && res.documents) {
        setDocuments(res.documents);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.total || 0);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load documents.');
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedAppId, categoryFilter, statusFilter, searchQuery, currentPage]);

  // 3. Fetch Category Registry for Active Application
  const selectedApp = applications.find((a) => a._id === selectedAppId);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await apiClient.getClassificationSuggestions(
          uploadFiles[0]?.name || '',
          selectedApp?.visaCategory
        );
        if (res.success) {
          setCategoryRegistry(res.categories);
          if (res.suggestion) {
            setSuggestedCategory(res.suggestion);
            // Auto-populate category if default 'other'
            if (uploadCategory === 'other' && res.suggestion.suggestedCategory) {
              setUploadCategory(res.suggestion.suggestedCategory);
            }
          }
        }
      } catch (err) {
        // Silently fallback to default categories
      }
    };
    if (selectedApp) {
      loadCategories();
    }
  }, [selectedApp, uploadFiles]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      setUploadFiles((prev) => [...prev, ...filesArray].slice(0, 5));
    }
  };

  // Handle Upload Submission
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadFiles.length === 0) {
      setErrorMessage('Please select at least one document to upload.');
      return;
    }
    if (!selectedAppId) {
      setErrorMessage('Please select an active visa application.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      uploadFiles.forEach((file) => formData.append('files', file));
      formData.append('applicationId', selectedAppId);
      formData.append('category', uploadCategory);
      if (uploadTitle) formData.append('title', uploadTitle);
      if (uploadChecklistItemId) formData.append('checklistItemId', uploadChecklistItemId);

      const res = await apiClient.uploadDocuments(formData, selectedAppId);
      if (res.success && res.documents) {
        setSuccessMessage(`${res.documents.length} evidentiary exhibit(s) uploaded successfully.`);
        setUploadFiles([]);
        setUploadTitle('');
        setUploadChecklistItemId('');
        setShowUploadModal(false);
        // Refresh docs & stats
        fetchDocuments();
        const statsRes = await apiClient.getDocumentStats();
        if (statsRes.success) setStats(statsRes.stats);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to upload documents.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Document Download
  const handleDownload = async (doc: DocumentRecord) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const downloadUrl = apiClient.getDownloadUrl(doc._id);

      const res = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error(`Download failed with status ${res.status}`);
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
      setErrorMessage(err instanceof Error ? err.message : 'Failed to download document.');
    }
  };

  // Handle Document Soft Deletion
  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document from the dossier?')) return;
    try {
      const res = await apiClient.deleteDocument(docId);
      if (res.success) {
        setDocuments((prev) => prev.filter((d) => d._id !== docId));
        setSuccessMessage('Document successfully removed.');
        const statsRes = await apiClient.getDocumentStats();
        if (statsRes.success) setStats(statsRes.stats);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete document.');
    }
  };

  // Handle Version History Modal Opening
  const handleOpenVersions = async (doc: DocumentRecord) => {
    setVersionDoc(doc);
    try {
      const res = await apiClient.getDocumentVersions(doc._id);
      if (res.success && res.versions) {
        setVersionHistory(res.versions);
      }
    } catch (err) {
      setErrorMessage('Failed to load version history.');
    }
  };

  // Handle Replacement Version Upload
  const handleUploadReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionDoc || !replacementFile) return;

    setIsSubmittingVersion(true);
    try {
      const formData = new FormData();
      formData.append('file', replacementFile);
      if (versionNotes) formData.append('versionNotes', versionNotes);

      const res = await apiClient.uploadDocumentVersion(versionDoc._id, formData);
      if (res.success && res.document) {
        setSuccessMessage(`Revision ${res.document.versionNumber} uploaded successfully.`);
        setReplacementFile(null);
        setVersionNotes('');
        // Refresh version list & main document list
        const vRes = await apiClient.getDocumentVersions(versionDoc._id);
        if (vRes.success) setVersionHistory(vRes.versions);
        fetchDocuments();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to upload replacement version.');
    } finally {
      setIsSubmittingVersion(false);
    }
  };

  // Handle Attorney Review Modal Opening
  const handleOpenReview = (doc: DocumentRecord) => {
    setReviewDoc(doc);
    setReviewStatus(doc.reviewStatus === 'verified' ? 'verified' : 'verified');
    setReviewNotes(doc.reviewNotes || '');
  };

  // Submit Attorney Review Decision
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewDoc) return;

    setIsSubmittingReview(true);
    try {
      const res = await apiClient.reviewDocument(reviewDoc._id, reviewStatus, reviewNotes);
      if (res.success && res.document) {
        setSuccessMessage(`Document marked as "${reviewStatus}".`);
        setReviewDoc(null);
        fetchDocuments();
        const statsRes = await apiClient.getDocumentStats();
        if (statsRes.success) setStats(statsRes.stats);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to record review decision.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Handle Document Audit Timeline Opening
  const handleOpenActivity = async (doc: DocumentRecord) => {
    setActivityDoc(doc);
    try {
      const res = await apiClient.getDocumentActivity(doc._id);
      if (res.success && res.activities) {
        setActivityHistory(res.activities);
      }
    } catch (err) {
      setErrorMessage('Failed to load document activity timeline.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#172B4D] text-white flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-[#172B4D]">
              Secure Document Management &amp; Intelligence
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#627D98]">
            Private object storage, binary magic-number validation, revision history, and attorney verification.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            size="md"
            onClick={() => setShowUploadModal(true)}
            disabled={applications.length === 0}
            className="space-x-1.5 shadow-xs"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Exhibits</span>
          </Button>
          <Link href="/dashboard/applications/create">
            <Button variant="outline" size="md" className="space-x-1.5">
              <Plus className="w-4 h-4" />
              <span>New Case</span>
            </Button>
          </Link>
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

      {/* 2. Document Workspace Metrics (Real Data from Atlas) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm" className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#627D98] uppercase tracking-wider">Total Exhibits</p>
              <h3 className="text-2xl font-bold text-[#172B4D] mt-1">{stats.totalDocuments}</h3>
            </div>
            <div className="p-2.5 bg-[#F0F4F8] text-[#172B4D] rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card padding="sm" className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#627D98] uppercase tracking-wider">Pending Review</p>
              <h3 className="text-2xl font-bold text-[#D97706] mt-1">{stats.pendingReview}</h3>
            </div>
            <div className="p-2.5 bg-[#FEF3C7] text-[#D97706] rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card padding="sm" className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#627D98] uppercase tracking-wider">Verified Records</p>
              <h3 className="text-2xl font-bold text-[#16A34A] mt-1">{stats.verifiedDocuments}</h3>
            </div>
            <div className="p-2.5 bg-[#DCFCE7] text-[#16A34A] rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card padding="sm" className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#627D98] uppercase tracking-wider">Corrections Needed</p>
              <h3 className="text-2xl font-bold text-[#DC2626] mt-1">{stats.correctionsRequested}</h3>
            </div>
            <div className="p-2.5 bg-[#FEE2E2] text-[#DC2626] rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Case Selector & Filter Bar */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Active Case Selector */}
          <div className="flex items-center space-x-3 w-full lg:w-auto">
            <span className="text-xs font-bold text-[#172B4D] whitespace-nowrap">Active Petition:</span>
            {applications.length > 0 ? (
              <select
                value={selectedAppId}
                onChange={(e) => {
                  setSelectedAppId(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full lg:w-80 px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[#202938] font-semibold focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
              >
                {applications.map((app) => (
                  <option key={app._id} value={app._id}>
                    {app.title} ({app.visaCategory})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-[#829AB1]">No active cases found</span>
            )}
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#829AB1]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search filename or title..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
            />
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center space-x-2 w-full lg:w-auto">
            <span className="text-xs text-[#627D98] whitespace-nowrap">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
            >
              <option value="ALL">All Statuses</option>
              <option value="pending_review">Pending Review</option>
              <option value="verified">Verified</option>
              <option value="correction_requested">Correction Requested</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-xs font-semibold text-[#627D98] mr-1">Categories:</span>
          <button
            onClick={() => {
              setCategoryFilter('ALL');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              categoryFilter === 'ALL'
                ? 'bg-[#172B4D] text-white'
                : 'bg-[#F0F4F8] text-[#486581] hover:bg-[#E2E8F0]'
            }`}
          >
            All Exhibits
          </button>
          {categoryRegistry.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setCategoryFilter(cat.id);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
                categoryFilter === cat.id
                  ? 'bg-[#172B4D] text-white'
                  : 'bg-[#F0F4F8] text-[#486581] hover:bg-[#E2E8F0]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Document Management Table */}
      <Card padding="none" className="overflow-hidden bg-white shadow-sm">
        <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-xs text-[#627D98]">
          <span className="font-semibold text-[#172B4D]">
            {selectedApp ? `${selectedApp.title} — Evidentiary Dossier` : 'Dossier Exhibits'}
          </span>
          <span>Showing {documents.length} of {totalCount} records</span>
        </div>

        {documents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold text-[#486581] uppercase tracking-wider">
                  <th className="py-3 px-4">Exhibit Name</th>
                  <th className="py-3 px-4">Evidentiary Category</th>
                  <th className="py-3 px-4">Format / Size</th>
                  <th className="py-3 px-4">Uploaded By</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {documents.map((doc) => {
                  const uploaderName =
                    typeof doc.uploadedBy === 'object' && doc.uploadedBy
                      ? doc.uploadedBy.name
                      : 'Applicant';

                  return (
                    <tr key={doc._id} className="hover:bg-[#F8FAFC] transition-colors">
                      {/* Name & Revision */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 bg-[#F0F4F8] text-[#172B4D] rounded shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="truncate max-w-xs">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-semibold text-[#172B4D] truncate block">
                                {doc.title || doc.originalFilename}
                              </span>
                              <span className="px-1.5 py-0.2 bg-[#E2E8F0] text-[#486581] text-[10px] rounded font-bold">
                                v{doc.versionNumber || 1}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#829AB1] block truncate">
                              {doc.originalFilename}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <Badge variant="navy" size="sm">
                          {doc.category}
                        </Badge>
                      </td>

                      {/* Format & Size */}
                      <td className="py-3.5 px-4 text-[#486581]">
                        <span className="uppercase font-mono font-semibold text-[11px]">
                          {doc.mimeType.includes('pdf')
                            ? 'PDF'
                            : doc.mimeType.includes('word')
                            ? 'DOCX'
                            : doc.mimeType.split('/')[1] || 'FILE'}
                        </span>
                        <span className="text-[11px] text-[#829AB1] ml-1.5">
                          ({(doc.fileSize / 1024).toFixed(0)} KB)
                        </span>
                      </td>

                      {/* Uploader & Date */}
                      <td className="py-3.5 px-4">
                        <span className="text-[#172B4D] font-medium block">{uploaderName}</span>
                        <span className="text-[11px] text-[#829AB1]">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Review Status */}
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            doc.reviewStatus === 'verified'
                              ? 'success'
                              : doc.reviewStatus === 'correction_requested'
                              ? 'error'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {doc.reviewStatus.replace('_', ' ')}
                        </Badge>
                        {doc.reviewNotes && (
                          <span className="text-[10px] text-[#DC2626] block mt-0.5 truncate max-w-xs">
                            Note: {doc.reviewNotes}
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="p-1.5 text-[#486581] hover:text-[#172B4D] hover:bg-[#F0F4F8] rounded transition-colors"
                            title="Preview Exhibit"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-1.5 text-[#486581] hover:text-[#172B4D] hover:bg-[#F0F4F8] rounded transition-colors"
                            title="Download Document"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenVersions(doc)}
                            className="p-1.5 text-[#486581] hover:text-[#172B4D] hover:bg-[#F0F4F8] rounded transition-colors"
                            title="Version History & Revisions"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenReview(doc)}
                            className="p-1.5 text-[#0284C7] hover:text-[#0369A1] hover:bg-[#E0F2FE] rounded transition-colors"
                            title="Legal Review Decision"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenActivity(doc)}
                            className="p-1.5 text-[#486581] hover:text-[#172B4D] hover:bg-[#F0F4F8] rounded transition-colors"
                            title="Audit Activity Timeline"
                          >
                            <Activity className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(doc._id)}
                            className="p-1.5 text-[#DC2626] hover:text-[#B91C1C] hover:bg-[#FEE2E2] rounded transition-colors"
                            title="Delete Exhibit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center space-y-3">
            <FileUp className="w-10 h-10 text-[#CBD5E1] mx-auto" />
            <h4 className="text-sm font-semibold text-[#172B4D]">No exhibits found for this filter</h4>
            <p className="text-xs text-[#627D98] max-w-sm mx-auto">
              {applications.length === 0
                ? 'Create a visa petition first to begin managing evidentiary records.'
                : 'Upload supporting documentation (LCAs, transcripts, diplomas, publications) to build your case dossier.'}
            </p>
            {applications.length > 0 && (
              <Button size="sm" onClick={() => setShowUploadModal(true)}>
                Upload First Exhibit
              </Button>
            )}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#627D98]">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* =========================================================================
          5. MODAL: DRAG & DROP MULTI-FILE UPLOAD
          ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4 text-[#172B4D]" />
                <h3 className="text-sm font-bold text-[#172B4D]">Upload Evidentiary Exhibits</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-[#829AB1] hover:text-[#172B4D] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4 text-xs">
              {/* Drag and drop dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-[#172B4D] bg-[#F0F4F8]'
                    : 'border-[#CBD5E1] hover:border-[#94A3B8] bg-[#F8FAFC]'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.docx"
                  onChange={(e) => {
                    if (e.target.files) {
                      setUploadFiles((prev) => [...prev, ...Array.from(e.target.files || [])].slice(0, 5));
                    }
                  }}
                  className="hidden"
                />
                <FileUp className="w-8 h-8 text-[#627D98] mx-auto mb-2" />
                <p className="font-semibold text-[#172B4D]">
                  Drag &amp; drop files here, or <span className="text-[#0284C7] underline">browse</span>
                </p>
                <p className="text-[11px] text-[#829AB1] mt-1">
                  Accepted: PDF, DOCX, PNG, JPG (Max 20MB per file, up to 5 files)
                </p>
              </div>

              {/* Selected Files List */}
              {uploadFiles.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-bold text-[#172B4D]">Selected Files ({uploadFiles.length}):</span>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {uploadFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-[#F0F4F8] rounded text-xs"
                      >
                        <span className="truncate max-w-xs font-medium text-[#172B4D]">
                          {file.name} ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => setUploadFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-[#DC2626] font-bold px-1"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Heuristic Suggestion Pill */}
              {suggestedCategory && (
                <div className="p-2.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded text-xs text-[#1D4ED8] flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Tag className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      <strong>Suggested:</strong> {suggestedCategory.suggestedCategory} ({suggestedCategory.reason})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadCategory(suggestedCategory.suggestedCategory)}
                    className="underline text-[11px] font-bold shrink-0 ml-2"
                  >
                    Apply
                  </button>
                </div>
              )}

              {/* Category Selector */}
              <div className="space-y-1">
                <label className="font-bold text-[#172B4D]">Evidentiary Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded text-[#202938] font-medium focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                >
                  {categoryRegistry.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Title */}
              <div className="space-y-1">
                <label className="font-bold text-[#172B4D]">Exhibit Title / Description</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Master's Degree Diploma & Official Transcript"
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                />
              </div>

              {/* Optional Checklist Item Linkage */}
              {selectedApp && selectedApp.checklist && selectedApp.checklist.length > 0 && (
                <div className="space-y-1">
                  <label className="font-bold text-[#172B4D]">Link to Statutory Checklist Item</label>
                  <select
                    value={uploadChecklistItemId}
                    onChange={(e) => setUploadChecklistItemId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                  >
                    <option value="">-- No Checklist Link (General Exhibit) --</option>
                    {selectedApp.checklist.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.section} — {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || uploadFiles.length === 0}
                  className="space-x-1.5"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Validating &amp; Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Files</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. MODAL: SECURE PREVIEW (PDF, IMAGES, DOCX)
          ========================================================================= */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in">
            {/* Modal Header */}
            <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center space-x-2 truncate">
                <Eye className="w-4 h-4 text-[#172B4D]" />
                <h3 className="text-sm font-bold text-[#172B4D] truncate">
                  Preview: {previewDoc.title || previewDoc.originalFilename}
                </h3>
                <span className="text-xs px-2 py-0.5 bg-[#E2E8F0] rounded font-mono">
                  v{previewDoc.versionNumber}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(previewDoc)}
                  className="space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </Button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="text-[#829AB1] hover:text-[#172B4D] p-1.5 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div className="flex-1 bg-[#F1F5F9] overflow-auto flex items-center justify-center p-4">
              {previewDoc.mimeType.includes('pdf') ? (
                <iframe
                  src={apiClient.getPreviewUrl(previewDoc._id)}
                  className="w-full h-full rounded border border-[#CBD5E1] bg-white"
                  title="PDF Document Preview"
                />
              ) : previewDoc.mimeType.startsWith('image/') ? (
                <div className="text-center overflow-auto max-h-full">
                  <img
                    src={apiClient.getPreviewUrl(previewDoc._id)}
                    alt={previewDoc.originalFilename}
                    style={{ transform: `scale(${zoomLevel / 100})` }}
                    className="max-h-[70vh] object-contain rounded shadow-md transition-transform"
                  />
                  <div className="mt-3 flex items-center justify-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-xs font-mono">{zoomLevel}%</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 bg-white rounded-lg border border-[#CBD5E1] shadow-xs max-w-md">
                  <FileText className="w-12 h-12 text-[#172B4D] mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-[#172B4D]">{previewDoc.originalFilename}</h4>
                  <p className="text-xs text-[#627D98] mt-1">
                    DOCX / Word format documents are safely isolated. Download the file to inspect the complete Word layout.
                  </p>
                  <div className="mt-4 flex justify-center">
                    <Button onClick={() => handleDownload(previewDoc)} className="space-x-1.5">
                      <Download className="w-4 h-4" />
                      <span>Download File</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. MODAL: VERSION HISTORY & REVISIONS
          ========================================================================= */}
      {versionDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in">
            <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-[#172B4D]" />
                <h3 className="text-sm font-bold text-[#172B4D]">
                  Version History: {versionDoc.title}
                </h3>
              </div>
              <button
                onClick={() => setVersionDoc(null)}
                className="text-[#829AB1] hover:text-[#172B4D] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-6 text-xs max-h-[75vh] overflow-y-auto">
              {/* Upload Replacement Version Form */}
              <form onSubmit={handleUploadReplacement} className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg space-y-3">
                <span className="font-bold text-[#172B4D] block">Upload New Revision</span>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#486581]">Select Replacement File</label>
                  <input
                    type="file"
                    accept=".pdf,.docx,.png,.jpg,.jpeg"
                    onChange={(e) => setReplacementFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-[#486581] file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#172B4D] file:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#486581]">Revision Notes / Reason</label>
                  <input
                    type="text"
                    value={versionNotes}
                    onChange={(e) => setVersionNotes(e.target.value)}
                    placeholder="e.g. Attached apostilled copy requested by counsel"
                    className="w-full px-3 py-1.5 bg-white border border-[#CBD5E1] rounded text-[#202938]"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingVersion || !replacementFile}
                  className="space-x-1.5"
                >
                  {isSubmittingVersion ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Revision...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Commit Revision</span>
                    </>
                  )}
                </Button>
              </form>

              {/* Version History Timeline */}
              <div className="space-y-2">
                <span className="font-bold text-[#172B4D] block">Revision Timeline</span>
                <div className="space-y-2">
                  {versionHistory.map((ver) => (
                    <div
                      key={ver._id}
                      className="p-3 bg-white border border-[#E2E8F0] rounded-lg flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-[#172B4D]">Version {ver.versionNumber}</span>
                          {ver.isCurrentVersion && (
                            <Badge variant="success" size="sm">Current Active Version</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-[#627D98]">
                          {ver.originalFilename} • {(ver.fileSize / 1024).toFixed(0)} KB •{' '}
                          {new Date(ver.createdAt).toLocaleString()}
                        </p>
                        {ver.versionNotes && (
                          <p className="text-[11px] text-[#486581] italic">"{ver.versionNotes}"</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(ver)}
                        className="space-x-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          8. MODAL: ATTORNEY REVIEW WORKFLOW
          ========================================================================= */}
      {reviewDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in">
            <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#172B4D]" />
                <h3 className="text-sm font-bold text-[#172B4D]">
                  Legal Verification Decision: {reviewDoc.title}
                </h3>
              </div>
              <button
                onClick={() => setReviewDoc(null)}
                className="text-[#829AB1] hover:text-[#172B4D] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#172B4D]">Verification Decision</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded text-[#202938] font-semibold"
                >
                  <option value="verified">Verified (Statutorily Compliant)</option>
                  <option value="correction_requested">Correction Requested (Deficiency Found)</option>
                  <option value="rejected">Rejected (Non-Compliant / Unacceptable)</option>
                  <option value="pending_review">Pending Review</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#172B4D]">Review Notes / Deficiency Details</label>
                <textarea
                  rows={4}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Detail instructions for the applicant or evidentiary verification notes..."
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded text-[#202938]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReviewDoc(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="space-x-1.5"
                >
                  {isSubmittingReview ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Decision...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Record Decision</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          9. MODAL: DOCUMENT ACTIVITY TIMELINE AUDIT
          ========================================================================= */}
      {activityDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in">
            <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-[#172B4D]" />
                <h3 className="text-sm font-bold text-[#172B4D]">
                  Audit Trail: {activityDoc.title}
                </h3>
              </div>
              <button
                onClick={() => setActivityDoc(null)}
                className="text-[#829AB1] hover:text-[#172B4D] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3 text-xs">
              {activityHistory.length > 0 ? (
                activityHistory.map((act) => {
                  const actorName =
                    typeof act.actorId === 'object' && act.actorId ? act.actorId.name : 'System';

                  return (
                    <div
                      key={act._id}
                      className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#172B4D] capitalize">
                          {act.eventType.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-[#829AB1]">
                          {new Date(act.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#627D98]">
                        By <strong>{actorName}</strong> ({act.actorRole})
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-center py-6 text-xs text-[#829AB1]">No audit events logged yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs text-[#627D98]">Loading document workspace...</div>}>
      <DocumentsContent />
    </Suspense>
  );
}
