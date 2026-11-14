'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Scale,
  Shield,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Layers,
  Lock,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Users,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const visaCategories = [
    {
      code: 'H-1B',
      title: 'Specialty Occupation Visa',
      tagline: 'For professionals in specialized fields requiring higher education credentials.',
      criteria: [
        'Bachelor’s degree or higher in a relevant specialty discipline',
        'Certified Labor Condition Application (LCA) alignment with prevailing wages',
        'Job duties requiring theoretical and practical specialized application',
      ],
      dossierExhibits: [
        'Form I-129 Supplement H',
        'Certified ETA-9035 LCA Form',
        'Degree Evaluation & Academic Transcripts',
        'Employer Support Letter & Detailed Job Duties',
      ],
    },
    {
      code: 'O-1A / O-1B',
      title: 'Extraordinary Ability Visa',
      tagline: 'For individuals with extraordinary achievement in sciences, education, business, or arts.',
      criteria: [
        'Receipt of nationally or internationally recognized prizes or awards',
        'Published material in major trade or professional publications',
        'Original scientific, scholarly, or business-related contributions',
        'Critical or lead employment role for distinguished organizations',
      ],
      dossierExhibits: [
        'Expert Advisory & Peer Review Opinions',
        'Citation Index & Impact Factor Analytics',
        'Major Press Coverage & Media Features',
        'Contractual Evidence of Critical Industry Role',
      ],
    },
    {
      code: 'EB-2',
      title: 'Advanced Degree & Exceptional Ability',
      tagline: 'Second preference employment-based immigrant visa petition.',
      criteria: [
        'U.S. Master’s degree or Bachelor’s degree + 5 years progressive experience',
        'Exceptional ability in sciences, arts, or business',
        'Approved Permanent Labor Certification (ETA-9089 PERM)',
      ],
      dossierExhibits: [
        'Certified ETA-9089 Documentation',
        'Progressive Employment Verification Letters',
        'Salary history evidencing exceptional ability',
        'Professional license or specialty credentials',
      ],
    },
    {
      code: 'EB-2 NIW',
      title: 'National Interest Waiver',
      tagline: 'Self-petition or employer-sponsored green card waiving the job offer and PERM requirement.',
      criteria: [
        'Matter of Dhanasar Prong 1: Substantial merit and national importance of proposed endeavor',
        'Matter of Dhanasar Prong 2: Petitioner is well-positioned to advance the endeavor',
        'Matter of Dhanasar Prong 3: On balance, beneficial to the U.S. to waive job offer & PERM',
      ],
      dossierExhibits: [
        'Matter of Dhanasar Legal Brief & Exhibit Index',
        'Independent Endorsement Letters from U.S. Experts',
        'Executive Endeavor Proposal & Commercial Plan',
        'Government or Grant Funding Authorizations',
      ],
    },
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Intelligent Profile & Category Onboarding',
      desc: 'Guided wizard collects applicant credentials, employer sponsorships, wage determinations, and tailored visa-specific qualification prerequisites.',
    },
    {
      step: '02',
      title: 'Automated Document Ingestion & Multimodal OCR',
      desc: 'Securely upload PDFs and scans. Pipeline categorizes evidence into standard USCIS exhibit buckets and extracts structured metadata.',
    },
    {
      step: '03',
      title: 'Cross-Document Consistency Engine',
      desc: 'Compares extracted names, employment dates, university degrees, and employer titles across all exhibits to surface inconsistencies before legal submission.',
    },
    {
      step: '04',
      title: 'Attorney Workspace & Final Dossier Assembly',
      desc: 'Assigned immigration attorneys review findings, request document supplements, approve exhibits, and compile a paginated, indexed PDF package.',
    },
  ];

  const faqs = [
    {
      q: 'Does this platform guarantee visa approval or replace an immigration attorney?',
      a: 'No. The platform is an assistive LegalTech solution engineered specifically to streamline document collection, OCR extraction, consistency validation, and exhibit dossier formatting. It does not provide legal representation, give formal legal counsel, or guarantee petition approvals. Final review and formal filing must be conducted by qualified immigration counsel.',
    },
    {
      q: 'Which visa petitions are supported?',
      a: 'We provide specialized workflows and dynamic evidence checklists for H-1B (Specialty Occupations), O-1 (Extraordinary Ability), EB-2 (Advanced Degree / Exceptional Ability), and EB-2 NIW (National Interest Waiver based on the Matter of Dhanasar framework).',
    },
    {
      q: 'How does the Cross-Document Consistency Checker work?',
      a: 'Immigration petitions frequently receive Requests for Evidence (RFEs) due to minor inconsistencies (e.g. conflicting employment start dates between a resume and verification letter, or misspelled university names). Our engine extracts structured attributes from each uploaded file and cross-references them against your application profile, highlighting discrepancies by severity level.',
    },
    {
      q: 'How is confidential immigration documentation protected?',
      a: 'We treat personal and proprietary employment data with strict LegalTech compliance. All documents are stored in private, isolated cloud storage with signed download tokens. Data in transit is secured with TLS 1.3, and data at rest is encrypted with AES-256. Role-based access control (RBAC) ensures only authorized applicants and assigned counsel can view your exhibits.',
    },
    {
      q: 'What format is the compiled dossier generated in?',
      a: 'The compiled dossier is exported as a publication-ready, standardized PDF package. It includes an official petition cover page, table of contents, exhibit divider tabs (Exhibit A, B, C...), numbered page footers, case identifiers, and an attorney review sign-off summary.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#202938] flex flex-col font-sans">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-white border-b border-[#E2E8F0] pt-14 pb-18 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium bg-[#F0F4F8] text-[#172B4D] border border-[#D9E2EC]">
            <Shield className="w-3.5 h-3.5 text-[#426B91]" />
            <span>AI-Assisted LegalTech Platform for U.S. Employment-Based Petitions</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">
            Structure, Validate, and Assemble <br className="hidden sm:inline" />
            <span className="text-[#426B91]">Attorney-Ready Visa Dossiers</span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-lg text-[#486581] leading-relaxed">
            Eliminate manual evidence chaos for <strong className="text-[#172B4D]">H-1B, O-1, EB-2, and EB-2 NIW</strong> petitions.
            Extract metadata with OCR, detect cross-document discrepancies before filing, and compile structured exhibit packages with attorney collaboration.
          </p>

          {/* Legal Notice Callout */}
          <div className="max-w-2xl mx-auto p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-xs text-[#627D98] text-center">
            <strong>Legal Disclaimer:</strong> This system assists with evidentiary preparation and organizational workflow. It does not provide legal advice, replace qualified legal counsel, or guarantee immigration benefits.
          </div>

          {/* Primary Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/dashboard/applications/create">
              <Button size="lg" className="w-full sm:w-auto px-8 space-x-2 shadow-sm">
                <span>Start Your Visa Dossier</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/dashboard-preview">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-6">
                Dashboard Preview
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="ghost" size="lg" className="w-full sm:w-auto px-4 text-[#486581]">
                How It Works
              </Button>
            </Link>
          </div>

          {/* Key Metrics */}
          <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-[#F1F5F9] text-left">
            <div className="p-3 bg-[#F8FAFC] rounded border border-[#E2E8F0]">
              <span className="text-xs text-[#627D98] block">Supported Petitions</span>
              <span className="font-semibold text-sm text-[#172B4D]">H-1B, O-1, EB-2 & NIW</span>
            </div>
            <div className="p-3 bg-[#F8FAFC] rounded border border-[#E2E8F0]">
              <span className="text-xs text-[#627D98] block">Evidence Intelligence</span>
              <span className="font-semibold text-sm text-[#172B4D]">OCR & Text Parsing</span>
            </div>
            <div className="p-3 bg-[#F8FAFC] rounded border border-[#E2E8F0]">
              <span className="text-xs text-[#627D98] block">Validation Engine</span>
              <span className="font-semibold text-sm text-[#172B4D]">Cross-Exhibit Checks</span>
            </div>
            <div className="p-3 bg-[#F8FAFC] rounded border border-[#E2E8F0]">
              <span className="text-xs text-[#627D98] block">Attorney Collaboration</span>
              <span className="font-semibold text-sm text-[#172B4D]">Review & Sign-Off</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center space-y-3 mb-14">
          <Badge variant="navy">Streamlined Petition Lifecycle</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#172B4D] tracking-tight">
            How The Dossier Builder Operates
          </h2>
          <p className="text-sm text-[#486581] max-w-2xl mx-auto">
            From fragmented resumes and certificates to a structured, paginated legal dossier ready for attorney filing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {workflowSteps.map((ws, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm flex flex-col justify-between hover:border-[#CBD5E1] transition-colors"
            >
              <div>
                <span className="text-xs font-bold text-[#426B91] tracking-widest block mb-2 font-mono">
                  STEP {ws.step}
                </span>
                <h3 className="text-base font-semibold text-[#172B4D] mb-2">
                  {ws.title}
                </h3>
                <p className="text-xs text-[#627D98] leading-relaxed">
                  {ws.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Supported Visa Categories */}
      <section id="visas" className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-3 mb-14">
            <Badge variant="navy">USCIS Framework Alignment</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#172B4D] tracking-tight">
              Supported Visa Petitions & Evidence Mapping
            </h2>
            <p className="text-sm text-[#486581] max-w-2xl mx-auto">
              Pre-configured statutory criteria and automated exhibit labeling customized for each petition classification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {visaCategories.map((vc, idx) => (
              <div
                key={idx}
                className="bg-[#FAFCFF] rounded-lg border border-[#D9E2EC] p-6 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded bg-[#172B4D] text-white text-xs font-bold font-mono">
                      {vc.code}
                    </span>
                    <span className="text-xs text-[#627D98] font-medium">
                      Employment-Based Category
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#172B4D] mb-1">
                    {vc.title}
                  </h3>
                  <p className="text-xs text-[#486581] mb-5">{vc.tagline}</p>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-2">
                        Key Statutory Requirements
                      </h4>
                      <ul className="space-y-1.5 text-xs text-[#486581]">
                        {vc.criteria.map((c, ci) => (
                          <li key={ci} className="flex items-start">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32] mr-2 shrink-0 mt-0.5" />
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-3 border-t border-[#E2E8F0]">
                      <h4 className="text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-2">
                        Generated Exhibit Structure
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {vc.dossierExhibits.map((ex, ei) => (
                          <div
                            key={ei}
                            className="p-2 bg-white rounded border border-[#E2E8F0] text-[11px] text-[#334E68] flex items-center"
                          >
                            <FileText className="w-3 h-3 mr-1.5 text-[#426B91] shrink-0" />
                            <span className="truncate">{ex}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-xs text-[#627D98]">Full compliance template included</span>
                  <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="text-[#172B4D] text-xs">
                      Build {vc.code} Dossier →
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Platform Capabilities */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center space-y-3 mb-14">
          <Badge variant="navy">Engineered for Accuracy</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#172B4D] tracking-tight">
            Enterprise LegalTech Capabilities
          </h2>
          <p className="text-sm text-[#486581] max-w-2xl mx-auto">
            Built from the ground up to prevent administrative delays and Requests for Evidence (RFEs).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded bg-[#F0F4F8] text-[#172B4D] flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#426B91]" />
            </div>
            <h3 className="text-base font-semibold text-[#172B4D]">
              Multimodal Document Intelligence
            </h3>
            <p className="text-xs text-[#627D98] leading-relaxed">
              Handles multi-page PDFs, scans, and transcripts. Text extraction pipeline identifies key entities including job titles, dates, institutions, degrees, and publication citations for applicant confirmation.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded bg-[#F0F4F8] text-[#172B4D] flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-[#B78103]" />
            </div>
            <h3 className="text-base font-semibold text-[#172B4D]">
              Cross-Document Consistency Engine
            </h3>
            <p className="text-xs text-[#627D98] leading-relaxed">
              Surfaces date discrepancies, differing job designations, mismatched name spellings, and missing signatures across multiple exhibits before submission to counsel.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded bg-[#F0F4F8] text-[#172B4D] flex items-center justify-center">
              <Layers className="w-5 h-5 text-[#2E7D32]" />
            </div>
            <h3 className="text-base font-semibold text-[#172B4D]">
              Automated Exhibit Compilation
            </h3>
            <p className="text-xs text-[#627D98] leading-relaxed">
              Merges scattered PDFs into a unified dossier with a standardized cover page, table of contents, exhibit divider slipsheets, and sequential bottom-right bates numbering.
            </p>
          </div>
        </div>
      </section>

      {/* Attorney Review & Collaboration Workspace */}
      <section id="attorney-review" className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-t border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-xl space-y-4">
            <Badge variant="navy">Collaborative Review</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#172B4D] tracking-tight">
              Dedicated Attorney Workspace & Legal Audit Trail
            </h2>
            <p className="text-sm text-[#486581] leading-relaxed">
              Immigration attorneys can access assigned cases, inspect AI-identified findings, annotate specific exhibits, and issue formal document requests directly to applicants or sponsoring HR teams.
            </p>
            <ul className="space-y-2 text-xs text-[#486581] pt-2">
              <li className="flex items-center">
                <CheckCircle2 className="w-4 h-4 text-[#2E7D32] mr-2 shrink-0" />
                <span>Client case assignments with granular role-based permissions</span>
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="w-4 h-4 text-[#2E7D32] mr-2 shrink-0" />
                <span>Exhibit approval, rejection, and correction request workflows</span>
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="w-4 h-4 text-[#2E7D32] mr-2 shrink-0" />
                <span>Formal attorney review report generation and internal sign-off stamp</span>
              </li>
            </ul>
            <div className="pt-4">
              <Link href="/dashboard/attorney">
                <Button variant="secondary" size="md">
                  Preview Attorney Workspace →
                </Button>
              </Link>
            </div>
          </div>

          <div className="w-full md:w-1/2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-6 shadow-sm">
            <div className="border-b border-[#E2E8F0] pb-3 mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Scale className="w-4 h-4 text-[#172B4D]" />
                <span className="text-xs font-semibold text-[#172B4D]">
                  Case Review Queue (O-1 Petition #APP-2026-8812)
                </span>
              </div>
              <Badge variant="warning" size="sm">Under Review</Badge>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-white rounded border border-[#E2E8F0] flex justify-between items-center">
                <div>
                  <span className="font-medium text-[#172B4D] block">Exhibit C: Peer Review Verification</span>
                  <span className="text-[11px] text-[#627D98]">IEEE Transactions on Pattern Analysis</span>
                </div>
                <Badge variant="success" size="sm">Approved</Badge>
              </div>
              <div className="p-3 bg-white rounded border border-[#E2E8F0] flex justify-between items-center">
                <div>
                  <span className="font-medium text-[#172B4D] block">Exhibit D: Employer Support Letter</span>
                  <span className="text-[11px] text-[#C62828]">Dates mismatch with Resume (2022 vs 2023)</span>
                </div>
                <Badge variant="error" size="sm">Revision Requested</Badge>
              </div>
              <div className="p-3 bg-white rounded border border-[#E2E8F0] flex justify-between items-center">
                <div>
                  <span className="font-medium text-[#172B4D] block">Exhibit E: Major Media Coverage</span>
                  <span className="text-[11px] text-[#627D98]">TechCrunch Feature Article</span>
                </div>
                <Badge variant="neutral" size="sm">Pending Review</Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Confidentiality */}
      <section id="security" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#FAFCFF] border-t border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-3 mb-12">
            <Badge variant="navy">Confidentiality Standards</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#172B4D] tracking-tight">
              Rigorous Security & Privacy Protection
            </h2>
            <p className="text-sm text-[#486581] max-w-2xl mx-auto">
              Immigration filings contain sensitive identity, tax, and intellectual property data. We engineer for maximum protection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-white rounded-lg border border-[#E2E8F0]">
              <Lock className="w-5 h-5 text-[#426B91] mb-2" />
              <h3 className="text-sm font-semibold text-[#172B4D] mb-1">
                Zero Public URLs
              </h3>
              <p className="text-xs text-[#627D98]">
                Exhibits are stored in private cloud buckets. Downloads are strictly mediated via short-lived, authenticated cryptographic signatures.
              </p>
            </div>
            <div className="p-5 bg-white rounded-lg border border-[#E2E8F0]">
              <Shield className="w-5 h-5 text-[#2E7D32] mb-2" />
              <h3 className="text-sm font-semibold text-[#172B4D] mb-1">
                End-to-End Cryptography
              </h3>
              <p className="text-xs text-[#627D98]">
                Enforced TLS 1.3 in transit and AES-256 volume encryption at rest for MongoDB persistence and document payloads.
              </p>
            </div>
            <div className="p-5 bg-white rounded-lg border border-[#E2E8F0]">
              <Users className="w-5 h-5 text-[#172B4D] mb-2" />
              <h3 className="text-sm font-semibold text-[#172B4D] mb-1">
                Strict Referential Authorization
              </h3>
              <p className="text-xs text-[#627D98]">
                Role-based access control prevents cross-tenant data leaks. Only the verified applicant and explicitly assigned counsel can access case files.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="text-center space-y-3 mb-12">
          <Badge variant="navy">Common Questions</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#172B4D] tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-[#486581]">
            Clear information on platform functionality, legal limits, and evidentiary preparation.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full px-6 py-4 text-left flex justify-between items-center text-sm font-medium text-[#172B4D] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-[#627D98] shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#627D98] shrink-0" />
                )}
              </button>
              {openFaq === idx && (
                <div className="px-6 pb-4 pt-1 text-xs text-[#486581] leading-relaxed border-t border-[#F1F5F9]">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E2E8F0] py-12 px-4 sm:px-6 lg:px-8 text-xs text-[#627D98]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded bg-[#172B4D] flex items-center justify-center text-white font-bold text-xs">
              <Scale className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-sm text-[#172B4D] block">
                Immigration & Work Visa Dossier Builder
              </span>
              <span className="text-[11px] text-[#829AB1]">
                LegalTech Application Preparation Platform
              </span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-xs text-[#486581]">
            <Link href="#how-it-works" className="hover:text-[#172B4D]">How It Works</Link>
            <Link href="#visas" className="hover:text-[#172B4D]">Supported Visas</Link>
            <Link href="#features" className="hover:text-[#172B4D]">Features</Link>
            <Link href="#security" className="hover:text-[#172B4D]">Security</Link>
            <Link href="#faq" className="hover:text-[#172B4D]">FAQ</Link>
            <Link href="/dashboard-preview" className="hover:text-[#172B4D]">Dashboard Preview</Link>
            <Link href="/dashboard" className="hover:text-[#172B4D]">Dashboard</Link>
          </div>

          <div className="text-center md:text-right text-[11px] text-[#9FB3C8]">
            <p>© {new Date().getFullYear()} Immigration Dossier Builder. All rights reserved.</p>
            <p className="mt-0.5">Not affiliated with USCIS or the U.S. Department of Homeland Security.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

