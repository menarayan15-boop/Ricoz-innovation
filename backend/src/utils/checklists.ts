import { VisaCategory } from '../types/index.js';

export interface IChecklistItem {
  id: string;
  section: string;
  label: string;
  description: string;
  required: boolean;
  isCompleted: boolean;
  isCustom?: boolean;
  conditional?: boolean;
  notes?: string;
  updatedAt?: Date;
}

export const getPreliminaryChecklist = (category: VisaCategory): IChecklistItem[] => {
  switch (category) {
    case 'H-1B':
      return [
        {
          id: 'h1b_lca',
          section: 'LCA & Labor Compliance',
          label: 'Certified Labor Condition Application (Form ETA-9035)',
          description: 'DOL-certified LCA covering wage levels, prevailing wage, and work locations.',
          required: true,
          isCompleted: false,
        },
        {
          id: 'h1b_specialty_job_desc',
          section: 'Specialty Occupation',
          label: 'Specialty Occupation Job Description & Duty Breakdown',
          description: 'Detailed breakdown demonstrating complex duties requiring a specialized bachelor degree.',
          required: true,
          isCompleted: false,
        },
        {
          id: 'h1b_degree_records',
          section: 'Beneficiary Qualifications',
          label: 'Degree Certificates & Official Transcripts',
          description: 'US degree or foreign degree equivalency evaluation relevant to specialty field.',
          required: true,
          isCompleted: false,
        },
        {
          id: 'h1b_employer_support',
          section: 'Employer Documentation',
          label: 'Petitioner Company Letter of Support',
          description: 'Formal company letter detailing role, compensation, and employer capability.',
          required: true,
          isCompleted: false,
        },
      ];

    case 'O-1':
      return [
        {
          id: 'o1_awards',
          section: 'Extraordinary Ability Evidentiary Criteria',
          label: 'Nationally or Internationally Recognized Awards & Honors',
          description: 'Documentation of major prizes or significant peer awards in the field.',
          required: true,
          isCompleted: false,
        },
        {
          id: 'o1_scholarly_publications',
          section: 'Extraordinary Ability Evidentiary Criteria',
          label: 'Authored Scholarly Articles & Research Publications',
          description: 'Copies of published papers, peer-reviewed articles, citations, and impact factors.',
          required: true,
          isCompleted: false,
        },
        {
          id: 'o1_original_contributions',
          section: 'Extraordinary Ability Evidentiary Criteria',
          label: 'Evidence of Original Scientific or Technical Contributions',
          description: 'Patents, widespread software adoptions, benchmark advances, and commercial implementations.',
          required: true,
          isCompleted: false,
        },
        {
          id: 'o1_peer_advisory_opinion',
          section: 'Consultation & Peer Review',
          label: 'Peer Union / Professional Association Advisory Opinion',
          description: 'Written advisory evaluation from a qualified peer organization or industry association.',
          required: true,
          isCompleted: false,
        },
        {
          id: 'o1_expert_testimonials',
          section: 'Support Testimonials',
          label: 'Independent Expert Recommendation Letters',
          description: 'Objective letters of support from renowned industry leaders and domain experts.',
          required: false,
          isCompleted: false,
        },
      ];

    case 'EB-2':
      return [
        {
          id: 'eb2_advanced_degree_diploma',
          section: 'Advanced Degree',
          label: 'Master’s or Doctoral Degree Official Records',
          description: 'US advanced degree or foreign academic equivalence evaluation.',
          required: true,
          isCompleted: false,
        },
        {
          id: 'eb2_progressive_exp_letters',
          section: 'Professional Experience',
          label: '5+ Years Progressive Work Experience Verification Letters',
          description: 'Formal employer letters proving progressive post-baccalaureate experience.',
          required: true,
          isCompleted: false,
        },
        {
          id: 'eb2_perm_cert',
          section: 'Labor Certification',
          label: 'Approved DOL PERM Labor Certification (ETA-9089)',
          description: 'Department of Labor certified permanent labor certification.',
          required: true,
          isCompleted: false,
        },
      ];

    case 'EB-2-NIW':
      return [
        {
          id: 'niw_proposed_endeavor',
          section: 'Dhanasar Prong 1',
          label: 'Statement of Proposed Endeavor with Substantial Merit',
          description: 'Comprehensive petition brief describing specific technical or scientific endeavor.',
          required: true,
          isCompleted: false,
        },
        {
          id: 'niw_national_importance',
          section: 'Dhanasar Prong 1',
          label: 'Evidence of National Importance & Broad Economic/Societal Impact',
          description: 'Government policy citations, market research, or critical technology alignment.',
          required: true,
          isCompleted: false,
        },
        {
          id: 'niw_well_positioned',
          section: 'Dhanasar Prong 2',
          label: 'Evidence Applicant is Well-Positioned to Advance the Endeavor',
          description: 'Track record, citations, technical leadership, grants, and progress milestones.',
          required: true,
          isCompleted: false,
        },
        {
          id: 'niw_benefit_balance',
          section: 'Dhanasar Prong 3',
          label: 'Balance of National Benefits Legal Argument',
          description: 'Demonstrating that waiving the job offer and PERM requirement benefits the United States.',
          required: true,
          isCompleted: false,
        },
        {
          id: 'niw_expert_letters',
          section: 'Evidence Dossier',
          label: 'Independent Expert Reference Letters (3-5 Letters)',
          description: 'Unbiased peer evaluations analyzing the significance and impact of the endeavor.',
          required: true,
          isCompleted: false,
        },
      ];

    default:
      return [];
  }
};

