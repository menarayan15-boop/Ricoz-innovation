import {
  BackendHealthResponse,
  DatabaseHealthResponse,
  AuthResponse,
  AuthUser,
  DashboardSummaryResponse,
  ApplicationRecord,
  DocumentRecord,
  ChecklistItem,
} from '@/types';

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;
  data?: unknown;

  constructor(message: string, statusCode: number, details?: unknown, data?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.data = data;
    this.name = 'ApiError';
  }
}

export function getApiBaseUrl(): string {
  // 1. Explicitly configured API URL via environment variable
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  // 2. Client-side browser execution
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Local development loopback
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
      return 'http://localhost:5001/api/v1';
    }
    // Production on deployed host (Vercel, custom domain) -> relative /api/v1 (rewritten by Next.js or same origin)
    return `${window.location.origin}/api/v1`;
  }

  // 3. Server-side rendering (SSR) fallback
  if (process.env.BACKEND_URL) {
    return `${process.env.BACKEND_URL.replace(/\/+$/, '')}/api/v1`;
  }

  return process.env.NODE_ENV === 'production'
    ? '/api/v1'
    : 'http://localhost:5001/api/v1';
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Auth token support
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const signal = options.signal || controller.signal;

  try {
    const res = await fetch(url, {
      ...options,
      credentials: 'include', // Support HttpOnly cookies across origin
      headers,
      signal,
    });

    clearTimeout(timeoutId);

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new ApiError(
        data?.message || `Request to ${endpoint} failed with HTTP ${res.status}`,
        res.status,
        data?.details,
        data
      );
    }

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) {
      throw error;
    }
    if ((error as Error).name === 'AbortError') {
      throw new ApiError(
        `Connection timed out after ${timeoutMs}ms. Backend server at ${url} did not respond.`,
        408
      );
    }
    throw new ApiError(
      `Unable to reach backend server at ${url}: ${(error as Error).message}`,
      0
    );
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  // Phase 1 Foundation Health Checks
  checkServerHealth: async (): Promise<BackendHealthResponse> => {
    return request<BackendHealthResponse>('/health', { method: 'GET' }, 8000);
  },

  checkDatabaseHealth: async (): Promise<DatabaseHealthResponse> => {
    try {
      return await request<DatabaseHealthResponse>('/health/db', { method: 'GET' }, 8000);
    } catch (err) {
      if (err instanceof ApiError && err.data) {
        return err.data as DatabaseHealthResponse;
      }
      throw err;
    }
  },

  // Phase 3.2 Real Authentication APIs
  register: async (payload: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<AuthResponse> => {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  login: async (payload: {
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getProfile: async (): Promise<{ success: boolean; user: AuthUser }> => {
    return request<{ success: boolean; user: AuthUser }>('/auth/me', {
      method: 'GET',
    });
  },

  logout: async (): Promise<{ success: boolean; message: string }> => {
    return request<{ success: boolean; message: string }>('/auth/logout', {
      method: 'POST',
    });
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    return request<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (token: string, password: string): Promise<{ success: boolean; message: string }> => {
    return request<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },

  // Phase 3.4 Live Dashboard Summary
  getDashboardSummary: async (): Promise<DashboardSummaryResponse> => {
    return request<DashboardSummaryResponse>('/dashboard/summary', {
      method: 'GET',
    });
  },

  // Phase 3.5 & Phase 4 Application Workflows
  getApplications: async (params?: {
    category?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{
    success: boolean;
    count: number;
    total: number;
    page: number;
    totalPages: number;
    applications: ApplicationRecord[];
  }> => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'ALL') query.set('category', params.category);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request<{
      success: boolean;
      count: number;
      total: number;
      page: number;
      totalPages: number;
      applications: ApplicationRecord[];
    }>(`/applications${queryString}`, { method: 'GET' });
  },

  getApplication: async (
    id: string
  ): Promise<{ success: boolean; application: ApplicationRecord }> => {
    return request<{ success: boolean; application: ApplicationRecord }>(
      `/applications/${id}`,
      { method: 'GET' }
    );
  },

  createApplication: async (payload: {
    visaCategory: string;
    title: string;
    targetFilingDate?: string;
    draftStep?: number;
    applicantDetails?: Record<string, unknown>;
    educationDetails?: Record<string, unknown>;
    employmentDetails?: Record<string, unknown>;
    categorySpecificDetails?: Record<string, unknown>;
    formData?: Record<string, unknown>;
  }): Promise<{ success: boolean; message: string; application: ApplicationRecord }> => {
    return request<{ success: boolean; message: string; application: ApplicationRecord }>(
      '/applications',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  saveApplicationDraft: async (
    id: string,
    payload: {
      currentStep?: number;
      draftStep?: number;
      title?: string;
      status?: string;
      targetFilingDate?: string;
      concurrencyVersion?: number;
      applicantDetails?: Record<string, unknown>;
      educationDetails?: Record<string, unknown>;
      employmentDetails?: Record<string, unknown>;
      categorySpecificDetails?: Record<string, unknown>;
      formData?: Record<string, unknown>;
    }
  ): Promise<{
    success: boolean;
    message: string;
    concurrencyVersion?: number;
    progressPercentage?: number;
    application: ApplicationRecord;
  }> => {
    return request<{
      success: boolean;
      message: string;
      concurrencyVersion?: number;
      progressPercentage?: number;
      application: ApplicationRecord;
    }>(`/applications/${id}/save-draft`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateApplication: async (
    id: string,
    payload: Record<string, unknown>
  ): Promise<{ success: boolean; message: string; application: ApplicationRecord }> => {
    return request<{ success: boolean; message: string; application: ApplicationRecord }>(
      `/applications/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
  },

  updateApplicationStatus: async (
    id: string,
    status: string,
    reason?: string
  ): Promise<{ success: boolean; message: string; application: ApplicationRecord }> => {
    return request<{ success: boolean; message: string; application: ApplicationRecord }>(
      `/applications/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      }
    );
  },

  getChecklist: async (
    applicationId: string
  ): Promise<{
    success: boolean;
    total: number;
    completed: number;
    progress: number;
    checklist: ChecklistItem[];
  }> => {
    return request<{
      success: boolean;
      total: number;
      completed: number;
      progress: number;
      checklist: ChecklistItem[];
    }>(`/applications/${applicationId}/checklist`, { method: 'GET' });
  },

  toggleChecklistItem: async (
    applicationId: string,
    itemId: string,
    isCompleted?: boolean,
    notes?: string
  ): Promise<{
    success: boolean;
    message: string;
    checklist: ChecklistItem[];
    progressPercentage?: number;
    application: ApplicationRecord;
  }> => {
    return request<{
      success: boolean;
      message: string;
      checklist: ChecklistItem[];
      progressPercentage?: number;
      application: ApplicationRecord;
    }>(`/applications/${applicationId}/checklist/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isCompleted, notes }),
    });
  },

  addCustomChecklistItem: async (
    applicationId: string,
    payload: {
      label: string;
      section: string;
      description?: string;
      required?: boolean;
      notes?: string;
    }
  ): Promise<{
    success: boolean;
    message: string;
    item: ChecklistItem;
    checklist: ChecklistItem[];
    progressPercentage?: number;
  }> => {
    return request<{
      success: boolean;
      message: string;
      item: ChecklistItem;
      checklist: ChecklistItem[];
      progressPercentage?: number;
    }>(`/applications/${applicationId}/checklist/custom`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  assignAttorney: async (
    applicationId: string,
    attorneyId: string
  ): Promise<{ success: boolean; message: string; application: ApplicationRecord }> => {
    return request<{ success: boolean; message: string; application: ApplicationRecord }>(
      `/applications/${applicationId}/assign-attorney`,
      {
        method: 'POST',
        body: JSON.stringify({ attorneyId }),
      }
    );
  },

  recordAttorneyReview: async (
    applicationId: string,
    payload: { status: 'approved' | 'changes_requested' | 'rejected'; comments: string }
  ): Promise<{ success: boolean; message: string; application: ApplicationRecord }> => {
    return request<{ success: boolean; message: string; application: ApplicationRecord }>(
      `/applications/${applicationId}/review`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  requestMissingEvidence: async (
    applicationId: string,
    payload: { documentName: string; reason: string }
  ): Promise<{ success: boolean; message: string; application: ApplicationRecord }> => {
    return request<{ success: boolean; message: string; application: ApplicationRecord }>(
      `/applications/${applicationId}/request-evidence`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  // Phase 5 Secure Document Management & Intelligence
  uploadDocuments: async (
    formData: FormData,
    applicationId?: string
  ): Promise<{ success: boolean; message: string; documents: DocumentRecord[] }> => {
    const endpoint = applicationId
      ? `/applications/${applicationId}/documents`
      : '/documents/upload';
    return request<{ success: boolean; message: string; documents: DocumentRecord[] }>(
      endpoint,
      {
        method: 'POST',
        body: formData,
      }
    );
  },

  getApplicationDocuments: async (
    applicationId: string,
    params?: {
      category?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    success: boolean;
    count: number;
    total: number;
    page: number;
    totalPages: number;
    documents: DocumentRecord[];
  }> => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'ALL') query.set('category', params.category);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';

    return request<{
      success: boolean;
      count: number;
      total: number;
      page: number;
      totalPages: number;
      documents: DocumentRecord[];
    }>(`/documents/application/${applicationId}${queryString}`, { method: 'GET' });
  },

  getDocument: async (
    documentId: string
  ): Promise<{ success: boolean; document: DocumentRecord }> => {
    return request<{ success: boolean; document: DocumentRecord }>(
      `/documents/${documentId}`,
      { method: 'GET' }
    );
  },

  updateDocument: async (
    documentId: string,
    payload: { title?: string; category?: string; checklistItemId?: string; notes?: string }
  ): Promise<{ success: boolean; message: string; document: DocumentRecord }> => {
    return request<{ success: boolean; message: string; document: DocumentRecord }>(
      `/documents/${documentId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
  },

  uploadDocumentVersion: async (
    documentId: string,
    formData: FormData
  ): Promise<{ success: boolean; message: string; document: DocumentRecord }> => {
    return request<{ success: boolean; message: string; document: DocumentRecord }>(
      `/documents/${documentId}/versions`,
      {
        method: 'POST',
        body: formData,
      }
    );
  },

  getDocumentVersions: async (
    documentId: string
  ): Promise<{ success: boolean; count: number; versions: DocumentRecord[] }> => {
    return request<{ success: boolean; count: number; versions: DocumentRecord[] }>(
      `/documents/${documentId}/versions`,
      { method: 'GET' }
    );
  },

  reviewDocument: async (
    documentId: string,
    status: string,
    reviewNotes?: string
  ): Promise<{ success: boolean; message: string; document: DocumentRecord }> => {
    return request<{ success: boolean; message: string; document: DocumentRecord }>(
      `/documents/${documentId}/review`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, reviewNotes }),
      }
    );
  },

  deleteDocument: async (
    documentId: string
  ): Promise<{ success: boolean; message: string }> => {
    return request<{ success: boolean; message: string }>(
      `/documents/${documentId}`,
      { method: 'DELETE' }
    );
  },

  getDocumentActivity: async (
    documentId: string
  ): Promise<{ success: boolean; count: number; activities: any[] }> => {
    return request<{ success: boolean; count: number; activities: any[] }>(
      `/documents/${documentId}/activity`,
      { method: 'GET' }
    );
  },

  getDocumentStats: async (): Promise<{
    success: boolean;
    stats: {
      totalDocuments: number;
      pendingReview: number;
      verifiedDocuments: number;
      correctionsRequested: number;
    };
  }> => {
    return request<{
      success: boolean;
      stats: {
        totalDocuments: number;
        pendingReview: number;
        verifiedDocuments: number;
        correctionsRequested: number;
      };
    }>('/documents/stats', { method: 'GET' });
  },

  getClassificationSuggestions: async (
    filename?: string,
    visaCategory?: string
  ): Promise<{
    success: boolean;
    categories: Array<{ id: string; label: string; description: string; visaCategory: string }>;
    suggestion: { suggestedCategory: string; confidence: number; reason: string } | null;
  }> => {
    const query = new URLSearchParams();
    if (filename) query.set('filename', filename);
    if (visaCategory) query.set('visaCategory', visaCategory);
    const queryString = query.toString() ? `?${query.toString()}` : '';

    return request<{
      success: boolean;
      categories: Array<{ id: string; label: string; description: string; visaCategory: string }>;
      suggestion: { suggestedCategory: string; confidence: number; reason: string } | null;
    }>(`/documents/suggestions${queryString}`, { method: 'GET' });
  },

  getDownloadUrl: (documentId: string): string => {
    return `${getApiBaseUrl()}/documents/${documentId}/download`;
  },

  getPreviewUrl: (documentId: string): string => {
    return `${getApiBaseUrl()}/documents/${documentId}/preview`;
  },

  // =========================================================================
  // Phase 6: AI Assistant, OCR & Intelligent Document Intelligence
  // =========================================================================

  chatWithAI: async (payload: {
    conversationId?: string;
    message: string;
    applicationId?: string;
    attachedDocumentIds?: string[];
  }): Promise<{
    success: boolean;
    conversationId: string;
    message: import('@/types').AIMessageRecord;
    conversation: import('@/types').AIConversationRecord;
  }> => {
    return request<{
      success: boolean;
      conversationId: string;
      message: import('@/types').AIMessageRecord;
      conversation: import('@/types').AIConversationRecord;
    }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getAIConversations: async (
    applicationId?: string
  ): Promise<{
    success: boolean;
    count: number;
    conversations: import('@/types').AIConversationRecord[];
  }> => {
    const query = applicationId ? `?applicationId=${applicationId}` : '';
    return request<{
      success: boolean;
      count: number;
      conversations: import('@/types').AIConversationRecord[];
    }>(`/ai/conversations${query}`, { method: 'GET' });
  },

  getAIConversation: async (
    conversationId: string
  ): Promise<{
    success: boolean;
    conversation: import('@/types').AIConversationRecord;
    messages: import('@/types').AIMessageRecord[];
  }> => {
    return request<{
      success: boolean;
      conversation: import('@/types').AIConversationRecord;
      messages: import('@/types').AIMessageRecord[];
    }>(`/ai/conversations/${conversationId}`, { method: 'GET' });
  },

  deleteAIConversation: async (
    conversationId: string
  ): Promise<{ success: boolean; message: string }> => {
    return request<{ success: boolean; message: string }>(
      `/ai/conversations/${conversationId}`,
      { method: 'DELETE' }
    );
  },

  extractDocumentData: async (
    documentId: string
  ): Promise<{
    success: boolean;
    message: string;
    extraction: import('@/types').DocumentExtractionRecord;
    fields: import('@/types').ExtractedFieldRecord[];
  }> => {
    return request<{
      success: boolean;
      message: string;
      extraction: import('@/types').DocumentExtractionRecord;
      fields: import('@/types').ExtractedFieldRecord[];
    }>(`/ai/documents/${documentId}/extract`, { method: 'POST' });
  },

  getDocumentExtraction: async (
    documentId: string
  ): Promise<{
    success: boolean;
    extraction: import('@/types').DocumentExtractionRecord | null;
    fields: import('@/types').ExtractedFieldRecord[];
  }> => {
    return request<{
      success: boolean;
      extraction: import('@/types').DocumentExtractionRecord | null;
      fields: import('@/types').ExtractedFieldRecord[];
    }>(`/ai/documents/${documentId}/extraction`, { method: 'GET' });
  },

  summarizeDocument: async (
    documentId: string
  ): Promise<{
    success: boolean;
    documentId: string;
    summary: string;
    keyPoints: string[];
  }> => {
    return request<{
      success: boolean;
      documentId: string;
      summary: string;
      keyPoints: string[];
    }>(`/ai/documents/${documentId}/summarize`, { method: 'POST' });
  },

  analyzeCaseEvidence: async (
    applicationId: string
  ): Promise<{
    success: boolean;
    count: number;
    findings: import('@/types').EvidenceFindingRecord[];
  }> => {
    return request<{
      success: boolean;
      count: number;
      findings: import('@/types').EvidenceFindingRecord[];
    }>('/ai/analyze-evidence', {
      method: 'POST',
      body: JSON.stringify({ applicationId }),
    });
  },

  getCaseFindings: async (
    applicationId: string
  ): Promise<{
    success: boolean;
    count: number;
    findings: import('@/types').EvidenceFindingRecord[];
  }> => {
    return request<{
      success: boolean;
      count: number;
      findings: import('@/types').EvidenceFindingRecord[];
    }>(`/ai/findings/${applicationId}`, { method: 'GET' });
  },

  reviewFinding: async (
    findingId: string,
    status: 'acknowledged' | 'resolved' | 'dismissed'
  ): Promise<{ success: boolean; message: string; finding: import('@/types').EvidenceFindingRecord }> => {
    return request<{ success: boolean; message: string; finding: import('@/types').EvidenceFindingRecord }>(
      `/ai/findings/${findingId}/review`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );
  },

  reviewExtractedField: async (
    fieldId: string,
    status: 'confirmed' | 'corrected' | 'dismissed',
    humanCorrection?: string
  ): Promise<{ success: boolean; message: string; field: import('@/types').ExtractedFieldRecord }> => {
    return request<{ success: boolean; message: string; field: import('@/types').ExtractedFieldRecord }>(
      `/ai/fields/${fieldId}/review`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, humanCorrection }),
      }
    );
  },

  // ---------------------------------------------------------------------------
  // Phase 7: Advanced Evidence Intelligence & Verification
  // ---------------------------------------------------------------------------
  runEvidenceAnalysis: async (
    applicationId: string
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      analysis: import('@/types').EvidenceAnalysisItem;
      findings: import('@/types').Phase7Finding[];
      gaps: import('@/types').EvidenceGapItem[];
      mappings: import('@/types').EvidenceMappingItem[];
    };
  }> => {
    return request<{
      success: boolean;
      message: string;
      data: {
        analysis: import('@/types').EvidenceAnalysisItem;
        findings: import('@/types').Phase7Finding[];
        gaps: import('@/types').EvidenceGapItem[];
        mappings: import('@/types').EvidenceMappingItem[];
      };
    }>(`/applications/${applicationId}/evidence/analyze`, { method: 'POST' });
  },

  getEvidenceFindings: async (
    applicationId: string,
    params?: { severity?: string; reviewStatus?: string }
  ): Promise<{
    success: boolean;
    findings: import('@/types').Phase7Finding[];
    totalCount: number;
    severityBreakdown: {
      informational: number;
      low: number;
      medium: number;
      high: number;
    };
  }> => {
    const q = new URLSearchParams();
    if (params?.severity) q.append('severity', params.severity);
    if (params?.reviewStatus) q.append('reviewStatus', params.reviewStatus);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<{
      success: boolean;
      findings: import('@/types').Phase7Finding[];
      totalCount: number;
      severityBreakdown: {
        informational: number;
        low: number;
        medium: number;
        high: number;
      };
    }>(`/applications/${applicationId}/evidence/findings${qs}`, { method: 'GET' });
  },

  getEvidenceMatrix: async (
    applicationId: string
  ): Promise<{
    success: boolean;
    data: {
      documentsCount: number;
      rows: Array<{
        id: string;
        domain: string;
        attribute: string;
        values: Array<{
          documentId: string;
          documentTitle: string;
          category: string;
          extractedValue: string;
        }>;
        status: 'consistent' | 'discrepancy' | 'single_source' | 'missing';
        notes?: string;
      }>;
    };
  }> => {
    return request<{
      success: boolean;
      data: {
        documentsCount: number;
        rows: Array<{
          id: string;
          domain: string;
          attribute: string;
          values: Array<{
            documentId: string;
            documentTitle: string;
            category: string;
            extractedValue: string;
          }>;
          status: 'consistent' | 'discrepancy' | 'single_source' | 'missing';
          notes?: string;
        }>;
      };
    }>(`/applications/${applicationId}/evidence/matrix`, { method: 'GET' });
  },

  reviewEvidenceFinding: async (
    findingId: string,
    payload: {
      reviewStatus: string;
      reviewNotes?: string;
      humanCorrection?: string;
      assignedAttorneyId?: string;
    }
  ): Promise<{ success: boolean; message: string; finding: import('@/types').Phase7Finding }> => {
    return request<{ success: boolean; message: string; finding: import('@/types').Phase7Finding }>(
      `/evidence/findings/${findingId}/review`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
  },

  getEvidenceGaps: async (
    applicationId: string
  ): Promise<{
    success: boolean;
    gaps: import('@/types').EvidenceGapItem[];
    openGapsCount: number;
  }> => {
    return request<{
      success: boolean;
      gaps: import('@/types').EvidenceGapItem[];
      openGapsCount: number;
    }>(`/applications/${applicationId}/evidence/gaps`, { method: 'GET' });
  },

  resolveEvidenceGap: async (
    gapId: string,
    payload: { resolutionStatus: string; waivedReason?: string }
  ): Promise<{ success: boolean; message: string; gap: import('@/types').EvidenceGapItem }> => {
    return request<{ success: boolean; message: string; gap: import('@/types').EvidenceGapItem }>(
      `/evidence/gaps/${gapId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
  },

  getEvidenceMappings: async (
    applicationId: string
  ): Promise<{
    success: boolean;
    mappings: import('@/types').EvidenceMappingItem[];
    supportedCount: number;
    totalCount: number;
    coveragePercentage: number;
  }> => {
    return request<{
      success: boolean;
      mappings: import('@/types').EvidenceMappingItem[];
      supportedCount: number;
      totalCount: number;
      coveragePercentage: number;
    }>(`/applications/${applicationId}/evidence/mappings`, { method: 'GET' });
  },

  updateEvidenceMapping: async (
    mappingId: string,
    payload: { status: string; notes?: string }
  ): Promise<{ success: boolean; message: string; mapping: import('@/types').EvidenceMappingItem }> => {
    return request<{ success: boolean; message: string; mapping: import('@/types').EvidenceMappingItem }>(
      `/evidence/mappings/${mappingId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
  },

  getEvidenceAnalyses: async (
    applicationId: string
  ): Promise<{
    success: boolean;
    analyses: import('@/types').EvidenceAnalysisItem[];
  }> => {
    return request<{
      success: boolean;
      analyses: import('@/types').EvidenceAnalysisItem[];
    }>(`/applications/${applicationId}/evidence/analyses`, { method: 'GET' });
  },

  getEvidenceReport: async (
    applicationId: string
  ): Promise<{
    success: boolean;
    report: import('@/types').EvidenceReport;
  }> => {
    return request<{
      success: boolean;
      report: import('@/types').EvidenceReport;
    }>(`/applications/${applicationId}/evidence/report`, { method: 'GET' });
  },
};
