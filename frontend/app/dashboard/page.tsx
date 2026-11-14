'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  FileCheck,
  Clock,
  AlertTriangle,
  FileText,
  Briefcase,
  Plus,
  ArrowRight,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ChevronRight,
  Scale,
  RefreshCw,
  AlertCircle,
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
import { VisaCategory, ApplicationRecord, DashboardStats } from '@/types';
import { apiClient, ApiError } from '@/services/apiClient';

export default function DashboardOverviewPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalCases: 0,
    activePetitions: 0,
    exhibitsUploaded: 0,
    attorneyReview: 0,
    missingEvidence: 0,
    finalDossiers: 0,
  });
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.getDashboardSummary();
      if (res.success) {
        setStats(res.stats);
        setApplications(res.recentApplications || []);
      }
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        setErrorMessage('Session expired or authentication required. Please log in.');
      } else {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Unable to connect to live database service.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const calculateProgress = (app: ApplicationRecord): number => {
    if (!app.checklist || app.checklist.length === 0) {
      if (app.status === 'draft') return 15;
      if (app.status === 'documents_pending') return 40;
      if (app.status === 'ai_analyzed') return 65;
      if (app.status === 'under_attorney_review') return 85;
      if (app.status === 'approved_for_submission') return 100;
      return 25;
    }
    const completed = app.checklist.filter((item) => item.isCompleted).length;
    return Math.round((completed / app.checklist.length) * 100);
  };

  const filteredApplications = applications.filter((app) => {
    const matchesCategory =
      selectedCategory === 'ALL' || app.visaCategory === selectedCategory;
    const applicantName =
      app.applicantDetails?.fullName ||
      (typeof app.applicantId === 'object' && app.applicantId !== null
        ? app.applicantId.name
        : (app.formData?.applicantName as string) || 'Applicant');
    const matchesSearch =
      applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app._id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getStatusBadge = (status: ApplicationRecord['status']) => {
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
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-[#172B4D]">
              Immigration Dossier Workspace
            </h1>
            <Badge variant="navy" size="sm">
              Live Database Connected
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[#627D98]">
            Prepare, analyze, validate, and assemble USCIS-compliant evidence dossiers for employment-based petitions.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="md"
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="space-x-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </Button>
          <Link href="/dashboard/applications/create">
            <Button size="md" className="space-x-1.5 shadow-xs">
              <Plus className="w-4 h-4" />
              <span>Create Visa Petition</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Error / Auth Notice */}
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

      {/* Core Statistics Cards (MongoDB backed) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#627D98] font-medium">Total Cases</span>
            <FolderKanban className="w-4 h-4 text-[#426B91]" />
          </div>
          <p className="text-2xl font-bold text-[#172B4D] mt-2">
            {isLoading ? '...' : stats.totalCases}
          </p>
          <span className="text-[10px] text-[#627D98] block mt-1">
            {stats.totalCases === 1 ? '1 case recorded' : `${stats.totalCases} cases recorded`}
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#627D98] font-medium">Active Petitions</span>
            <Clock className="w-4 h-4 text-[#B78103]" />
          </div>
          <p className="text-2xl font-bold text-[#172B4D] mt-2">
            {isLoading ? '...' : stats.activePetitions}
          </p>
          <span className="text-[10px] text-[#2E7D32] block mt-1">In progress</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#627D98] font-medium">Exhibits Uploaded</span>
            <FileText className="w-4 h-4 text-[#172B4D]" />
          </div>
          <p className="text-2xl font-bold text-[#172B4D] mt-2">
            {isLoading ? '...' : stats.exhibitsUploaded}
          </p>
          <span className="text-[10px] text-[#627D98] block mt-1">PDF & Scans verified</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#627D98] font-medium">Attorney Review</span>
            <Scale className="w-4 h-4 text-[#426B91]" />
          </div>
          <p className="text-2xl font-bold text-[#172B4D] mt-2">
            {isLoading ? '...' : stats.attorneyReview}
          </p>
          <span className="text-[10px] text-[#B78103] block mt-1">Awaiting sign-off</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#627D98] font-medium">Missing Evidence</span>
            <AlertTriangle className="w-4 h-4 text-[#C62828]" />
          </div>
          <p className="text-2xl font-bold text-[#C62828] mt-2">
            {isLoading ? '...' : stats.missingEvidence}
          </p>
          <span className="text-[10px] text-[#C62828] block mt-1">Action required</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#627D98] font-medium">Final Dossiers</span>
            <FileCheck className="w-4 h-4 text-[#2E7D32]" />
          </div>
          <p className="text-2xl font-bold text-[#2E7D32] mt-2">
            {isLoading ? '...' : stats.finalDossiers}
          </p>
          <span className="text-[10px] text-[#2E7D32] block mt-1">Ready for filing</span>
        </div>
      </div>

      {/* Main Grid: Applications Table (2/3) + Action/Alerts Sidebar (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Applications Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm">
            {/* Header & Filter Controls */}
            <div className="p-4 sm:p-5 border-b border-[#F1F5F9] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#172B4D]">
                    Active Visa Applications
                  </h2>
                  <p className="text-xs text-[#627D98]">
                    Real-time status tracking across statutory preparation stages.
                  </p>
                </div>
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#829AB1] absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter applicant or ID..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[#202938] placeholder-[#9FB3C8] focus:outline-none focus:ring-1 focus:ring-[#172B4D] w-full sm:w-48"
                  />
                </div>
              </div>

              {/* Visa Category Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pt-1">
                {['ALL', 'H-1B', 'O-1', 'EB-2', 'EB-2-NIW'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 text-xs rounded font-medium transition-colors whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-[#172B4D] text-white shadow-xs'
                        : 'bg-[#F0F4F8] text-[#486581] hover:bg-[#D9E2EC]'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Petitions' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant & ID</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Counsel</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-[#829AB1]">
                      <div className="flex items-center justify-center space-x-2 text-xs">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#172B4D]" />
                        <span>Loading live applications from MongoDB Atlas...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredApplications.length > 0 ? (
                  filteredApplications.map((app) => {
                    const applicantName =
                      app.applicantDetails?.fullName ||
                      (typeof app.applicantId === 'object' && app.applicantId !== null
                        ? app.applicantId.name
                        : (app.formData?.applicantName as string) || 'Applicant');
                    const applicantRole =
                      app.employmentDetails?.jobTitle ||
                      (app.formData?.jobTitle as string) ||
                      (app.formData?.fieldOfExpertise as string) ||
                      'Petition Beneficiary';
                    const attorneyName =
                      typeof app.assignedAttorneyId === 'object' && app.assignedAttorneyId !== null
                        ? app.assignedAttorneyId.name
                        : 'Unassigned';
                    const progress = app.progressPercentage !== undefined ? app.progressPercentage : calculateProgress(app);

                    return (
                      <TableRow key={app._id}>
                        <TableCell>
                          <div>
                            <span className="font-semibold text-xs text-[#172B4D] block">
                              {applicantName}
                            </span>
                            <span className="text-[11px] text-[#627D98] block">
                              {applicantRole}
                            </span>
                            <span className="text-[10px] text-[#829AB1] font-mono">
                              ID: {app._id.slice(-8).toUpperCase()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="navy" size="sm">
                            {app.visaCategory}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="w-24 space-y-1">
                            <div className="flex justify-between text-[10px] text-[#627D98]">
                              <span>{progress}%</span>
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
                          <Link href={`/dashboard/applications/${app._id}`}>
                            <Button variant="ghost" size="sm" className="text-xs px-2">
                              <span>Open</span>
                              <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-[#829AB1]">
                      <div className="max-w-sm mx-auto space-y-3">
                        <FolderKanban className="w-8 h-8 text-[#9FB3C8] mx-auto" />
                        <div>
                          <p className="text-xs font-semibold text-[#172B4D]">
                            No visa petitions found
                          </p>
                          <p className="text-[11px] text-[#627D98] mt-1">
                            {searchQuery || selectedCategory !== 'ALL'
                              ? 'No records match your search or filter.'
                              : 'You have not initialized any visa cases in MongoDB yet.'}
                          </p>
                        </div>
                        <Link href="/dashboard/applications/create">
                          <Button size="sm" className="space-x-1 mt-2">
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create Your First Petition</span>
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Right Column: Missing Evidence & Upcoming Action Items */}
        <div className="space-y-6">
          {/* Missing Evidence Alerts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Required Document Alerts</CardTitle>
                <Badge variant={stats.missingEvidence > 0 ? "error" : "success"} size="sm">
                  {stats.missingEvidence > 0 ? `${stats.missingEvidence} Action Needed` : 'All Set'}
                </Badge>
              </div>
              <CardDescription>
                Exhibits required by USCIS rules before compiling the final petition.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {applications.some((a) => a.missingEvidenceRequests && a.missingEvidenceRequests.length > 0) ? (
                applications.flatMap((a) =>
                  (a.missingEvidenceRequests || []).map((req, idx) => (
                    <div
                      key={`${a._id}-${idx}`}
                      className="p-3 bg-[#FFF5F5] rounded border border-[#FFCDD2] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-medium text-[#C62828]">
                        <span>{req.documentName}</span>
                        <span className="text-[10px] uppercase font-mono">{a.visaCategory}</span>
                      </div>
                      <p className="text-[11px] text-[#4A5568]">
                        {req.reason}
                      </p>
                      <Link
                        href={`/dashboard/documents?id=${a._id}`}
                        className="inline-flex items-center text-[11px] text-[#C62828] font-semibold hover:underline pt-1"
                      >
                        Upload Requested Evidence →
                      </Link>
                    </div>
                  ))
                )
              ) : (
                <div className="p-3 bg-[#F8FAFC] rounded border border-[#E2E8F0] text-xs text-[#627D98] space-y-1">
                  <div className="flex items-center space-x-1.5 font-medium text-[#2E7D32]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                    <span>Evidentiary Files in Good Order</span>
                  </div>
                  <p className="text-[11px] text-[#829AB1]">
                    No urgent missing evidence notices recorded from legal counsel.
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-[#F1F5F9]">
                <Link
                  href="/dashboard/documents"
                  className="flex items-center justify-between text-xs text-[#172B4D] font-semibold hover:text-[#426B91]"
                >
                  <span>Open Exhibit Document Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Activity Audit Stream */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">USCIS Statutory Guidelines</CardTitle>
              <CardDescription>
                Key evidentiary thresholds across supported employment-based categories.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="border-l-2 border-[#172B4D] pl-3 py-1 text-xs space-y-0.5">
                <p className="font-medium text-[#172B4D]">
                  H-1B Specialty Occupation
                </p>
                <p className="text-[11px] text-[#627D98]">
                  Certified ETA-9035 LCA required prior to Form I-129 filing.
                </p>
              </div>

              <div className="border-l-2 border-[#426B91] pl-3 py-1 text-xs space-y-0.5">
                <p className="font-medium text-[#172B4D]">
                  O-1 Extraordinary Ability
                </p>
                <p className="text-[11px] text-[#627D98]">
                  Requires meeting at least 3 of 8 evidentiary criteria or major award.
                </p>
              </div>

              <div className="border-l-2 border-[#B78103] pl-3 py-1 text-xs space-y-0.5">
                <p className="font-medium text-[#172B4D]">
                  EB-2 NIW (Matter of Dhanasar)
                </p>
                <p className="text-[11px] text-[#627D98]">
                  Prong 1: Substantial merit and national importance of proposed endeavor.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
