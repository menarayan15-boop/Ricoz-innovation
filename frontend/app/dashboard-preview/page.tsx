'use client';

import React, { useState } from 'react';
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
  ShieldAlert,
  Info,
  Sparkles,
  Lock,
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
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VisaCategory } from '@/types';

interface ApplicationRecord {
  id: string;
  applicantName: string;
  applicantRole: string;
  visaCategory: VisaCategory;
  lastUpdated: string;
  completionPercentage: number;
  status:
    | 'draft'
    | 'documents_pending'
    | 'ai_analyzed'
    | 'under_attorney_review'
    | 'changes_requested'
    | 'ready_for_filing';
  assignedAttorney: string;
  missingDocsCount: number;
}

export default function DashboardPreviewPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sample data clearly labeled for public evaluation
  const applications: ApplicationRecord[] = [
    {
      id: 'APP-2026-0142',
      applicantName: 'Dr. Siddharth Rao',
      applicantRole: 'Principal Machine Learning Scientist',
      visaCategory: 'EB-2-NIW',
      lastUpdated: 'Nov 13, 2026',
      completionPercentage: 85,
      status: 'under_attorney_review',
      assignedAttorney: 'Sarah Jenkins, Esq.',
      missingDocsCount: 1,
    },
    {
      id: 'APP-2026-0118',
      applicantName: 'Elena Rostova',
      applicantRole: 'Senior Distributed Systems Architect',
      visaCategory: 'O-1',
      lastUpdated: 'Nov 12, 2026',
      completionPercentage: 92,
      status: 'ready_for_filing',
      assignedAttorney: 'David Vance, Esq.',
      missingDocsCount: 0,
    },
    {
      id: 'APP-2026-0094',
      applicantName: 'Carlos Mendoza',
      applicantRole: 'Quantitative Financial Engineer',
      visaCategory: 'H-1B',
      lastUpdated: 'Nov 10, 2026',
      completionPercentage: 60,
      status: 'documents_pending',
      assignedAttorney: 'Sarah Jenkins, Esq.',
      missingDocsCount: 3,
    },
    {
      id: 'APP-2026-0081',
      applicantName: 'Mei-Ling Zhou',
      applicantRole: 'Bioinformatics Research Fellow',
      visaCategory: 'EB-2',
      lastUpdated: 'Nov 08, 2026',
      completionPercentage: 75,
      status: 'ai_analyzed',
      assignedAttorney: 'Rebecca Cole, Esq.',
      missingDocsCount: 2,
    },
  ];

  const filteredApps = applications.filter((app) => {
    const matchesCat =
      selectedCategory === 'ALL' || app.visaCategory === selectedCategory;
    const matchesSearch =
      app.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.applicantRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getStatusBadge = (status: ApplicationRecord['status']) => {
    switch (status) {
      case 'ready_for_filing':
        return <Badge variant="success">Ready for Filing</Badge>;
      case 'under_attorney_review':
        return <Badge variant="warning">Under Attorney Review</Badge>;
      case 'ai_analyzed':
        return <Badge variant="info">AI Analyzed</Badge>;
      case 'documents_pending':
        return <Badge variant="error">Documents Pending</Badge>;
      case 'changes_requested':
        return <Badge variant="error">Changes Requested</Badge>;
      default:
        return <Badge variant="neutral">Draft</Badge>;
    }
  };

  return (
    <DashboardLayout
      title="Public Dashboard Preview"
      subtitle="Interactive demonstration of the Immigration & Work Visa Dossier Builder workspace"
      breadcrumbs={[{ label: 'Preview Mode' }]}
    >
      <div className="space-y-6">
        {/* Transparent Public Preview Notice Banner */}
        <div className="bg-[#EBF8FF] border border-[#BEE3F8] rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-[#3182CE] text-white rounded-md shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#2B6CB0] flex items-center gap-2">
                <span>Public Demonstration Environment</span>
                <span className="text-[10px] font-semibold bg-[#2B6CB0] text-white px-2 py-0.5 rounded-full uppercase">
                  Sample Data
                </span>
              </h2>
              <p className="text-xs text-[#2C5282] mt-0.5">
                No sign-in required. You are viewing simulated petitioner records and evidentiary cross-checks for H-1B, O-1, and EB-2 NIW filings.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto">
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto bg-white border-[#BEE3F8] text-[#2B6CB0] hover:bg-[#F7FAFC]">
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard/applications/create" className="w-full sm:w-auto">
              <Button variant="primary" size="sm" className="w-full sm:w-auto space-x-1.5">
                <span>Start Visa Dossier</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="sm" className="border-l-4 border-l-[#172B4D]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#627D98]">Active Sample Petitions</p>
                <p className="text-2xl font-bold text-[#172B4D] mt-1">4</p>
                <p className="text-[11px] text-[#829AB1] mt-0.5">H-1B, O-1, EB-2, NIW</p>
              </div>
              <div className="p-2.5 rounded bg-[#F0F4F8] text-[#172B4D]">
                <FolderKanban className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card padding="sm" className="border-l-4 border-l-[#2E7D32]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#627D98]">Evidence Exhibits Analyzed</p>
                <p className="text-2xl font-bold text-[#2E7D32] mt-1">56</p>
                <p className="text-[11px] text-[#2E7D32] mt-0.5">OCR parsed & mapped</p>
              </div>
              <div className="p-2.5 rounded bg-[#E8F5E9] text-[#2E7D32]">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card padding="sm" className="border-l-4 border-l-[#B78103]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#627D98]">In Legal Review</p>
                <p className="text-2xl font-bold text-[#B78103] mt-1">2</p>
                <p className="text-[11px] text-[#B78103] mt-0.5">Assigned to legal counsel</p>
              </div>
              <div className="p-2.5 rounded bg-[#FFF8E1] text-[#B78103]">
                <Scale className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card padding="sm" className="border-l-4 border-l-[#426B91]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#627D98]">Validation Pass Rate</p>
                <p className="text-2xl font-bold text-[#426B91] mt-1">94.8%</p>
                <p className="text-[11px] text-[#627D98] mt-0.5">Consistency score</p>
              </div>
              <div className="p-2.5 rounded bg-[#F0F4F8] text-[#426B91]">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Active Petitions Table */}
        <Card padding="none" className="overflow-hidden">
          <div className="p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Sample Visa Dossiers</CardTitle>
              <CardDescription>
                Illustrative petitions structured according to USCIS form requirements and exhibit guidelines.
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Link href="/dashboard/applications/create">
                <Button size="sm" className="space-x-1.5 shadow-xs">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start New Dossier</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Filtering & Search Controls */}
          <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
              {['ALL', 'H-1B', 'O-1', 'EB-2', 'EB-2-NIW'].map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 text-xs rounded font-medium transition-colors cursor-pointer ${
                    selectedCategory === category
                      ? 'bg-[#172B4D] text-white shadow-xs'
                      : 'bg-white text-[#486581] border border-[#CBD5E1] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {category === 'ALL' ? 'All Petitions' : category}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#829AB1] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter sample petitions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] placeholder-[#9FB3C8] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
              />
            </div>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dossier ID & Candidate</TableHead>
                <TableHead>Visa Classification</TableHead>
                <TableHead>Workflow Status</TableHead>
                <TableHead>Dossier Readiness</TableHead>
                <TableHead>Assigned Counsel</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApps.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <div>
                      <span className="font-semibold text-xs text-[#172B4D] block font-mono">
                        {app.id}
                      </span>
                      <span className="text-xs text-[#202938] font-medium block">
                        {app.applicantName}
                      </span>
                      <span className="text-[11px] text-[#627D98] block">
                        {app.applicantRole}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#F0F4F8] text-[#172B4D] border border-[#D9E2EC]">
                      {app.visaCategory}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
                  <TableCell>
                    <div className="w-36 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#627D98]">Readiness</span>
                        <span className="font-semibold text-[#172B4D]">
                          {app.completionPercentage}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            app.completionPercentage >= 90
                              ? 'bg-[#2E7D32]'
                              : app.completionPercentage >= 70
                              ? 'bg-[#426B91]'
                              : 'bg-[#B78103]'
                          }`}
                          style={{ width: `${app.completionPercentage}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-[#486581] font-medium">
                      {app.assignedAttorney}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/applications`}>
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2.5">
                        Inspect
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="w-8 h-8 rounded bg-[#F0F4F8] flex items-center justify-center text-[#172B4D] mb-1">
                <FileText className="w-4 h-4" />
              </div>
              <CardTitle>Automated Exhibit Pagination</CardTitle>
              <CardDescription>
                USCIS-compliant table of contents, exhibit tabs (Exhibit A, B, C), and bates numbering.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#627D98]">
                Every document is standardized, indexed, and cross-referenced with petition forms (I-129, I-140, ETA-9089).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-8 h-8 rounded bg-[#F0F4F8] flex items-center justify-center text-[#426B91] mb-1">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <CardTitle>Cross-Document Verification</CardTitle>
              <CardDescription>
                Heuristic and AI validation across resumes, diplomas, and support letters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#627D98]">
                Catches date mismatches, wage anomalies, and missing job descriptions before attorney submission.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-8 h-8 rounded bg-[#F0F4F8] flex items-center justify-center text-[#2E7D32] mb-1">
                <Scale className="w-4 h-4" />
              </div>
              <CardTitle>Attorney Sign-Off Gateway</CardTitle>
              <CardDescription>
                Collaborative annotation tools and final approval workflow for legal counsel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#627D98]">
                Attorneys can mark exhibits as approved, request targeted revisions, and export compiled PDF bundles.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

