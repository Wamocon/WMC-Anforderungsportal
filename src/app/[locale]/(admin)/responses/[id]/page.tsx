'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import {
  ArrowLeft,
  Loader2,
  User,
  Calendar,
  FileText,
  Bot,
  Download,
  Sparkles,
  Send,
  Mic,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type ResponseDetail = {
  id: string;
  project_id: string;
  respondent_name: string | null;
  respondent_email: string;
  status: string;
  progress_percent: number;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  template_id: string;
};

type AnswerRow = {
  id: string;
  question_id: string;
  value: unknown;
  voice_transcript: string | null;
  ai_clarification: string | null;
};

type QuestionRow = {
  id: string;
  section_id: string;
  type: string;
  label: Record<string, string>;
  order_index: number;
  is_required: boolean;
  options: unknown;
};

type SectionRow = {
  id: string;
  title: Record<string, string>;
  order_index: number;
};

export default function ResponseDetailPage() {
  const t = useTranslations();
  const locale = useLocale();
  const params = useParams();
  const responseId = params.id as string;

  const [response, setResponse] = useState<ResponseDetail | null>(null);
  const [projectName, setProjectName] = useState('');
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [followUpText, setFollowUpText] = useState('');
  const [sendingFollowUp, setSendingFollowUp] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.refreshSession();

    const { data: resp } = await supabase
      .from('responses')
      .select('*')
      .eq('id', responseId)
      .single();

    if (!resp) {
      setLoading(false);
      return;
    }

    setResponse(resp as ResponseDetail);

    const [
      { data: projData },
      { data: ansData },
      { data: secData },
      { data: qData },
    ] = await Promise.all([
      supabase.from('projects').select('name').eq('id', resp.project_id).single(),
      supabase.from('response_answers').select('*').eq('response_id', responseId),
      supabase.from('template_sections').select('*').eq('template_id', resp.template_id).order('order_index'),
      supabase.from('template_questions').select('*'),
    ]);

    setProjectName(projData?.name ?? '');
    setAnswers((ansData ?? []) as AnswerRow[]);
    setSections((secData ?? []) as SectionRow[]);

    const sectionIds = new Set((secData ?? []).map((s) => s.id));
    setQuestions(
      ((qData ?? []) as QuestionRow[])
        .filter((q) => sectionIds.has(q.section_id))
        .sort((a, b) => a.order_index - b.order_index)
    );

    setLoading(false);
  }, [responseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function getLabel(obj: Record<string, string> | string | null): string {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[locale] || obj['en'] || obj['de'] || Object.values(obj)[0] || '';
  }

  function formatValue(val: unknown): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'string') {
      // Check if it's a JSON file attachment array
      if (val.startsWith('[{') && val.includes('"path"')) return '';
      return val || '—';
    }
    if (Array.isArray(val)) return val.join(', ') || '—';
    if (typeof val === 'object') {
      const v = val as Record<string, unknown>;
      return v.text as string || JSON.stringify(val);
    }
    return String(val);
  }

  type FileAttachment = { name: string; size: number; type: string; path: string; url?: string };

  function parseFileAttachments(val: unknown): FileAttachment[] | null {
    if (!val) return null;
    const str = typeof val === 'string' ? val : JSON.stringify(val);
    if (!str.startsWith('[{') || !str.includes('"path"')) return null;
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].path) {
        return parsed as FileAttachment[];
      }
    } catch { /* not a file array */ }
    return null;
  }

  function getFileIcon(type: string) {
    if (type.startsWith('image/')) return ImageIcon;
    return FileText;
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async function getSignedUrl(path: string): Promise<string | null> {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from('response-attachments')
      .createSignedUrl(path, 60 * 60); // 1 hour
    return data?.signedUrl || null;
  }

  async function downloadFile(attachment: FileAttachment) {
    const url = await getSignedUrl(attachment.path);
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.error('Could not generate download link');
    }
  }

  const FILE_EXT_REGEX = /\.(docx?|xlsx?|pptx?|pdf|txt|csv|png|jpe?g|gif|webp|svg|zip|rar)$/i;

  function detectFilenameInText(val: unknown): string | null {
    if (!val || typeof val !== 'string') return null;
    const trimmed = val.trim();
    if (FILE_EXT_REGEX.test(trimmed)) return trimmed;
    // Check if any word in the text looks like a filename
    const words = trimmed.split(/\s+/);
    for (const word of words) {
      if (FILE_EXT_REGEX.test(word) && word.length > 4) return word;
    }
    return null;
  }

  function getFileTypeLabel(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
      doc: 'Word', docx: 'Word', pdf: 'PDF', xls: 'Excel', xlsx: 'Excel',
      ppt: 'PowerPoint', pptx: 'PowerPoint', txt: 'Text', csv: 'CSV',
      png: 'Image', jpg: 'Image', jpeg: 'Image', gif: 'Image', webp: 'Image',
      zip: 'Archive', rar: 'Archive',
    };
    return map[ext] || 'File';
  }

  function getFileTypeColor(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['doc', 'docx'].includes(ext)) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (ext === 'pdf') return 'bg-red-50 text-red-600 border-red-200';
    if (['xls', 'xlsx'].includes(ext)) return 'bg-green-50 text-green-700 border-green-200';
    if (['ppt', 'pptx'].includes(ext)) return 'bg-orange-50 text-orange-600 border-orange-200';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'bg-purple-50 text-purple-600 border-purple-200';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  }

  async function generateAiSummary() {
    setSummaryLoading(true);
    try {
      const answerMap = new Map(answers.map((a) => [a.question_id, a]));
      const summaryData = sections.map((sec) => {
        const sQuestions = questions.filter((q) => q.section_id === sec.id);
        return {
          section: getLabel(sec.title),
          items: sQuestions.map((q) => ({
            question: getLabel(q.label),
            answer: formatValue(answerMap.get(q.id)?.value),
            voiceTranscript: answerMap.get(q.id)?.voice_transcript || null,
          })),
        };
      });

      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseData: summaryData,
          projectName,
          respondentName: response?.respondent_name || response?.respondent_email,
          locale,
        }),
      });

      if (!res.ok) throw new Error('Failed');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No body');

      const decoder = new TextDecoder();
      let content = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setAiSummary(content);
      }
    } catch {
      toast.error('Failed to generate AI summary');
    } finally {
      setSummaryLoading(false);
    }
  }

  async function sendFollowUp() {
    if (!followUpText.trim() || !response) return;
    setSendingFollowUp(true);
    try {
      const supabase = createClient();
      // Store follow-up as ai_conversation message
      const { data: existing } = await supabase
        .from('ai_conversations')
        .select('id, messages')
        .eq('response_id', responseId)
        .single();

      const followUpMsg = {
        role: 'system',
        content: `[Manager Follow-Up Request] ${followUpText.trim()}`,
        timestamp: new Date().toISOString(),
      };

      if (existing) {
        const msgs = Array.isArray(existing.messages) ? existing.messages : [];
        await supabase
          .from('ai_conversations')
          .update({ messages: [...msgs, followUpMsg] })
          .eq('id', existing.id);
      } else {
        await supabase.from('ai_conversations').insert({
          response_id: responseId,
          messages: [followUpMsg],
        });
      }

      toast.success('Follow-up request sent');
      setFollowUpText('');
    } catch {
      toast.error('Failed to send follow-up');
    } finally {
      setSendingFollowUp(false);
    }
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    submitted: 'bg-green-100 text-green-800',
    reviewed: 'bg-purple-100 text-purple-800',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Response not found</h2>
        <Link href="/responses">
          <Button variant="outline">Back to Responses</Button>
        </Link>
      </div>
    );
  }

  const answerMap = new Map(answers.map((a) => [a.question_id, a]));

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/responses">
          <Button variant="ghost" size="icon" className="mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">
              {response.respondent_name || response.respondent_email}
            </h1>
            <Badge className={statusColors[response.status] || ''}>
              {response.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {projectName} · {response.respondent_email}
          </p>
        </div>
        <Button variant="outline" className="gap-2 shrink-0" onClick={() => {
          const data = sections.map(sec => ({
            section: getLabel(sec.title),
            questions: questions.filter(q => q.section_id === sec.id).map(q => {
              const a = answerMap.get(q.id);
              return { question: getLabel(q.label), answer: a ? formatValue(a.value) : 'No answer' };
            }),
          }));
          const text = data.map(s => `## ${s.section}\n${s.questions.map(q => `**${q.question}**\n${q.answer}`).join('\n\n')}`).join('\n\n---\n\n');
          const blob = new Blob([`# Response: ${response.respondent_name || response.respondent_email}\n\n${text}`], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `response-${responseId.slice(0,8)}.md`;
          a.click(); URL.revokeObjectURL(url);
        }}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Respondent</p>
              <p className="text-sm font-medium">{response.respondent_name || '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Progress</p>
              <p className="text-sm font-medium">{response.progress_percent}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Submitted</p>
              <p className="text-sm font-medium">
                {response.submitted_at
                  ? new Date(response.submitted_at).toLocaleDateString('de-DE')
                  : 'Not yet'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Answers</p>
              <p className="text-sm font-medium">{answers.length} / {questions.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Answers by Section */}
      {sections.map((sec) => {
        const sQuestions = questions.filter((q) => q.section_id === sec.id);
        if (sQuestions.length === 0) return null;

        return (
          <Card key={sec.id} className="border-0 shadow-md shadow-black/5">
            <CardHeader className="bg-muted/30 rounded-t-xl">
              <CardTitle className="text-lg">{getLabel(sec.title)}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {sQuestions.map((q) => {
                const answer = answerMap.get(q.id);
                const fileAttachments = answer ? parseFileAttachments(answer.value) : null;
                return (
                  <div key={q.id} className="py-4 first:pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          {getLabel(q.label)}
                          {q.is_required && (
                            <span className="text-[#FE0404] ml-1">*</span>
                          )}
                        </p>

                        {/* File attachments */}
                        {fileAttachments && fileAttachments.length > 0 ? (
                          <div className="space-y-2 mt-2">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                              <Paperclip className="h-3 w-3" />
                              {fileAttachments.length} attachment{fileAttachments.length > 1 ? 's' : ''}
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {fileAttachments.map((file, idx) => {
                                const isImage = file.type.startsWith('image/');
                                const Icon = getFileIcon(file.type);
                                return (
                                  <div
                                    key={idx}
                                    className="group relative flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 hover:bg-muted/40 transition-colors cursor-pointer"
                                    onClick={() => downloadFile(file)}
                                  >
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${
                                      isImage ? 'bg-blue-50 text-blue-600' :
                                      file.type.includes('pdf') ? 'bg-red-50 text-red-600' :
                                      file.type.includes('word') || file.type.includes('document') ? 'bg-blue-50 text-blue-700' :
                                      file.type.includes('sheet') || file.type.includes('excel') ? 'bg-green-50 text-green-700' :
                                      file.type.includes('presentation') || file.type.includes('powerpoint') ? 'bg-orange-50 text-orange-600' :
                                      'bg-gray-50 text-gray-600'
                                    }`}>
                                      <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{file.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatFileSize(file.size)}
                                        {' · '}
                                        {isImage ? 'Image' :
                                         file.type.includes('pdf') ? 'PDF' :
                                         file.type.includes('word') || file.type.includes('document') ? 'Word' :
                                         file.type.includes('sheet') || file.type.includes('excel') ? 'Excel' :
                                         file.type.includes('presentation') || file.type.includes('powerpoint') ? 'PowerPoint' :
                                         'Document'}
                                      </p>
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          (() => {
                            const answerText = answer ? formatValue(answer.value) : null;
                            const detectedFile = answerText ? detectFilenameInText(answerText) : null;
                            
                            if (detectedFile) {
                              const typeLabel = getFileTypeLabel(detectedFile);
                              const colorClass = getFileTypeColor(detectedFile);
                              return (
                                <div className="space-y-2">
                                  <p className="text-base">{answerText}</p>
                                  <div className={`flex items-center gap-3 rounded-lg border p-3 ${colorClass}`}>
                                    <FileText className="h-5 w-5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{detectedFile}</p>
                                      <p className="text-xs opacity-75">{typeLabel} · Referenced but not uploaded</p>
                                    </div>
                                    <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-xs shrink-0 gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      Missing
                                    </Badge>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <p className="text-base">
                                {answer ? answerText : (
                                  <span className="text-muted-foreground italic">No answer provided</span>
                                )}
                              </p>
                            );
                          })()
                        )}
                        {answer?.voice_transcript && (
                          <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-2">
                            <Mic className="h-4 w-4 shrink-0 mt-0.5" />
                            <span className="italic">{answer.voice_transcript}</span>
                          </div>
                        )}
                        {answer?.ai_clarification && (
                          <div className="mt-2 flex items-start gap-2 text-sm bg-[#FE0404]/5 rounded-lg p-2">
                            <Bot className="h-4 w-4 shrink-0 mt-0.5 text-[#FE0404]" />
                            <span>{answer.ai_clarification}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* AI Summary */}
      <Card className="border-0 shadow-md shadow-black/5">
        <CardHeader className="bg-gradient-to-r from-[#FE0404]/5 to-transparent">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#FE0404]" />
              AI Executive Summary
            </CardTitle>
            <Button
              onClick={generateAiSummary}
              disabled={summaryLoading}
              className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2"
              size="sm"
            >
              {summaryLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {aiSummary ? 'Regenerate' : 'Generate Summary'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {aiSummary ? (
            <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-h2:text-base prose-h2:mt-6 prose-h2:mb-3 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border/50 prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-2 prose-p:text-sm prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-sm prose-li:text-muted-foreground prose-strong:text-foreground prose-strong:font-medium prose-ul:my-2 prose-ol:my-2 prose-table:w-full prose-table:text-sm prose-th:bg-muted/50 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-medium prose-th:text-foreground prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-border/40">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiSummary}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Click "Generate Summary" to get an AI-powered executive summary of this response for your development team.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Follow-up Request */}
      <Card className="border-0 shadow-md shadow-black/5">
        <CardHeader>
          <CardTitle className="text-lg">Request Follow-up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Need more information from the client? Send a follow-up request that will be shown to them when they revisit the form.
          </p>
          <div className="flex gap-2">
            <Textarea
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              placeholder="e.g., Could you clarify the user roles section? We need specific permission levels..."
              rows={2}
              className="flex-1"
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={sendFollowUp}
              disabled={!followUpText.trim() || sendingFollowUp}
              className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2"
              size="sm"
            >
              {sendingFollowUp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send Follow-up
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Link href="/responses">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Responses
          </Button>
        </Link>
        {response.status === 'submitted' && (
          <Button
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
            onClick={async () => {
              const supabase = createClient();
              await supabase
                .from('responses')
                .update({ status: 'reviewed' })
                .eq('id', responseId);
              toast.success('Response marked as reviewed');
              loadData();
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark as Reviewed
          </Button>
        )}
      </div>
    </div>
  );
}
