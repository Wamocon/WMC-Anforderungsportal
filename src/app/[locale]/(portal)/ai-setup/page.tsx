'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Terminal,
  Copy,
  Check,
  Monitor,
  Cpu,
  Bot,
  Download,
  Settings,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Info,
} from 'lucide-react';

type Platform = 'vscode' | 'cursor' | 'claude';

const platforms: { id: Platform; label: string; icon: typeof Monitor; desc: string }[] = [
  { id: 'vscode', label: 'VS Code / Copilot', icon: Monitor, desc: 'GitHub Copilot Chat' },
  { id: 'cursor', label: 'Cursor', icon: Cpu, desc: 'Built-in AI assistant' },
  { id: 'claude', label: 'Claude Desktop', icon: Bot, desc: 'Anthropic Claude' },
];

const installSteps = [
  { id: 'install', icon: Download, command: 'npm install -g anforderungsportal-mcp' },
  { id: 'restart', icon: Settings, command: null },
  { id: 'login', icon: MessageSquare, command: 'login your-email@company.com your-password' },
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
    <div className="rounded-2xl overflow-hidden shadow-xl border border-border/50">
      <div className="flex items-center gap-2 px-4 py-3 bg-[#1e1e2e] dark:bg-[#0d0d14]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
        </div>
        <span className="ml-2 text-xs text-white/40 font-mono">{title}</span>
      </div>
      <div className="bg-[#1e1e2e] dark:bg-[#0d0d14] p-5 font-mono text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export default function PortalAiSetupPage() {
  const t = useTranslations('client.aiSetup');
  const [activePlatform, setActivePlatform] = useState<Platform>('vscode');
  const [activeStep, setActiveStep] = useState(0);

  const configSnippets: Record<Platform, string> = {
    vscode: `// .vscode/mcp.json (auto-configured)\n{\n  "servers": {\n    "anforderungsportal": {\n      "command": "npx",\n      "args": ["-y", "anforderungsportal-mcp"]\n    }\n  }\n}`,
    cursor: `// .cursor/mcp.json\n{\n  "mcpServers": {\n    "anforderungsportal": {\n      "command": "npx",\n      "args": ["-y", "anforderungsportal-mcp"]\n    }\n  }\n}`,
    claude: `// claude_desktop_config.json\n{\n  "mcpServers": {\n    "anforderungsportal": {\n      "command": "npx",\n      "args": ["-y", "anforderungsportal-mcp"]\n    }\n  }\n}`,
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('description')}</p>
      </div>

      {/* Info banner — what clients can do */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200/60 dark:border-blue-500/20 bg-blue-50/60 dark:bg-blue-500/[0.05] p-4">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-300">{t('infoTitle')}</p>
          <p className="text-sm text-blue-700/80 dark:text-blue-400/80 mt-0.5">{t('infoDesc')}</p>
        </div>
      </div>

      {/* Platform selector */}
      <div className="grid gap-4 sm:grid-cols-3">
        {platforms.map((p) => (
          <Card
            key={p.id}
            className={cn(
              'cursor-pointer transition-all duration-300 hover:shadow-md',
              activePlatform === p.id ? 'ring-2 ring-[#FE0404] shadow-md' : 'hover:ring-1 hover:ring-border'
            )}
            onClick={() => setActivePlatform(p.id)}
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className={cn(
                'flex items-center justify-center w-12 h-12 rounded-xl transition-colors',
                activePlatform === p.id ? 'bg-[#FE0404] text-white' : 'bg-muted text-muted-foreground'
              )}>
                <p.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-sm">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Steps + terminal */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Steps */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold">{t('setupSteps')}</h2>
          {installSteps.map((step, i) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(i)}
              className={cn(
                'w-full text-left rounded-xl p-4 transition-all duration-300 border',
                activeStep === i
                  ? 'border-[#FE0404]/30 bg-[#FE0404]/[0.03] dark:bg-[#FE0404]/[0.06] shadow-sm'
                  : 'border-border hover:border-border/80'
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-all',
                  activeStep === i ? 'bg-[#FE0404] text-white shadow-md shadow-[#FE0404]/20' : 'bg-muted text-muted-foreground'
                )}>
                  <step.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t(`step${i + 1}Label`)}</span>
                  <h4 className="font-semibold text-foreground text-sm mt-0.5">{t(`step${i + 1}Title`)}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t(`step${i + 1}Desc`)}</p>
                  {step.command && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#1e1e2e] px-3 py-2 font-mono text-xs text-emerald-400">
                      <span className="text-white/30">$</span>
                      <code className="flex-1 truncate">{step.command}</code>
                      <CopyButton text={step.command} />
                    </div>
                  )}
                </div>
                <ChevronRight className={cn(
                  'h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform',
                  activeStep === i && 'rotate-90 text-[#FE0404]'
                )} />
              </div>
            </button>
          ))}
        </div>

        {/* Right: Terminal */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold">{t('livePreview')}</h2>
          <TerminalWindow title={`${platforms.find(p => p.id === activePlatform)?.label} — Terminal`}>
            {activeStep === 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">$</span>
                  <span className="text-white">npm install -g anforderungsportal-mcp</span>
                </div>
                <div className="text-white/40 mt-3 space-y-1 text-xs">
                  <p>added 1 package in 3s</p>
                  <p className="text-emerald-400">✓ Auto-configured for {platforms.find(p => p.id === activePlatform)?.label}</p>
                </div>
              </div>
            )}
            {activeStep === 1 && (
              <div className="space-y-3">
                <p className="text-white/60 text-xs">{`// ${activePlatform === 'claude' ? 'claude_desktop_config.json' : activePlatform === 'cursor' ? '.cursor/mcp.json' : '.vscode/mcp.json'}`}</p>
                <pre className="text-white/90 text-xs leading-relaxed">{configSnippets[activePlatform]}</pre>
                <div className="flex justify-end">
                  <CopyButton text={configSnippets[activePlatform]} />
                </div>
              </div>
            )}
            {activeStep === 2 && (
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">{'>'}</span>
                  <span className="text-white">login my-email@company.com ••••••••</span>
                </div>
                <div className="text-white/40 mt-3 space-y-1">
                  <p className="text-emerald-400">✓ Logged in successfully</p>
                  <p className="text-white/30">Role: client | Session: active</p>
                </div>
                <div className="border-t border-white/10 mt-4 pt-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">{'>'}</span>
                    <span className="text-white">list my projects</span>
                  </div>
                  <div className="text-white/40 mt-2 space-y-0.5">
                    <p>📁 Website Relaunch <span className="text-blue-400">in_progress</span></p>
                    <p>📁 Mobile App MVP <span className="text-amber-400">draft</span></p>
                  </div>
                </div>
              </div>
            )}
          </TerminalWindow>

          {/* Client-relevant tools */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#FE0404]" />
                {t('toolsAvailable')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              <div className="flex flex-wrap gap-2">
                {['list_my_projects', 'get_project', 'submit_answer', 'list_responses', 'get_template', 'send_feedback'].map((tool) => (
                  <span key={tool} className="inline-flex items-center rounded-lg bg-muted px-2.5 py-1 text-xs font-mono text-muted-foreground">
                    {tool}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <a
            href="https://www.npmjs.com/package/anforderungsportal-mcp"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            {t('viewOnNpm')}
          </a>
        </div>
      </div>
    </div>
  );
}
