'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  ArrowRight,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Briefcase,
  RefreshCw,
  AlertCircle,
  X,
  ChevronLeft,
  ArrowUpDown,
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
import { VisaCategory, ApplicationRecord, ApplicationStatus } from '@/types';
import { apiClient, ApiError } from '@/services/apiClient';

export default function ApplicationsPage() {
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchApplications = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.getApplications({
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
        page,
        limit,
        sortBy: 'updatedAt',
        sortOrder,
      });
      if (res.success) {
        setApplications(res.applications || []);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.total || res.count || 0);
      }
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        setErrorMessage('Session expired or authentication required. Please sign in.');
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : 'Failed to fetch application records from server.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce search query to avoid spamming the backend
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchApplications();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [categoryFilter, statusFilter, searchQuery, page, sortOrder]);

  const handleClearFilters = () => {
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setSearchQuery('');
    setPage(1);
  };

  const getStatusBadge = (status: ApplicationStatus) => {
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <FolderKanban className="w-5 h-5 text-[#172B4D]" />
            <h1 className="text-xl font-bold text-[#172B4D]">
              Visa Petitions &amp; Applications
            </h1>
            <Badge variant="navy" size="sm">
              {totalCount} Total
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[#627D98]">
            Manage employment-based visa filings, monitor document requirements, and track review status.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="md"
            onClick={fetchApplications}
            disabled={isLoading}
            className="space-x-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </Button>
          <Link href="/dashboard/applications/create">
            <Button size="md" className="space-x-1.5 shadow-xs">
              <Plus className="w-4 h-4" />
              <span>New Visa Application</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-4 bg-[#FFF5F5] border border-[#FFCDD2] rounded-lg text-xs text-[#C62828] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Link href="/login" className="font-semibold underline hover:text-[#B71C1C]">
            Sign In Again →
          </Link>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'H-1B', 'O-1', 'EB-2', 'EB-2-NIW'].map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCategoryFilter(cat);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs rounded font-medium transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-[#172B4D] text-white shadow-xs'
                    : 'bg-[#F0F4F8] text-[#486581] hover:bg-[#D9E2EC]'
                }`}
              >
                {cat === 'ALL' ? 'All Categories' : cat}
              </button>
            ))}
          </div>

          {/* Right Controls: Status Filter, Sort & Search Box */}
          <div className="flex items-center space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
            >
              <option value="ALL">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="evidence_pending">Evidence Pending</option>
              <option value="under_attorney_review">Under Legal Review</option>
              <option value="ready_for_final_review">Ready for Review</option>
              <option value="approved_for_submission">Ready for Filing</option>
              <option value="archived">Archived</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="p-1.5 border border-[#CBD5E1] rounded bg-[#F8FAFC] text-[#486581] hover:bg-[#F0F4F8]"
              title={`Sort by update date (${sortOrder === 'desc' ? 'Newest first' : 'Oldest first'})`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>

            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-[#829AB1] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search candidate, title, ID..."
                className="pl-9 pr-7 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[#202938] placeholder-[#9FB3C8] focus:outline-none focus:ring-1 focus:ring-[#172B4D] w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-[#829AB1] hover:text-[#172B4D]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {(categoryFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs h-7 px-2 text-[#627D98]"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Petition ID &amp; Applicant</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Sponsoring Entity</TableHead>
              <TableHead>Dossier Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned Counsel</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-xs text-[#829AB1]">
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#172B4D]" />
                    <span>Loading cases from MongoDB Atlas...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : applications.length > 0 ? (
              applications.map((app) => {
                const applicantName =
                  app.applicantDetails?.fullName ||
                  (typeof app.applicantId === 'object' && app.applicantId !== null
                    ? app.applicantId.name
                    : (app.formData?.applicantName as string) || 'Applicant');

                const sponsorName =
                  app.employmentDetails?.currentEmployer ||
                  (app.formData?.employerName as string) ||
                  (app.formData?.isSelfPetition ? 'Self-Petition' : 'Direct Petition');

                const attorneyName =
                  typeof app.assignedAttorneyId === 'object' && app.assignedAttorneyId !== null
                    ? app.assignedAttorneyId.name
                    : 'Unassigned';

                const progress = app.progressPercentage !== undefined ? app.progressPercentage : 20;

                return (
                  <TableRow key={app._id}>
                    <TableCell>
                      <div>
                        <span className="font-semibold text-xs text-[#172B4D] block">
                          {applicantName}
                        </span>
                        <span className="text-[11px] text-[#627D98] block truncate max-w-xs">
                          {app.title}
                        </span>
                        <span className="text-[10px] text-[#829AB1] font-mono">
                          ID: {app._id.slice(-8).toUpperCase()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="navy" size="sm">{app.visaCategory}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-[#334E68] font-medium block truncate max-w-[140px]">
                        {sponsorName}
                      </span>
                      <span className="text-[10px] text-[#829AB1]">
                        {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="w-28 space-y-1">
                        <div className="flex justify-between text-[10px] text-[#627D98]">
                          <span>{progress}%</span>
                          <span>{app.checklist?.length || 0} items</span>
                        </div>
                        <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#2E7D32] h-full rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(app.status)}</TableCell>
                    <TableCell>
                      <span className="text-xs text-[#486581] block">
                        {attorneyName}
                      </span>
                      <span className="text-[10px] text-[#829AB1]">
                        {app.updatedAt ? new Date(app.updatedAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Link href={`/dashboard/documents?id=${app._id}`}>
                          <Button variant="outline" size="sm" className="text-xs px-2 py-1 h-7">
                            Files
                          </Button>
                        </Link>
                        <Link href={`/dashboard/applications/${app._id}`}>
                          <Button variant="primary" size="sm" className="text-xs px-2.5 py-1 h-7">
                            Dossier
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-xs text-[#829AB1]">
                  <div className="max-w-sm mx-auto space-y-3">
                    <FolderKanban className="w-8 h-8 text-[#9FB3C8] mx-auto" />
                    <div>
                      <p className="font-semibold text-xs text-[#172B4D]">
                        No visa applications found
                      </p>
                      <p className="text-[11px] text-[#627D98] mt-1">
                        {searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
                          ? 'No petitions match your active search filters.'
                          : 'Get started by creating your first visa petition dossier in MongoDB.'}
                      </p>
                    </div>
                    <Link href="/dashboard/applications/create">
                      <Button size="sm" className="space-x-1 mt-1">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Visa Petition</span>
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#627D98]">
            <span>
              Page {page} of {totalPages} ({totalCount} cases)
            </span>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="h-7 px-2"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                <span>Prev</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="h-7 px-2"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
