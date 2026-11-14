'use client';

import React from 'react';
import Link from 'next/link';
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
  FileCode,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function DossierBuilderPage() {
  const visaPackets = [
    {
      code: 'H-1B',
      title: 'H-1B Specialty Occupation',
      tagline: 'Specialty Occupation Petition Packet',
      format: 'USCIS Standard 2-Hole Top Punch PDF with Bates Numbers',
      color: '#172B4D',
      badge: 'Form I-129',
      features: [
        'Form I-129 Supplement H & LCA ETA-9035 Mapping',
        'Academic Credential Evaluation & Transcripts Index',
        'Detailed Specialty Occupation Job Duties Exhibit',
        'Automated Bates Stamping (e.g. H1B-EX-0001)',
      ],
    },
    {
      code: 'O-1',
      title: 'O-1 Extraordinary Ability',
      tagline: 'Extraordinary Acclaim Multi-Volume Binder',
      format: 'Multi-Volume Exhibit Index with Tabbed Dividers',
      color: '#426B91',
      badge: 'High Evidentiary Volume',
      features: [
        'Peer Consultation & Advisory Opinion Exhibit Tab A',
        'Scholarly Citation & Media Impact Metrics Binder',
        'Critical Employment & Commercial Success Proofs',
        'Color-Coded Digital Divider Tabs with Bookmarks',
      ],
    },
    {
      code: 'EB-2 NIW',
      title: 'EB-2 NIW Petition',
      tagline: 'Matter of Dhanasar 3-Prong Legal Dossier',
      format: 'Comprehensive Attorney-Ready Case File',
      color: '#2E7D32',
      badge: 'Self-Petition Framework',
      features: [
        'Matter of Dhanasar 3-Prong Substantial Merit Index',
        'Independent Expert Letters of Recommendation (Tabs 1-8)',
        'Proposed Endeavor Plan & National Impact Dossier',
        'Interactive Table of Contents with Hyperlinked Exhibits',
      ],
    },
  ];

  const recentPackets = [
    {
      id: 'DOS-2026-089',
      candidate: 'Dr. Siddharth Rao',
      category: 'EB-2 NIW',
      exhibitsCount: 14,
      pages: 184,
      batesRange: 'SR-NIW-0001 to SR-NIW-0184',
      status: 'compiled',
      compiledAt: 'Today at 2:15 PM',
    },
    {
      id: 'DOS-2026-074',
      candidate: 'Elena Rostova',
      category: 'O-1A',
      exhibitsCount: 22,
      pages: 312,
      batesRange: 'ER-O1-0001 to ER-O1-0312',
      status: 'ready',
      compiledAt: 'Yesterday at 5:40 PM',
    },
    {
      id: 'DOS-2026-061',
      candidate: 'Carlos Mendoza',
      category: 'H-1B',
      exhibitsCount: 8,
      pages: 96,
      batesRange: 'CM-H1B-0001 to CM-H1B-0096',
      status: 'pending_exhibit',
      compiledAt: 'Nov 10, 2026',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Overview */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Briefcase className="w-6 h-6 text-[#172B4D]" />
              <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] tracking-tight">
                Automated Dossier Generator
              </h1>
              <Badge variant="navy" size="sm">
                Bates Stamping Engine
              </Badge>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-[#486581]">
              Assemble, organize, and generate professional immigration petition dossiers.
            </p>
          </div>
          <Link href="/dashboard/applications/create" className="shrink-0">
            <Button size="md" className="space-x-1.5 shadow-xs w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              <span>Configure New Packet</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Section Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-base font-bold text-[#172B4D]">
            Dossier Packet Assembly
          </h2>
          <p className="text-xs text-[#627D98]">
            Select petition classification templates configured with USCIS exhibit packaging rules.
          </p>
        </div>
      </div>

      {/* Visa Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {visaPackets.map((pkt) => (
          <Card
            key={pkt.code}
            className="flex flex-col justify-between border-t-4 hover:shadow-md transition-shadow"
            style={{ borderTopColor: pkt.color }}
          >
            <div>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="navy" size="sm">
                    {pkt.badge}
                  </Badge>
                  <span className="text-[11px] font-mono text-[#829AB1]">
                    {pkt.code}
                  </span>
                </div>
                <CardTitle>{pkt.title}</CardTitle>
                <CardDescription>{pkt.tagline}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-[#F8FAFC] rounded border border-[#E2E8F0] text-xs space-y-1">
                  <span className="text-[11px] font-semibold text-[#627D98] block">
                    Filing Specification:
                  </span>
                  <span className="font-medium text-[#172B4D]">
                    {pkt.format}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-[#627D98] uppercase tracking-wider block">
                    Automated Assembly Rules:
                  </span>
                  <ul className="space-y-1.5 text-xs text-[#202938]">
                    {pkt.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32] shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </div>

            <div className="p-6 pt-0">
              <Link href="/dashboard/applications/create" className="w-full block">
                <Button variant="outline" size="sm" className="w-full justify-center space-x-1">
                  <span>Assemble {pkt.code} Dossier</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Dossier Assembly Batches */}
      <Card padding="none" className="overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Recent Dossier Compilation Batches</CardTitle>
            <CardDescription>
              Previously compiled exhibit binders, Bates numbering indices, and attorney review packages.
            </CardDescription>
          </div>
          <Link href="/dashboard/applications">
            <Button variant="ghost" size="sm" className="text-xs">
              View All Petitions
            </Button>
          </Link>
        </div>

        <div className="divide-y divide-[#E2E8F0]">
          {recentPackets.map((item) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors"
            >
              <div className="flex items-start space-x-3">
                <div className="p-2.5 bg-[#F0F4F8] text-[#172B4D] rounded-lg shrink-0 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs font-mono text-[#172B4D]">
                      {item.id}
                    </span>
                    <Badge variant="navy" size="sm">
                      {item.category}
                    </Badge>
                    <span className="text-xs font-semibold text-[#202938]">
                      {item.candidate}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#627D98]">
                    <span>{item.exhibitsCount} Exhibits</span>
                    <span>•</span>
                    <span>{item.pages} Pages</span>
                    <span>•</span>
                    <span className="font-mono text-[11px] text-[#426B91]">
                      {item.batesRange}
                    </span>
                    <span>•</span>
                    <span className="text-[11px] text-[#829AB1]">{item.compiledAt}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <Button variant="outline" size="sm" className="text-xs space-x-1">
                  <Printer className="w-3.5 h-3.5" />
                  <span>Index Sheet</span>
                </Button>
                <Button size="sm" className="text-xs space-x-1 bg-[#172B4D] hover:bg-[#0F1B2D]">
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF Bundle</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
