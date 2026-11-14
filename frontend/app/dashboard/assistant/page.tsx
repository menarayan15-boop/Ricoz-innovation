'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Bot,
  Sparkles,
  Send,
  FileText,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Shield,
  Layers,
  ChevronRight,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  BookOpen,
  Eye,
  Check,
  Edit2,
  AlertTriangle,
  FileSearch,
  Scale,
  X,
  MessageSquare,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ApplicationRecord,
  DocumentRecord,
  AIConversationRecord,
  AIMessageRecord,
  AICitation,
  ExtractedFieldRecord,
  EvidenceFindingRecord,
} from '@/types';
import { apiClient, ApiError } from '@/services/apiClient';

function AssistantContent() {
  const searchParams = useSearchParams();
  const urlAppId = searchParams.get('appId');

  // Application & Case Data
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>(urlAppId || '');
  const [availableDocs, setAvailableDocs] = useState<DocumentRecord[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Conversations & Messages
  const [conversations, setConversations] = useState<AIConversationRecord[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [messages, setMessages] = useState<AIMessageRecord[]>([]);
  const [inputText, setInputText] = useState<string>('');

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active Tool Mode ('chat' | 'extractor' | 'findings')
  const [activeMode, setActiveMode] = useState<'chat' | 'extractor' | 'findings'>('chat');

  // Extracted Fields & Findings
  const [selectedDocForExtraction, setSelectedDocForExtraction] = useState<string>('');
  const [extractedFields, setExtractedFields] = useState<ExtractedFieldRecord[]>([]);
  const [documentSummary, setDocumentSummary] = useState<{ summary: string; keyPoints: string[] } | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [findings, setFindings] = useState<EvidenceFindingRecord[]>([]);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);

  // Preview Modal
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. Initial Load: Applications and Conversations
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        const [appRes, convRes] = await Promise.all([
          apiClient.getApplications({ limit: 50 }),
          apiClient.getAIConversations(),
        ]);

        if (appRes.success && appRes.applications) {
          setApplications(appRes.applications);
          if (!selectedAppId && appRes.applications.length > 0) {
            setSelectedAppId(appRes.applications[0]._id);
          } else if (urlAppId) {
            setSelectedAppId(urlAppId);
          }
        }

        if (convRes.success && convRes.conversations) {
          setConversations(convRes.conversations);
          if (convRes.conversations.length > 0 && !activeConversationId) {
            loadConversation(convRes.conversations[0].conversationId);
          }
        }
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) {
          setErrorMessage('Session expired. Please log in.');
        } else {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to initialize assistant.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, [urlAppId]);

  // 2. Load Documents when selectedAppId changes
  useEffect(() => {
    const loadDocs = async () => {
      if (!selectedAppId) {
        setAvailableDocs([]);
        return;
      }
      try {
        const res = await apiClient.getApplicationDocuments(selectedAppId, { limit: 50 });
        if (res.success && res.documents) {
          setAvailableDocs(res.documents);
          // Default attach all current case documents
          setSelectedDocIds(res.documents.map((d) => d._id));
          if (res.documents.length > 0 && !selectedDocForExtraction) {
            setSelectedDocForExtraction(res.documents[0]._id);
          }
        }
      } catch (err) {
        // Silently handle
      }
    };
    loadDocs();
  }, [selectedAppId]);

  // 3. Load Selected Conversation Messages
  const loadConversation = async (convId: string) => {
    setActiveConversationId(convId);
    try {
      const res = await apiClient.getAIConversation(convId);
      if (res.success && res.messages) {
        setMessages(res.messages);
      }
    } catch (err) {
      setErrorMessage('Failed to load conversation history.');
    }
  };

  // 4. Handle Starting New Conversation
  const handleNewConversation = () => {
    setActiveConversationId('');
    setMessages([]);
    setInputText('');
  };

  // 5. Handle Deleting Conversation
  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    try {
      const res = await apiClient.deleteAIConversation(convId);
      if (res.success) {
        setConversations((prev) => prev.filter((c) => c.conversationId !== convId));
        if (activeConversationId === convId) {
          handleNewConversation();
        }
      }
    } catch (err) {
      setErrorMessage('Failed to delete conversation.');
    }
  };

  // 6. Handle Send Chat Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const messageToSend = inputText.trim();
    setInputText('');
    setIsSending(true);
    setErrorMessage(null);

    // Optimistically show user message
    const optimisticUserMsg: AIMessageRecord = {
      _id: 'temp-' + Date.now(),
      conversationId: activeConversationId || 'pending',
      userId: 'current-user',
      role: 'user',
      content: messageToSend,
      citations: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);

    try {
      const res = await apiClient.chatWithAI({
        conversationId: activeConversationId || undefined,
        message: messageToSend,
        applicationId: selectedAppId || undefined,
        attachedDocumentIds: selectedDocIds,
      });

      if (res.success && res.message) {
        setActiveConversationId(res.conversationId);
        // Replace optimistic or append
        setMessages((prev) => [...prev.filter((m) => !m._id.startsWith('temp-')), optimisticUserMsg, res.message]);

        // Refresh conversation list if new
        if (!conversations.some((c) => c.conversationId === res.conversationId)) {
          setConversations((prev) => [res.conversation, ...prev]);
        }
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Failed to generate response. Please verify OPENAI_API_KEY in backend/.env.'
      );
      // Remove failed message or leave indication
    } finally {
      setIsSending(false);
    }
  };

  // 7. Handle Document Extraction & Structured Fields
  const handleExtractDocument = async () => {
    if (!selectedDocForExtraction) return;
    setIsExtracting(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.extractDocumentData(selectedDocForExtraction);
      if (res.success && res.fields) {
        setExtractedFields(res.fields);
        setSuccessMessage(res.message);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Extraction failed.');
    } finally {
      setIsExtracting(false);
    }
  };

  // 8. Handle Document Summarization
  const handleSummarizeDocument = async () => {
    if (!selectedDocForExtraction) return;
    setIsSummarizing(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.summarizeDocument(selectedDocForExtraction);
      if (res.success) {
        setDocumentSummary({ summary: res.summary, keyPoints: res.keyPoints });
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Summarization failed.');
    } finally {
      setIsSummarizing(false);
    }
  };

  // 9. Handle Preliminary Case Discrepancy Audit
  const handleRunEvidenceAudit = async () => {
    if (!selectedAppId) return;
    setIsAuditing(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.analyzeCaseEvidence(selectedAppId);
      if (res.success && res.findings) {
        setFindings(res.findings);
        setSuccessMessage(`Audit completed. ${res.findings.length} preliminary finding(s) detected.`);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Audit failed.');
    } finally {
      setIsAuditing(false);
    }
  };

  // 10. Confirm/Correct Field
  const handleReviewField = async (fieldId: string, status: 'confirmed' | 'corrected' | 'dismissed') => {
    try {
      const res = await apiClient.reviewExtractedField(fieldId, status);
      if (res.success) {
        setExtractedFields((prev) =>
          prev.map((f) => (f._id === fieldId ? { ...f, verificationStatus: status } : f))
        );
      }
    } catch (err) {
      setErrorMessage('Failed to update field status.');
    }
  };

  const selectedApp = applications.find((a) => a._id === selectedAppId);

  // Suggested Prompts based on Visa Category
  const getCategoryPrompts = () => {
    if (!selectedApp) return [];
    if (selectedApp.visaCategory === 'H-1B') {
      return [
        'Does my certified LCA prevailing wage meet Level 2 requirement?',
        'Summarize the specialty occupation job duties from my employer support letter.',
        'Which statutory evidence exhibits are missing from my H-1B case?',
      ];
    }
    if (selectedApp.visaCategory === 'O-1') {
      return [
        'Which of the 8 extraordinary ability criteria does my evidence satisfy?',
        'Summarize the key accolades in my expert recommendation letter.',
        'What evidence proves my critical role for an organization with distinguished reputation?',
      ];
    }
    if (selectedApp.visaCategory === 'EB-2-NIW') {
      return [
        'How does my proposed endeavor demonstrate substantial merit & national importance under Matter of Dhanasar?',
        'Summarize the independent expert evaluation of my research track record.',
        'What documentation establishes that waiving the job offer is in the U.S. national interest?',
      ];
    }
    return [
      'Summarize my highest academic degree and university transcripts.',
      'Check if my employment verification letters confirm 5+ years of progressive experience.',
      'What exhibits are required for an approved PERM ETA-9089 filing?',
    ];
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Context Switcher */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#172B4D] text-white flex items-center justify-center font-bold">
              <Bot className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-[#172B4D]">
              AI Legal Assistant &amp; Document Intelligence
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#627D98]">
            RAG-grounded legal assistant, OCR entity extraction, and preliminary evidentiary inconsistency audit.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Active Case Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-[#172B4D] whitespace-nowrap">Active Petition:</span>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[#202938] font-semibold focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
            >
              {applications.map((app) => (
                <option key={app._id} value={app._id}>
                  {app.title} ({app.visaCategory})
                </option>
              ))}
            </select>
          </div>

          <Badge variant="navy" size="sm">
            <Sparkles className="w-3 h-3 mr-1 text-[#38BDF8]" />
            GPT-4o Mini Verified
          </Badge>
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

      {/* 2. Workspace Tabs Navigation */}
      <div className="border-b border-[#E2E8F0] flex items-center space-x-2 text-xs">
        {[
          { id: 'chat', label: 'Conversational Dossier Assistant', icon: MessageSquare },
          { id: 'extractor', label: 'OCR & Structured Entity Extractor', icon: FileSearch },
          { id: 'findings', label: 'Preliminary Inconsistency Audit', icon: Scale },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveMode(tab.id as typeof activeMode)}
              className={`px-4 py-2.5 font-semibold flex items-center space-x-2 border-b-2 -mb-px transition-colors ${
                activeMode === tab.id
                  ? 'border-[#172B4D] text-[#172B4D]'
                  : 'border-transparent text-[#627D98] hover:text-[#172B4D]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          TAB 1: CONVERSATIONAL ASSISTANT (RAG GROUNDED)
          ========================================================================= */}
      {activeMode === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px]">
          {/* Left Column: Conversations Drawer (1/4) */}
          <div className="space-y-4">
            <Button
              onClick={handleNewConversation}
              className="w-full justify-center space-x-1.5 shadow-xs"
              size="md"
            >
              <Plus className="w-4 h-4" />
              <span>New Legal Inquiry</span>
            </Button>

            <Card padding="none" className="bg-white overflow-hidden shadow-sm">
              <div className="p-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-xs font-bold text-[#172B4D]">
                <span>Inquiry History</span>
                <Badge variant="neutral" size="sm">{conversations.length}</Badge>
              </div>

              <div className="divide-y divide-[#E2E8F0] max-h-[450px] overflow-y-auto">
                {conversations.length > 0 ? (
                  conversations.map((c) => (
                    <div
                      key={c.conversationId}
                      onClick={() => loadConversation(c.conversationId)}
                      className={`p-3 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        activeConversationId === c.conversationId
                          ? 'bg-[#F0F4F8] font-bold text-[#172B4D]'
                          : 'hover:bg-[#F8FAFC] text-[#486581]'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="block truncate">{c.title}</span>
                        <span className="text-[10px] text-[#829AB1]">
                          {new Date(c.lastMessageAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteConversation(c.conversationId, e)}
                        className="p-1 text-[#829AB1] hover:text-[#DC2626] rounded transition-colors"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-[#829AB1]">
                    No past inquiries yet.
                  </div>
                )}
              </div>
            </Card>

            {/* Attached Case Documents Picker */}
            <Card padding="sm" className="bg-white space-y-2">
              <span className="text-xs font-bold text-[#172B4D] block">
                Evidence Context ({selectedDocIds.length}/{availableDocs.length})
              </span>
              <p className="text-[11px] text-[#627D98]">
                Select which exhibits are loaded into the AI retrieval context:
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
                {availableDocs.map((doc) => (
                  <label
                    key={doc._id}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-[#F8FAFC] p-1.5 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(doc._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDocIds((prev) => [...prev, doc._id]);
                        } else {
                          setSelectedDocIds((prev) => prev.filter((id) => id !== doc._id));
                        }
                      }}
                      className="rounded border-[#CBD5E1] text-[#172B4D] focus:ring-[#172B4D]"
                    />
                    <span className="truncate text-[#172B4D]">{doc.title || doc.originalFilename}</span>
                  </label>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column: Chat Stream & Composer (3/4) */}
          <div className="lg:col-span-3 flex flex-col bg-white rounded-lg border border-[#E2E8F0] shadow-sm overflow-hidden h-[650px]">
            {/* Chat Messages Viewport */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#F8FAFC]">
              {messages.length === 0 ? (
                <div className="py-12 text-center space-y-4 max-w-lg mx-auto">
                  <div className="w-12 h-12 bg-[#F0F4F8] text-[#172B4D] rounded-full flex items-center justify-center mx-auto">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#172B4D]">
                      LegalTech Dossier Intelligence Assistant
                    </h3>
                    <p className="text-xs text-[#627D98] mt-1">
                      Ask regulatory questions regarding {selectedApp?.visaCategory || 'visa'} eligibility, or inquire about uploaded evidence.
                    </p>
                  </div>

                  {/* Category Suggested Inquiries */}
                  <div className="space-y-2 pt-2 text-left">
                    <span className="text-[11px] font-bold text-[#627D98] uppercase tracking-wider block text-center">
                      Suggested Inquiries for {selectedApp?.visaCategory}
                    </span>
                    <div className="space-y-1.5">
                      {getCategoryPrompts().map((promptText, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setInputText(promptText);
                          }}
                          className="w-full text-left p-2.5 bg-white border border-[#CBD5E1] hover:border-[#172B4D] rounded-lg text-xs text-[#172B4D] transition-colors flex items-center justify-between group"
                        >
                          <span>{promptText}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#829AB1] group-hover:text-[#172B4D]" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m._id}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-4 text-xs space-y-2.5 shadow-xs ${
                        m.role === 'user'
                          ? 'bg-[#172B4D] text-white'
                          : 'bg-white border border-[#E2E8F0] text-[#172B4D]'
                      }`}
                    >
                      <div className="flex items-center space-x-2 font-bold text-[11px] opacity-80">
                        {m.role === 'user' ? <span>Applicant</span> : <span>Legal Assistant</span>}
                        <span>•</span>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div className="leading-relaxed whitespace-pre-wrap font-sans text-xs">
                        {m.content}
                      </div>

                      {/* Render Grounded Citations if present */}
                      {m.citations && m.citations.length > 0 && (
                        <div className="pt-2 border-t border-[#E2E8F0] space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0284C7] block">
                            Grounded Evidentiary Sources:
                          </span>
                          <div className="space-y-1">
                            {m.citations.map((c, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-1.5 bg-[#F0F4F8] rounded text-[11px] text-[#172B4D]"
                              >
                                <div className="flex items-center space-x-1.5 truncate">
                                  <FileText className="w-3 h-3 text-[#0284C7] shrink-0" />
                                  <span className="font-semibold truncate">{c.documentName}</span>
                                </div>
                                <button
                                  onClick={() => setPreviewDocId(c.documentId)}
                                  className="text-[10px] text-[#0284C7] hover:underline shrink-0 ml-2 font-bold"
                                >
                                  Inspect Exhibit
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 text-xs flex items-center space-x-2 text-[#627D98] shadow-xs">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#172B4D]" />
                    <span>Analyzing petition documents &amp; formulating grounded legal answer...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-[#E2E8F0] flex items-center space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask about Matter of Dhanasar, prevailing wages, or your uploaded evidence..."
                disabled={isSending}
                className="flex-1 px-4 py-2 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
              />
              <Button
                type="submit"
                size="md"
                disabled={isSending || !inputText.trim()}
                className="space-x-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: OCR & STRUCTURED ENTITY EXTRACTOR
          ========================================================================= */}
      {activeMode === 'extractor' && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <span className="text-xs font-bold text-[#172B4D]">Select Exhibit:</span>
              <select
                value={selectedDocForExtraction}
                onChange={(e) => {
                  setSelectedDocForExtraction(e.target.value);
                  setDocumentSummary(null);
                  setExtractedFields([]);
                }}
                className="px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[#202938] font-medium"
              >
                {availableDocs.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.title || d.originalFilename} ({d.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                onClick={handleExtractDocument}
                disabled={isExtracting || !selectedDocForExtraction}
                className="space-x-1.5"
              >
                {isExtracting ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Running OCR &amp; Entity Parsing...</span>
                  </>
                ) : (
                  <>
                    <FileSearch className="w-3 h-3" />
                    <span>Run OCR &amp; Extract Fields</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSummarizeDocument}
                disabled={isSummarizing || !selectedDocForExtraction}
                className="space-x-1.5"
              >
                {isSummarizing ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Formulating Summary...</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-3 h-3" />
                    <span>Summarize Exhibit</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Summary Card if available */}
          {documentSummary && (
            <Card className="bg-[#F8FAFC] border-[#CBD5E1]">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-[#172B4D]" />
                  <CardTitle className="text-sm">Authoritative Exhibit Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-[#202938] leading-relaxed">
                <p className="bg-white p-3 rounded border border-[#E2E8F0]">
                  {documentSummary.summary}
                </p>
                {documentSummary.keyPoints.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-bold text-[#172B4D]">Key Evidentiary Points:</span>
                    <ul className="list-disc list-inside space-y-1 text-[#486581]">
                      {documentSummary.keyPoints.map((pt, idx) => (
                        <li key={idx}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Extracted Structured Fields Table */}
          <Card padding="none" className="bg-white shadow-sm overflow-hidden">
            <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-xs text-[#627D98]">
              <span className="font-semibold text-[#172B4D]">
                Structured Entity Fields ({extractedFields.length} extracted)
              </span>
              <span>Human-in-the-loop verification</span>
            </div>

            {extractedFields.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold text-[#486581] uppercase tracking-wider">
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Field Name</th>
                      <th className="py-3 px-4">Extracted Value</th>
                      <th className="py-3 px-4">Confidence</th>
                      <th className="py-3 px-4">Verification</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {extractedFields.map((f) => (
                      <tr key={f._id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 capitalize font-semibold text-[#172B4D]">{f.category}</td>
                        <td className="py-3 px-4 font-mono text-[#0284C7]">{f.fieldName}</td>
                        <td className="py-3 px-4 font-medium text-[#172B4D]">{f.fieldValue}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-[11px]">
                            {(f.confidence * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              f.verificationStatus === 'confirmed'
                                ? 'success'
                                : f.verificationStatus === 'corrected'
                                ? 'navy'
                                : 'warning'
                            }
                            size="sm"
                          >
                            {f.verificationStatus}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleReviewField(f._id, 'confirmed')}
                              className="p-1 text-[#16A34A] hover:bg-[#DCFCE7] rounded"
                              title="Confirm value"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleReviewField(f._id, 'dismissed')}
                              className="p-1 text-[#DC2626] hover:bg-[#FEE2E2] rounded"
                              title="Dismiss field"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#829AB1] space-y-2">
                <FileSearch className="w-8 h-8 text-[#CBD5E1] mx-auto" />
                <p>No fields extracted for this document yet.</p>
                <p className="text-[11px]">Click "Run OCR &amp; Extract Fields" to parse identity, education, or wage records.</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 3: PRELIMINARY INCONSISTENCY AUDIT
          ========================================================================= */}
      {activeMode === 'findings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#172B4D] block">
                Evidence Discrepancy &amp; Consistency Engine
              </span>
              <p className="text-[11px] text-[#627D98]">
                Audits cross-document fields for name spelling variations, date overlaps, and statutory wage thresholds.
              </p>
            </div>
            <Button
              onClick={handleRunEvidenceAudit}
              disabled={isAuditing}
              className="space-x-1.5"
              size="sm"
            >
              {isAuditing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Auditing Dossier...</span>
                </>
              ) : (
                <>
                  <Scale className="w-3 h-3" />
                  <span>Execute Evidence Audit</span>
                </>
              )}
            </Button>
          </div>

          <div className="space-y-3">
            {findings.length > 0 ? (
              findings.map((finding) => (
                <div
                  key={finding._id}
                  className="p-4 bg-white border border-[#E2E8F0] rounded-lg shadow-xs flex items-start justify-between gap-4"
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        finding.severity === 'high' || finding.severity === 'critical'
                          ? 'bg-[#FEE2E2] text-[#DC2626]'
                          : 'bg-[#FEF3C7] text-[#D97706]'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-[#172B4D]">{finding.title}</span>
                        <Badge
                          variant={finding.severity === 'high' ? 'error' : 'warning'}
                          size="sm"
                        >
                          {finding.severity}
                        </Badge>
                        <Badge variant="neutral" size="sm">{finding.status}</Badge>
                      </div>
                      <p className="text-xs text-[#486581] leading-relaxed">
                        {finding.explanation}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await apiClient.reviewFinding(finding._id, 'resolved');
                        setFindings((prev) =>
                          prev.map((f) => (f._id === finding._id ? { ...f, status: 'resolved' } : f))
                        );
                      }}
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center bg-white rounded-lg border border-[#E2E8F0] space-y-2 text-xs text-[#829AB1]">
                <Scale className="w-8 h-8 text-[#CBD5E1] mx-auto" />
                <p className="font-semibold text-[#172B4D]">No active inconsistency findings.</p>
                <p className="text-[11px]">Click "Execute Evidence Audit" to run cross-document field validation.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: INLINE CITATION PREVIEW
          ========================================================================= */}
      {previewDocId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in">
            <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
              <span className="text-xs font-bold text-[#172B4D]">Grounded Source Exhibit Preview</span>
              <button
                onClick={() => setPreviewDocId(null)}
                className="text-[#829AB1] hover:text-[#172B4D] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 bg-[#F1F5F9] p-4">
              <iframe
                src={apiClient.getPreviewUrl(previewDocId)}
                className="w-full h-full rounded border border-[#CBD5E1] bg-white"
                title="Grounded Citation Document"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs text-[#627D98]">Loading AI Assistant...</div>}>
      <AssistantContent />
    </Suspense>
  );
}
