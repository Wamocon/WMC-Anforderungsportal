'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Loader2,
  Send,
  Edit3,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined };

type ReviewSection = {
  id: string;
  title: string;
  questions: {
    id: string;
    label: string;
    type: string;
    is_required: boolean;
    value: Json | null;
    ai_clarification: string | null;
  }[];
};

type ReviewClientProps = {
  sections: ReviewSection[];
  responseId: string;
  projectName: string;
  projectSlug: string;
  locale: string;
  respondentName: string;
  totalQuestions: number;
  answeredCount: number;
  initialSummary: string;
};

export function ReviewClient({
  sections,
  responseId,
  projectName,
  projectSlug,
  locale,
  respondentName,
  totalQuestions,
  answeredCount,
  initialSummary,
}: ReviewClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const [summary, setSummary] = useState<string>(initialSummary);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryEditing, setSummaryEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const unanswered = totalQuestions - answeredCount;

  async function generateSummary() {
    setSummaryLoading(true);
    try {
      // Build response data from sections
      const responseData = sections.map((section) => ({
        sectionTitle: section.title,
        answers: section.questions
          .filter((q) => q.value !== null && q.value !== undefined && q.value !== '')
          .map((q) => ({
            question: q.label,
            answer: Array.isArray(q.value) ? q.value.join(', ') : String(q.value),
            aiClarification: q.ai_clarification || undefined,
          })),
      }));

      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseData,
          projectName,
          respondentName,
          locale,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate summary');

      // Stream the response
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let content = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setSummary(content);
      }

      // Scroll to summary
      setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    } catch (err) {
      console.error('Summary error:', err);
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/form/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseId, summary: summary || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit');
      }

      router.push(`/${params.locale || locale}/form/${projectSlug}/done`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit');
      setSubmitting(false);
    }
  }

  function copySummary() {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-emerald-100 p-3 mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">{t('form.reviewTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('form.reviewSubtitle')}</p>
        <p className="text-sm text-muted-foreground mt-2 font-medium">{projectName}</p>

        <div className="flex items-center justify-center gap-4 mt-4">
          <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3" />
            {answeredCount} {t('common.answered')}
          </Badge>
          {unanswered > 0 && (
            <Badge variant="outline" className="gap-1 bg-orange-50 text-orange-700 border-orange-200">
              <AlertCircle className="h-3 w-3" />
              {unanswered} {t('common.unanswered')}
            </Badge>
          )}
        </div>
      </div>

      {/* Answers by Section */}
      <div className="space-y-6 mb-8">
        {sections.map((section) => {
          if (section.questions.length === 0) return null;

          return (
            <Card key={section.id} className="border-0 shadow-md shadow-black/5 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <CardTitle className="text-base sm:text-lg">{section.title}</CardTitle>
                  <a href={`/${locale}/form/${projectSlug}/fill`}>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground">
                      <Edit3 className="h-3 w-3" />
                      {t('form.editAnswer')}
                    </Button>
                  </a>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.questions.map((q) => {
                  const hasAnswer = q.value !== null && q.value !== undefined && q.value !== '';

                  return (
                    <div key={q.id} className="border-b border-border/30 pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-medium text-foreground mb-1">
                        {q.label}
                        {q.is_required && <span className="text-red-500 ml-1">*</span>}
                      </p>
                      {hasAnswer ? (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {Array.isArray(q.value) ? q.value.join(', ') : String(q.value)}
                        </p>
                      ) : (
                        <p className="text-sm text-orange-500 italic">{t('common.notAnswered')}</p>
                      )}
                      {q.ai_clarification && (
                        <div className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3 mt-0.5 text-[#FE0404]" />
                          <span>{q.ai_clarification}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Generate Summary Section */}
      <div ref={summaryRef} className="mb-8">
        <Card className="border-0 shadow-lg shadow-black/5 bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#FE0404]" />
                {t('form.requirementsSummary')}
              </CardTitle>
              {summary && (
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copySummary}
                    className="gap-1 text-xs"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? t('common.copied') : t('common.copy')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSummaryEditing(!summaryEditing)}
                    className="gap-1 text-xs"
                  >
                    <Edit3 className="h-3 w-3" />
                    {summaryEditing ? t('common.save') : t('common.edit')}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!summary && !summaryLoading && (
              <div className="text-center py-6">
                <Sparkles className="h-10 w-10 text-[#FE0404]/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  {t('form.summaryDescription')}
                </p>
                <Button
                  onClick={generateSummary}
                  className="gap-2 bg-gradient-to-r from-[#FE0404] to-[#D00303] hover:from-[#E00303] hover:to-[#BB0000] text-white"
                >
                  <Sparkles className="h-4 w-4" />
                  {t('form.generateSummary')}
                </Button>
              </div>
            )}

            {summaryLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin text-[#FE0404]" />
                <span>{t('form.generatingSummary')}</span>
              </div>
            )}

            {summary && (
              <>
                {summaryEditing ? (
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={15}
                    className="font-mono text-sm"
                  />
                ) : (
                  <div className="prose prose-sm max-w-none text-foreground">
                    <ReactMarkdown>{summary}</ReactMarkdown>
                  </div>
                )}

                {/* Regenerate button */}
                <div className="mt-4 pt-3 border-t border-border/30 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateSummary}
                    disabled={summaryLoading}
                    className="gap-1 text-xs"
                  >
                    <Sparkles className="h-3 w-3" />
                    {t('form.regenerateSummary')}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <a href={`/${locale}/form/${projectSlug}/fill`}>
          <Button variant="outline" className="gap-2 w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
        </a>
        <div className="flex flex-col items-stretch sm:items-end">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="gap-2 bg-gradient-to-r from-[#FE0404] to-[#D00303] hover:from-[#E00303] hover:to-[#BB0000] text-white shadow-sm w-full sm:w-auto"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting ? t('form.submitting') : t('form.submitForm')}
          </Button>
          {submitError && <p className="text-sm text-destructive mt-2">{submitError}</p>}
        </div>
      </div>
    </main>
  );
}
