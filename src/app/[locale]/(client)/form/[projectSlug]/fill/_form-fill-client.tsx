'use client';

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/language-switcher';
import { VoiceRecorder } from '@/components/voice/voice-recorder';
import { WmcLogo } from '@/components/wmc-logo';
import { Link, useRouter } from '@/i18n/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Upload,
  Bot,
  Sparkles,
  X,
  Send,
  Loader2,
  MessageSquare,
  SkipForward,
  Clock,
  Paperclip,
  FileText,
  Image,
  File,
} from 'lucide-react';

export type QuestionType = 'text' | 'textarea' | 'radio' | 'multi_select' | 'checkbox' | 'file' | 'date' | 'select' | 'voice' | 'rating';

export type Question = {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options?: string[];
};

export type Section = {
  id: string;
  title: string;
  questions: Question[];
};

type Answer = string | string[] | null;

type FollowUp = {
  question: string;
  answer: string;
  loading: boolean;
  dismissed: boolean;
};

type ChatMessage = {
  role: 'assistant' | 'user';
  content: string;
};

export function FormFillClient({
  sections,
  projectSlug,
  projectName,
  locale,
  initialResponseId,
  initialAnswers,
}: {
  sections: Section[];
  projectSlug: string;
  projectName: string;
  locale: string;
  initialResponseId?: string | null;
  initialAnswers?: Record<string, unknown>;
}) {
  const t = useTranslations();
  const router = useRouter();

  // Compute initial section: find the first section with unanswered questions
  const computeInitialSection = () => {
    if (!initialAnswers || Object.keys(initialAnswers).length === 0) return 0;
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const allAnswered = sec.questions.every((q) => {
        const a = initialAnswers[q.id];
        return a !== null && a !== undefined && a !== '' && (!Array.isArray(a) || a.length > 0);
      });
      if (!allAnswered) return i;
    }
    // All sections complete — show last section
    return sections.length - 1;
  };

  const [currentSection, setCurrentSection] = useState(computeInitialSection);
  const [answers, setAnswers] = useState<Record<string, Answer>>((initialAnswers ?? {}) as Record<string, Answer>);
  const [followUps, setFollowUps] = useState<Record<string, FollowUp>>({});
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [answerLater, setAnswerLater] = useState<Set<string>>(new Set());
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { name: string; size: number; type: string; path?: string; url?: string; uploading?: boolean }[]>>({});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const followUpRequestedRef = useRef<Set<string>>(new Set());
  const responseIdRef = useRef<string | null>(initialResponseId ?? null);

  // AI Chat assistant state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hi! I'm your AI requirements assistant for "${projectName}". If you need help with any question or want to discuss your requirements, just ask me here.`,
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [dynamicQuestions, setDynamicQuestions] = useState<Record<string, Question[]>>({});
  const dynamicRequestedRef = useRef<Set<number>>(new Set());

  const section = sections[currentSection];
  const totalSections = sections.length;
  const allQuestions = sections.flatMap(s => [...s.questions, ...(dynamicQuestions[s.id] || [])]);
  const totalQuestions = allQuestions.length;
  const answeredQuestions = allQuestions.filter((q) => {
    const a = answers[q.id];
    return a !== null && a !== undefined && a !== '' && (!Array.isArray(a) || a.length > 0);
  }).length;
  const progress = Math.round((answeredQuestions / Math.max(1, totalQuestions)) * 100);

  // Request AI dynamic questions when leaving a section
  async function requestDynamicQuestions(sectionIdx: number) {
    if (dynamicRequestedRef.current.has(sectionIdx)) return;
    const sec = sections[sectionIdx];
    const sectionAnswered = sec.questions.filter(q => {
      const a = answers[q.id];
      return a && String(a).trim().length > 0;
    }).length;
    if (sectionAnswered < 2) return; // need at least 2 answers
    dynamicRequestedRef.current.add(sectionIdx);

    try {
      const res = await fetch('/api/ai/dynamic-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: Object.fromEntries(sec.questions.filter(q => answers[q.id]).map(q => [q.label, answers[q.id]])),
          existingQuestions: sec.questions.map(q => q.label),
          locale,
        }),
      });
      const data = await res.json();
      if (data.questions?.length > 0) {
        const newQs: Question[] = data.questions.map((q: { label: string; type?: string; options?: string[] }, i: number) => ({
          id: `dynamic-${sec.id}-${i}-${Date.now()}`,
          type: (q.type || 'text') as QuestionType,
          label: q.label,
          required: false,
          options: q.options,
        }));
        setDynamicQuestions(prev => ({ ...prev, [sec.id]: [...(prev[sec.id] || []), ...newQs] }));
      }
    } catch { /* ignore */ }
  }

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await fetch('/api/form/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            responseId: responseIdRef.current,
            projectSlug,
            answers,
            followUps,
          }),
        });
        const data = await res.json();
        if (data.responseId && !responseIdRef.current) {
          responseIdRef.current = data.responseId;
        }
        setLastSaved(new Date());
      } catch {
        // Silent fail for auto-save
      } finally {
        setSaving(false);
      }
    }, 1500);
  }, [projectSlug, answers, followUps]);

  function updateAnswer(questionId: string, value: Answer) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    debouncedSave();
  }

  function toggleMultiSelect(questionId: string, option: string) {
    setAnswers((prev) => {
      const current = (prev[questionId] as string[]) || [];
      const updated = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [questionId]: updated };
    });
    debouncedSave();
  }

  // AI Follow-up: triggered on blur of text/textarea fields
  async function requestFollowUp(questionId: string, questionLabel: string) {
    const answer = answers[questionId];
    if (!answer || typeof answer !== 'string' || answer.trim().length < 5) return;
    if (followUpRequestedRef.current.has(questionId + ':' + answer)) return;
    followUpRequestedRef.current.add(questionId + ':' + answer);

    setFollowUps((prev) => ({
      ...prev,
      [questionId]: { question: '', answer: '', loading: true, dismissed: false },
    }));

    try {
      const res = await fetch('/api/ai/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionLabel, userAnswer: answer, locale }),
      });
      const data = await res.json();

      if (data.followUp) {
        setFollowUps((prev) => ({
          ...prev,
          [questionId]: { question: data.followUp, answer: '', loading: false, dismissed: false },
        }));
      } else {
        // No follow-up needed
        setFollowUps((prev) => {
          const copy = { ...prev };
          delete copy[questionId];
          return copy;
        });
      }
    } catch {
      setFollowUps((prev) => {
        const copy = { ...prev };
        delete copy[questionId];
        return copy;
      });
    }
  }

  function dismissFollowUp(questionId: string) {
    setFollowUps((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], dismissed: true },
    }));
  }

  function updateFollowUpAnswer(questionId: string, value: string) {
    setFollowUps((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], answer: value },
    }));
    debouncedSave();
  }

  function skipQuestion(questionId: string) {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }

  function toggleAnswerLater(questionId: string) {
    setAnswerLater((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }

  function handleFileUpload(questionId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'text/plain',
    ];
    const validFiles = Array.from(files).filter(
      (f) => allowed.includes(f.type) && f.size <= 10 * 1024 * 1024
    );

    // Upload each file to storage
    validFiles.forEach(async (file) => {
      // Add placeholder with uploading state
      const tempEntry = { name: file.name, size: file.size, type: file.type, uploading: true };
      setUploadedFiles((prev) => ({
        ...prev,
        [questionId]: [...(prev[questionId] || []), tempEntry],
      }));

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('questionId', questionId);
        formData.append('projectSlug', projectSlug);
        if (responseIdRef.current) {
          formData.append('responseId', responseIdRef.current);
        }

        const res = await fetch('/api/form/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (data.success && data.file) {
          setUploadedFiles((prev) => {
            const current = prev[questionId] || [];
            return {
              ...prev,
              [questionId]: current.map((f) =>
                f.name === file.name && f.uploading
                  ? { name: data.file.name, size: data.file.size, type: data.file.type, path: data.file.path, url: data.file.url, uploading: false }
                  : f
              ),
            };
          });

          // Update answer with file metadata array
          setUploadedFiles((prev) => {
            const finalFiles = prev[questionId] || [];
            const fileData = finalFiles
              .filter((f) => !f.uploading && f.path)
              .map((f) => ({ name: f.name, size: f.size, type: f.type, path: f.path, url: f.url }));
            updateAnswer(questionId, JSON.stringify(fileData));
            return prev;
          });
        } else {
          // Remove failed upload
          setUploadedFiles((prev) => ({
            ...prev,
            [questionId]: (prev[questionId] || []).filter(
              (f) => !(f.name === file.name && f.uploading)
            ),
          }));
        }
      } catch {
        setUploadedFiles((prev) => ({
          ...prev,
          [questionId]: (prev[questionId] || []).filter(
            (f) => !(f.name === file.name && f.uploading)
          ),
        }));
      }
    });

    // Reset the input
    e.target.value = '';
  }

  function removeFile(questionId: string, index: number) {
    setUploadedFiles((prev) => ({
      ...prev,
      [questionId]: (prev[questionId] || []).filter((_, i) => i !== index),
    }));
  }

  function getFileIcon(type: string) {
    if (type.startsWith('image/')) return Image;
    return FileText;
  }

  // AI Chat
  async function sendChatMessage() {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      // Build context from current answers
      const contextSummary = sections
        .map((s) => {
          const qAnswers = s.questions
            .filter((q) => answers[q.id])
            .map((q) => `  Q: ${q.label}\n  A: ${answers[q.id]}`)
            .join('\n');
          return qAnswers ? `${s.title}:\n${qAnswers}` : null;
        })
        .filter(Boolean)
        .join('\n\n');

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...(contextSummary
              ? [{ role: 'user' as const, content: `[Context: Client's answers so far]\n${contextSummary}` }]
              : []),
            ...chatMessages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: chatInput.trim() },
          ],
          locale,
        }),
      });

      if (!response.ok) throw new Error('Failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No body');

      const decoder = new TextDecoder();
      let content = '';
      setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setChatMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content };
          return copy;
        });
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Sorry, I couldn't process that. Please try again." },
      ]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }

  if (!section) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No questions found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/">
            <WmcLogo size="sm" />
          </Link>

          <div className="flex items-center gap-3 text-sm">
            <Badge variant="secondary" className="gap-1.5 text-xs">
              <Sparkles className="h-3 w-3 text-[#FE0404]" />
              AI-Assisted
            </Badge>
            {saving ? (
              <span className="text-muted-foreground animate-pulse text-xs">
                {t('form.saving')}
              </span>
            ) : lastSaved ? (
              <span className="text-muted-foreground text-xs">
                {t('form.autoSaved')}
              </span>
            ) : null}
            <LanguageSwitcher />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="container mx-auto px-4 pb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>
              {t('form.sectionOf', {
                current: String(currentSection + 1),
                total: String(totalSections),
              })}
            </span>
            <span>{t('form.progressPercent', { percent: String(progress) })}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </header>

      {/* Section Navigation (pills) */}
      <div className="border-b border-border/40 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {sections.map((s, idx) => {
              const allSectionQs = [...s.questions, ...(dynamicQuestions[s.id] || [])];
              const sectionAnswered = allSectionQs.filter((q) => {
                const a = answers[q.id];
                return a !== null && a !== undefined && a !== '' && (!Array.isArray(a) || a.length > 0);
              }).length;
              const isComplete = sectionAnswered === allSectionQs.length && allSectionQs.length > 0;

              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentSection(idx)}
                  className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    idx === currentSection
                      ? 'bg-[#FE0404] text-white'
                      : isComplete
                        ? 'bg-green-100 text-green-800'
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {isComplete && idx !== currentSection ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <span className="text-xs">{idx + 1}</span>
                  )}
                  <span className="hidden sm:inline">{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{section.title}</h2>
          <p className="text-muted-foreground mt-1">
            {section.questions.filter((q) => q.required).length} required questions
            <span className="mx-2">·</span>
            <span className="text-xs inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              AI will ask follow-ups if needed
            </span>
          </p>
        </div>

        <div className="space-y-6">
          {[...section.questions, ...(dynamicQuestions[section.id] || [])].map((question) => {
            const isSkipped = skipped.has(question.id);
            const isLater = answerLater.has(question.id);
            const files = uploadedFiles[question.id] || [];

            return (
            <div key={question.id} className={`space-y-2 ${isSkipped ? 'opacity-50' : ''} ${isLater ? 'border-l-4 border-amber-400 pl-3' : ''}`}>
              {/* Main Question Card */}
              <Card className="border-0 shadow-md shadow-black/5 bg-white/80 backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-black/10">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <Label className="text-base font-medium flex items-center gap-2">
                      {question.label}
                      {question.required ? (
                        <Badge variant="outline" className="text-[#FE0404] border-[#FE0404]/30 text-xs">
                          {t('common.required')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-xs">
                          Optional
                        </Badge>
                      )}
                      {isLater && (
                        <Badge className="bg-amber-100 text-amber-800 text-xs gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          Later
                        </Badge>
                      )}
                    </Label>
                  </div>

                  {!isSkipped && !isLater && (
                    <>
                      {question.type === 'text' && (
                        <div className="flex gap-2">
                          <Input
                            value={(answers[question.id] as string) || ''}
                            onChange={(e) => updateAnswer(question.id, e.target.value)}
                            onBlur={() => requestFollowUp(question.id, question.label)}
                            placeholder="Your answer..."
                          />
                          <VoiceRecorder
                            onTranscript={(text) =>
                              updateAnswer(question.id, ((answers[question.id] as string) || '') + ' ' + text)
                            }
                          />
                        </div>
                      )}

                      {question.type === 'textarea' && (
                        <div className="space-y-2">
                          <Textarea
                            value={(answers[question.id] as string) || ''}
                            onChange={(e) => updateAnswer(question.id, e.target.value)}
                            onBlur={() => requestFollowUp(question.id, question.label)}
                            placeholder="Your answer..."
                            rows={4}
                          />
                          <div className="flex justify-end">
                            <VoiceRecorder
                              onTranscript={(text) =>
                                updateAnswer(question.id, ((answers[question.id] as string) || '') + ' ' + text)
                              }
                            />
                          </div>
                        </div>
                      )}

                      {question.type === 'radio' && question.options && (
                        <RadioGroup
                          value={(answers[question.id] as string) || ''}
                          onValueChange={(v) => updateAnswer(question.id, v)}
                          className="space-y-2"
                        >
                          {question.options.map((option) => (
                            <div
                              key={option}
                              className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                            >
                              <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                              <Label htmlFor={`${question.id}-${option}`} className="cursor-pointer flex-1">
                                {option}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}

                      {(question.type === 'multi_select' || question.type === 'checkbox') &&
                        question.options && (
                          <div className="space-y-2">
                            {question.options.map((option) => {
                              const selected = ((answers[question.id] as string[]) || []).includes(option);
                              return (
                                <div
                                  key={option}
                                  onClick={() => toggleMultiSelect(question.id, option)}
                                  className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                                    selected ? 'border-[#FE0404]/30 bg-[#FE0404]/5' : 'hover:bg-accent/50'
                                  }`}
                                >
                                  <Checkbox checked={selected} />
                                  <Label className="cursor-pointer flex-1">{option}</Label>
                                </div>
                              );
                            })}
                          </div>
                        )}

                      {question.type === 'date' && (
                        <Input
                          type="date"
                          value={(answers[question.id] as string) || ''}
                          onChange={(e) => updateAnswer(question.id, e.target.value)}
                        />
                      )}

                      {question.type === 'file' && (
                        <div className="space-y-3">
                          <label className="border-2 border-dashed rounded-xl p-6 text-center hover:border-[#FE0404]/30 transition-colors cursor-pointer block">
                            <input
                              type="file"
                              className="hidden"
                              multiple
                              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.txt"
                              onChange={(e) => handleFileUpload(question.id, e)}
                            />
                            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Drop files here or click to upload
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              PDF, Word, PowerPoint, Excel, Images (max 10MB each)
                            </p>
                          </label>
                          {files.length > 0 && (
                            <div className="space-y-2">
                              {files.map((file, idx) => {
                                const FileIcon = getFileIcon(file.type);
                                return (
                                  <div key={idx} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                                    {file.uploading ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-[#FE0404] shrink-0" />
                                    ) : (
                                      <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                    )}
                                    <span className="truncate flex-1">{file.name}</span>
                                    <span className="text-xs text-muted-foreground shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                                    {file.uploading ? (
                                      <span className="text-xs text-[#FE0404] animate-pulse">Uploading...</span>
                                    ) : (
                                      <button onClick={() => removeFile(question.id, idx)} className="text-muted-foreground hover:text-destructive">
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Attach document to any text/textarea question */}
                      {(question.type === 'text' || question.type === 'textarea') && (
                        <div className="mt-2">
                          <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                            <Paperclip className="h-3 w-3" />
                            Attach document
                            <input
                              type="file"
                              className="hidden"
                              multiple
                              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.txt"
                              onChange={(e) => handleFileUpload(question.id, e)}
                            />
                          </label>
                          {files.length > 0 && (
                            <div className="mt-2 flex gap-2 flex-wrap">
                              {files.map((file, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs">
                                  <File className="h-3 w-3" />
                                  {file.name}
                                  <button onClick={() => removeFile(question.id, idx)} className="text-muted-foreground hover:text-destructive ml-1">
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {isSkipped && (
                    <p className="text-sm text-muted-foreground italic">
                      Skipped — <button onClick={() => skipQuestion(question.id)} className="text-[#FE0404] hover:underline">undo</button>
                    </p>
                  )}

                  {isLater && !isSkipped && (
                    <p className="text-sm text-amber-700">
                      Marked for later — <button onClick={() => toggleAnswerLater(question.id)} className="text-[#FE0404] hover:underline">answer now</button>
                    </p>
                  )}

                  {/* Action buttons below input */}
                  {!isSkipped && !isLater && (
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/40">
                      {!question.required && (
                        <button
                          onClick={() => skipQuestion(question.id)}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <SkipForward className="h-3 w-3" />
                          Skip
                        </button>
                      )}
                      <button
                        onClick={() => toggleAnswerLater(question.id)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Clock className="h-3 w-3" />
                        Answer later
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Follow-up (inline, below the question) */}
              {followUps[question.id] && !followUps[question.id].dismissed && (
                <div className="ml-6 animate-slide-up">
                  {followUps[question.id].loading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FE0404]" />
                      <span>AI is analyzing your answer...</span>
                    </div>
                  ) : (
                    <Card className="border border-[#FE0404]/15 bg-gradient-to-r from-[#FE0404]/[0.03] to-transparent shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FE0404]/10">
                            <Bot className="h-3.5 w-3.5 text-[#FE0404]" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-foreground">
                                {followUps[question.id].question}
                              </p>
                              <button
                                onClick={() => dismissFollowUp(question.id)}
                                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <Input
                                value={followUps[question.id].answer}
                                onChange={(e) => updateFollowUpAnswer(question.id, e.target.value)}
                                placeholder="Your clarification..."
                                className="text-sm h-9 border-[#FE0404]/20 focus:border-[#FE0404] focus:ring-[#FE0404]/20"
                              />
                              <VoiceRecorder
                                compact
                                onTranscript={(text) =>
                                  updateFollowUpAnswer(question.id, followUps[question.id].answer + ' ' + text)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          );
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentSection((prev) => Math.max(0, prev - 1))}
            disabled={currentSection === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.previous')}
          </Button>

          {currentSection < totalSections - 1 ? (
            <Button
              onClick={() => {
                requestDynamicQuestions(currentSection);
                setCurrentSection((prev) => Math.min(totalSections - 1, prev + 1));
              }}
              className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2"
            >
              {t('common.next')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Link href={`/form/${projectSlug}/review`}>
              <Button className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2">
                {t('form.reviewTitle')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </main>

      {/* Floating AI Chat Assistant */}
      <div className="fixed bottom-6 right-6 z-50">
        {chatOpen && (
          <Card className="mb-3 w-[360px] max-h-[480px] flex flex-col border-0 shadow-2xl shadow-black/15 bg-white/95 backdrop-blur-xl animate-slide-up overflow-hidden rounded-2xl">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-[#FE0404] to-[#D00303] text-white rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                <span className="font-medium text-sm">AI Assistant</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="hover:bg-white/20 rounded p-1 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[340px]">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FE0404]/10">
                      <Bot className="h-3 w-3 text-[#FE0404]" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-[#FE0404] text-white rounded-br-sm'
                        : 'bg-gray-100 text-foreground rounded-bl-sm'
                    }`}
                  >
                    {msg.content || (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="border-t p-2">
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendChatMessage();
                    }
                  }}
                  placeholder="Ask anything..."
                  disabled={chatLoading}
                  className="text-sm h-9"
                />
                <Button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  size="icon"
                  className="h-9 w-9 bg-[#FE0404] hover:bg-[#E00303] text-white shrink-0"
                >
                  {chatLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Chat Toggle Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 ${
            chatOpen
              ? 'bg-gray-800 text-white hover:bg-gray-700 rotate-0'
              : 'bg-gradient-to-r from-[#FE0404] to-[#D00303] text-white hover:shadow-xl hover:shadow-[#FE0404]/30 hover:scale-105'
          }`}
        >
          {chatOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <MessageSquare className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
