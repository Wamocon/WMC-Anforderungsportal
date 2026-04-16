'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { RevealOnScroll } from '@/components/reveal-on-scroll';
import {
  Terminal,
  Copy,
  Check,
  Monitor,
  Cpu,
  Bot,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Download,
  Settings,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Platform = 'vscode' | 'cursor' | 'claude';

const platforms: { id: Platform; label: string; icon: typeof Monitor }[] = [
  { id: 'vscode', label: 'VS Code / Copilot', icon: Monitor },
  { id: 'cursor', label: 'Cursor', icon: Cpu },
  { id: 'claude', label: 'Claude Desktop', icon: Bot },
];

const installSteps = [
  {
    id: 'install',
    icon: Download,
    command: 'npm install -g anforderungsportal-mcp',
  },
  {
    id: 'restart',
    icon: Settings,
    command: null,
  },
  {
    id: 'login',
    icon: MessageSquare,
    command: 'login your-email@company.com your-password',
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center justify-center h-7 w-7 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
      aria-label="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function TerminalWindow({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/10 dark:shadow-black/30 border border-black/[0.08] dark:border-white/[0.08]">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#1e1e2e] dark:bg-[#0d0d14]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
        </div>
        <span className="ml-2 text-xs text-white/40 font-mono">{title}</span>
      </div>
      {/* Body */}
      <div className="bg-[#1e1e2e] dark:bg-[#0d0d14] p-5 font-mono text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export function McpSetupSection() {
  const t = useTranslations('landing.mcp');
  const [activePlatform, setActivePlatform] = useState<Platform>('vscode');
  const [activeStep, setActiveStep] = useState(0);

  const configSnippets: Record<Platform, string> = {
    vscode: `// .vscode/mcp.json (auto-configured)
{
  "servers": {
    "anforderungsportal": {
      "command": "npx",
      "args": ["-y", "anforderungsportal-mcp"]
    }
  }
}`,
    cursor: `// .cursor/mcp.json
{
  "mcpServers": {
    "anforderungsportal": {
      "command": "npx",
      "args": ["-y", "anforderungsportal-mcp"]
    }
  }
}`,
    claude: `// claude_desktop_config.json
{
  "mcpServers": {
    "anforderungsportal": {
      "command": "npx",
      "args": ["-y", "anforderungsportal-mcp"]
    }
  }
}`,
  };

  return (
    <RevealOnScroll delay={100}>
      <section className="relative py-24 sm:py-32 bg-gradient-to-b from-slate-50/80 via-white to-white dark:from-muted/20 dark:via-background dark:to-background overflow-hidden">
        {/* Background accents */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-200/[0.06] dark:bg-violet-500/[0.03] blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-[#FE0404]/[0.04] dark:bg-[#FE0404]/[0.02] blur-[100px] pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 relative">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full liquid-glass-badge px-4 py-1.5 text-sm font-medium text-muted-foreground mb-4">
              <Terminal className="h-3.5 w-3.5 text-[#FE0404]" />
              {t('badge')}
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.02em] mb-4">
              {t('title1')}{' '}
              <span className="text-[#FE0404]">{t('title2')}</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              {t('desc')}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
            {/* Left: Interactive steps */}
            <div className="space-y-6">
              {/* Platform selector */}
              <div className="flex flex-wrap gap-2">
                {platforms.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePlatform(p.id)}
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
                      activePlatform === p.id
                        ? 'bg-[#FE0404] text-white shadow-lg shadow-[#FE0404]/20'
                        : 'liquid-glass-badge text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <p.icon className="h-4 w-4" />
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Step cards */}
              <div className="space-y-3">
                {installSteps.map((step, i) => (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(i)}
                    className={cn(
                      'w-full text-left rounded-2xl p-5 transition-all duration-300 group',
                      activeStep === i
                        ? 'liquid-glass-card-active shadow-lg ring-1 ring-[#FE0404]/20'
                        : 'liquid-glass-card-inactive hover:shadow-md'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-all duration-300',
                        activeStep === i
                          ? 'bg-[#FE0404] text-white shadow-md shadow-[#FE0404]/20'
                          : 'bg-[#FE0404]/[0.06] dark:bg-[#FE0404]/10 text-[#FE0404]'
                      )}>
                        <step.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {t(`step${i + 1}Label`)}
                          </span>
                        </div>
                        <h4 className="font-semibold text-foreground mt-0.5">{t(`step${i + 1}Title`)}</h4>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t(`step${i + 1}Desc`)}</p>
                        {step.command && (
                          <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#1e1e2e] px-3 py-2 font-mono text-xs text-emerald-400">
                            <span className="text-white/30">$</span>
                            <code className="flex-1 truncate">{step.command}</code>
                            <CopyButton text={step.command} />
                          </div>
                        )}
                      </div>
                      <ChevronRight className={cn(
                        'h-5 w-5 shrink-0 text-muted-foreground/40 transition-transform duration-300',
                        activeStep === i && 'rotate-90 text-[#FE0404]'
                      )} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Live terminal preview */}
            <div className="space-y-4 lg:sticky lg:top-24">
              <TerminalWindow title={`${platforms.find(p => p.id === activePlatform)?.label} — Terminal`}>
                {activeStep === 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">$</span>
                      <span className="text-white typing-animation">npm install -g anforderungsportal-mcp</span>
                    </div>
                    <div className="text-white/40 mt-3 space-y-1">
                      <p>added 1 package in 3s</p>
                      <p className="text-emerald-400">✓ Auto-configured for {platforms.find(p => p.id === activePlatform)?.label}</p>
                      <p className="text-white/30">Config saved → {activePlatform === 'vscode' ? '.vscode/mcp.json' : activePlatform === 'cursor' ? '.cursor/mcp.json' : 'claude_desktop_config.json'}</p>
                    </div>
                  </div>
                )}
                {activeStep === 1 && (
                  <div className="space-y-3">
                    <p className="text-white/60">{`// ${activePlatform === 'claude' ? 'claude_desktop_config.json' : activePlatform === 'cursor' ? '.cursor/mcp.json' : '.vscode/mcp.json'}`}</p>
                    <pre className="text-white/90 text-xs leading-relaxed">
                      {configSnippets[activePlatform]}
                    </pre>
                    <div className="flex justify-end mt-2">
                      <CopyButton text={configSnippets[activePlatform]} />
                    </div>
                  </div>
                )}
                {activeStep === 2 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400">{'>'}</span>
                      <span className="text-white">login admin@wamocon.com ••••••••</span>
                    </div>
                    <div className="text-white/40 mt-3 space-y-1">
                      <p className="text-emerald-400">✓ Logged in as admin@wamocon.com</p>
                      <p className="text-white/30">Role: staff | Session: active</p>
                    </div>
                    <div className="border-t border-white/10 mt-4 pt-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400">{'>'}</span>
                        <span className="text-white">list projects</span>
                      </div>
                      <div className="text-white/40 mt-2 space-y-0.5 text-xs">
                        <p>📁 Website Relaunch <span className="text-emerald-400">active</span></p>
                        <p>📁 Mobile App MVP <span className="text-amber-400">draft</span></p>
                        <p>📁 AI Chatbot Integration <span className="text-blue-400">pending</span></p>
                      </div>
                    </div>
                  </div>
                )}
              </TerminalWindow>

              {/* Available tools list */}
              <div className="rounded-2xl p-5 liquid-glass-card">
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-[#FE0404]" />
                  {t('toolsAvailable')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    'list_projects', 'create_project', 'approve_project',
                    'get_template', 'submit_answer', 'project_stats',
                    'invite_member', 'send_feedback', 'search_projects',
                  ].map((tool) => (
                    <span
                      key={tool}
                      className="inline-flex items-center rounded-lg bg-foreground/[0.04] dark:bg-white/[0.06] px-2.5 py-1 text-xs font-mono text-muted-foreground"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </RevealOnScroll>
  );
}
