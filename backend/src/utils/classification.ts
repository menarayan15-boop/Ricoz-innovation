// backend/src/utils/classification.ts
// Visa-Specific Evidentiary Classification & Filename Heuristic Suggestions

import { VisaCategory } from '../types/index.js';

export interface CategoryDefinition {
  id: string;
  label: string;
  description: string;
  visaCategory: VisaCategory | 'ALL';
}

export const VISA_CATEGORIES_REGISTRY: Record<string, CategoryDefinition[]> = {
  'H-1B': [
    {
      id: 'h1b_identity',
      label: 'Passport & Identity Records',
      description: 'Current passport biographical page, I-94 arrival record, prior I-797 approval notices, and visa stamps.',
      visaCategory: 'H-1B',
    },
    {
      id: 'h1b_academic',
      label: 'Academic Credentials & Transcripts',
      description: 'Bachelor’s/Master’s diplomas, official transcripts, and foreign degree evaluation reports.',
      visaCategory: 'H-1B',
    },
    {
      id: 'h1b_employment',
      label: 'Employment & Experience Records',
      description: 'Past employment verification letters, pay stubs, resume, and experience certificates.',
      visaCategory: 'H-1B',
    },
    {
      id: 'h1b_support_letter',
      label: 'Employer Petition Support Letter',
      description: 'Official corporate letter detailing the specialty role, duties, required qualifications, and offered wage.',
      visaCategory: 'H-1B',
    },
    {
      id: 'h1b_lca',
      label: 'Certified LCA (Form ETA-9035/9035E)',
      description: 'Department of Labor certified Labor Condition Application specifying SOC code, prevailing wage, and work locations.',
      visaCategory: 'H-1B',
    },
    {
      id: 'h1b_specialty_occupation',
      label: 'Specialty Occupation Evidence',
      description: 'Detailed job duties percentage breakdown, complex work products, industry standards data, and organizational chart.',
      visaCategory: 'H-1B',
    },
    {
      id: 'other',
      label: 'Other Evidentiary Exhibit',
      description: 'Supplementary documentation supporting petition eligibility.',
      visaCategory: 'ALL',
    },
  ],

  'O-1': [
    {
      id: 'o1_awards',
      label: 'Nationally or Internationally Recognized Awards',
      description: 'Prizes, awards, fellowships, or honors for excellence in the field.',
      visaCategory: 'O-1',
    },
    {
      id: 'o1_publications',
      label: 'Scholarly Articles & Publications',
      description: 'Peer-reviewed research articles, books, chapters, or conference proceedings authored by applicant.',
      visaCategory: 'O-1',
    },
    {
      id: 'o1_media',
      label: 'Published Material & Media Coverage',
      description: 'Articles in major trade journals, news publications, or broadcast media highlighting the applicant and their work.',
      visaCategory: 'O-1',
    },
    {
      id: 'o1_memberships',
      label: 'Distinguished Association Memberships',
      description: 'Memberships in associations requiring outstanding achievements judged by recognized national experts.',
      visaCategory: 'O-1',
    },
    {
      id: 'o1_contributions',
      label: 'Original Scientific or Scholarly Contributions',
      description: 'Major significance evidence: patents, widely adopted software frameworks, algorithms, or standards.',
      visaCategory: 'O-1',
    },
    {
      id: 'o1_critical_role',
      label: 'Critical or Essential Employment Capacity',
      description: 'Evidence of leading or critical role for organizations or establishments with a distinguished reputation.',
      visaCategory: 'O-1',
    },
    {
      id: 'o1_advisory_opinion',
      label: 'Peer Advisory Opinion / Consultation Letter',
      description: 'Written advisory opinion from an appropriate peer group, labor organization, or management organization.',
      visaCategory: 'O-1',
    },
    {
      id: 'o1_recommendation',
      label: 'Expert Testimonials & Letters of Recommendation',
      description: 'Detailed recommendation letters from recognized independent leaders evaluating applicant’s acclaim.',
      visaCategory: 'O-1',
    },
    {
      id: 'other',
      label: 'Other Evidentiary Exhibit',
      description: 'Supplementary evidence supporting extraordinary ability.',
      visaCategory: 'ALL',
    },
  ],

  'EB-2': [
    {
      id: 'eb2_advanced_degree',
      label: 'Advanced Degree Credentials',
      description: 'Master’s degree, Ph.D., or foreign academic equivalent in the specialty discipline.',
      visaCategory: 'EB-2',
    },
    {
      id: 'eb2_academic_records',
      label: 'Academic Records & Transcripts',
      description: 'Complete official transcripts, degree conferred certificates, and credential equivalency evaluations.',
      visaCategory: 'EB-2',
    },
    {
      id: 'eb2_experience',
      label: '5+ Years Progressive Experience Letters',
      description: 'Employer letters on company letterhead confirming at least 5 years of progressive post-baccalaureate experience.',
      visaCategory: 'EB-2',
    },
    {
      id: 'eb2_exceptional_ability',
      label: 'Exceptional Ability Evidence',
      description: 'Evidence satisfying at least 3 regulatory criteria for exceptional ability in the sciences, arts, or business.',
      visaCategory: 'EB-2',
    },
    {
      id: 'eb2_perm',
      label: 'Approved DOL PERM (Form ETA-9089)',
      description: 'Certified Labor Certification from the U.S. Department of Labor.',
      visaCategory: 'EB-2',
    },
    {
      id: 'other',
      label: 'Other Evidentiary Exhibit',
      description: 'Supplementary documentation for immigrant petition.',
      visaCategory: 'ALL',
    },
  ],

  'EB-2-NIW': [
    {
      id: 'niw_endeavor',
      label: 'Proposed Endeavor Documentation',
      description: 'Comprehensive endeavor whitepaper, research proposal, business executive summary, and milestone roadmap.',
      visaCategory: 'EB-2-NIW',
    },
    {
      id: 'niw_national_importance',
      label: 'Substantial Merit & National Importance (Prong 1)',
      description: 'Government policy briefs, white papers, industry reports, and economic impact data proving national significance.',
      visaCategory: 'EB-2-NIW',
    },
    {
      id: 'niw_qualifications',
      label: 'Applicant Qualifications & Track Record',
      description: 'Degree credentials, awards, fellowships, past accomplishments demonstrating expertise in the endeavor.',
      visaCategory: 'EB-2-NIW',
    },
    {
      id: 'niw_publications',
      label: 'Publications & Citation Metrics',
      description: 'Full-text papers, Google Scholar citation reports, h-index, and journal rankings demonstrating impact.',
      visaCategory: 'EB-2-NIW',
    },
    {
      id: 'niw_patents',
      label: 'Patents & Commercialized Technologies',
      description: 'Issued patents, patent applications, licensing agreements, and commercial deployment proofs.',
      visaCategory: 'EB-2-NIW',
    },
    {
      id: 'niw_contributions',
      label: 'Major Field Impact Evidence',
      description: 'Documentation of independent third parties adopting research, algorithms, datasets, or clinical protocols.',
      visaCategory: 'EB-2-NIW',
    },
    {
      id: 'niw_recommendation',
      label: 'Independent Expert Reference Letters',
      description: 'Letters from objective, independent authorities analyzing the endeavor and applicant’s exceptional positioning.',
      visaCategory: 'EB-2-NIW',
    },
    {
      id: 'niw_prong_evidence',
      label: 'Balance of Benefits & Waiver Rationale (Prong 3)',
      description: 'Evidence establishing that on balance, it is beneficial to the United States to waive the job offer and PERM requirement.',
      visaCategory: 'EB-2-NIW',
    },
    {
      id: 'other',
      label: 'Other Evidentiary Exhibit',
      description: 'Supplementary National Interest Waiver evidentiary exhibits.',
      visaCategory: 'ALL',
    },
  ],
};

/**
 * Heuristic rule-based category classifier based on filename patterns and target visa category.
 */
export function suggestCategoryFromFilename(
  filename: string,
  visaCategory?: VisaCategory
): { suggestedCategory: string; confidence: number; reason: string } {
  const lower = filename.toLowerCase();

  // Common H-1B Patterns
  if (lower.includes('lca') || lower.includes('eta-9035') || lower.includes('eta9035')) {
    return {
      suggestedCategory: 'h1b_lca',
      confidence: 0.95,
      reason: 'Filename contains Labor Condition Application (LCA/ETA-9035) identifiers.',
    };
  }
  if (lower.includes('passport') || lower.includes('visa') || lower.includes('i-94') || lower.includes('i94')) {
    return {
      suggestedCategory: 'h1b_identity',
      confidence: 0.9,
      reason: 'Filename indicates passport, travel or identity record.',
    };
  }
  if (
    lower.includes('degree') ||
    lower.includes('diploma') ||
    lower.includes('transcript') ||
    lower.includes('evaluation')
  ) {
    if (visaCategory === 'EB-2') {
      return {
        suggestedCategory: 'eb2_advanced_degree',
        confidence: 0.85,
        reason: 'Filename references educational degree or credential evaluation for EB-2.',
      };
    }
    return {
      suggestedCategory: 'h1b_academic',
      confidence: 0.85,
      reason: 'Filename references academic diploma, degree, or transcript.',
    };
  }
  if (lower.includes('support') && lower.includes('letter')) {
    return {
      suggestedCategory: 'h1b_support_letter',
      confidence: 0.85,
      reason: 'Filename indicates an employer petition support letter.',
    };
  }

  // Common O-1 Patterns
  if (lower.includes('award') || lower.includes('prize') || lower.includes('honor')) {
    return {
      suggestedCategory: 'o1_awards',
      confidence: 0.9,
      reason: 'Filename matches recognized awards or honors criteria.',
    };
  }
  if (lower.includes('media') || lower.includes('press') || lower.includes('article_about') || lower.includes('interview')) {
    return {
      suggestedCategory: 'o1_media',
      confidence: 0.85,
      reason: 'Filename matches published media coverage criteria.',
    };
  }
  if (lower.includes('membership') || lower.includes('association') || lower.includes('fellow')) {
    return {
      suggestedCategory: 'o1_memberships',
      confidence: 0.85,
      reason: 'Filename matches distinguished association membership criteria.',
    };
  }
  if (lower.includes('advisory') || lower.includes('union') || lower.includes('consultation')) {
    return {
      suggestedCategory: 'o1_advisory_opinion',
      confidence: 0.9,
      reason: 'Filename matches peer advisory opinion or consultation letter.',
    };
  }

  // Common NIW Patterns
  if (lower.includes('endeavor') || lower.includes('proposal') || lower.includes('business_plan')) {
    return {
      suggestedCategory: 'niw_endeavor',
      confidence: 0.9,
      reason: 'Filename specifies proposed endeavor documentation.',
    };
  }
  if (lower.includes('patent') || lower.includes('invention') || lower.includes('commercial')) {
    return {
      suggestedCategory: 'niw_patents',
      confidence: 0.9,
      reason: 'Filename matches patent or commercial technology documentation.',
    };
  }
  if (lower.includes('citation') || lower.includes('scholar') || lower.includes('metrics')) {
    return {
      suggestedCategory: 'niw_publications',
      confidence: 0.9,
      reason: 'Filename matches research publications or citation impact data.',
    };
  }
  if (lower.includes('recommendation') || lower.includes('reference') || lower.includes('lor')) {
    if (visaCategory === 'EB-2-NIW') {
      return {
        suggestedCategory: 'niw_recommendation',
        confidence: 0.9,
        reason: 'Filename indicates an independent expert recommendation letter for NIW.',
      };
    }
    return {
      suggestedCategory: 'o1_recommendation',
      confidence: 0.85,
      reason: 'Filename indicates an expert reference or recommendation letter.',
    };
  }

  // EB-2 PERM Patterns
  if (lower.includes('perm') || lower.includes('eta-9089') || lower.includes('eta9089')) {
    return {
      suggestedCategory: 'eb2_perm',
      confidence: 0.95,
      reason: 'Filename matches approved DOL PERM labor certification.',
    };
  }
  if (lower.includes('experience') || lower.includes('employment_verification')) {
    return {
      suggestedCategory: visaCategory === 'EB-2' ? 'eb2_experience' : 'h1b_employment',
      confidence: 0.85,
      reason: 'Filename matches employment experience verification.',
    };
  }

  return {
    suggestedCategory: 'other',
    confidence: 0.5,
    reason: 'Generic evidentiary exhibit.',
  };
}

