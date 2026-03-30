#!/usr/bin/env node
/**
 * fix-landing-v2.cjs
 * Fixes: broken <section tag, KI-Manager demo → AM demo, adds roadmap workflow,
 * hero stats colors, footer links, cookie key
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'public', 'landing', 'index.html');
let html = fs.readFileSync(FILE, 'utf8');
const originalLen = html.length;

// ─── 1. Fix broken <section tag ────────────────────────────────────────────
// The closing </section> for "rollen" is directly concatenated with the opening
// of "funktionen" section with "tion class=..." instead of "<section class=..."
html = html.replace(
  '</section>tion class="py-24 md:py-36 text-center section-alt section-glow" id="funktionen">',
  '</section>\n\n  <section class="py-24 md:py-36 text-center section-alt section-glow" id="funktionen">'
);

// ─── 2. Fix hero stat card colors (white-on-light → proper contrast) ───────
// Replace all 3 stat cards' background + border
html = html.replaceAll(
  'style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);"',
  'style="background:var(--color-surface);border:1px solid var(--color-border);box-shadow:0 4px 16px rgba(0,0,0,.06);"'
);
// Replace stat label color (white → muted dark)
html = html.replaceAll(
  'style="color:#f0f0f2;" data-i18n data-de="Unterstuetzte Sprachen"',
  'style="color:var(--color-muted);" data-i18n data-de="Unterstuetzte Sprachen"'
);
html = html.replaceAll(
  'style="color:#f0f0f2;" data-i18n data-de="Projekt-Setup bis Magic Link"',
  'style="color:var(--color-muted);" data-i18n data-de="Projekt-Setup bis Magic Link"'
);
html = html.replaceAll(
  'style="color:#f0f0f2;" data-i18n data-de="DSGVO-konform, EU-Hosting"',
  'style="color:var(--color-muted);" data-i18n data-de="DSGVO-konform, EU-Hosting"'
);

// ─── 3. Replace the entire demo browser-chrome content ─────────────────────
const demoOld = `<div class="grid grid-cols-1 lg:grid-cols-[280px_1fr]" style="background:#fff;">
          <div class="p-6" style="border-right:1px solid rgba(0,0,0,.08);background:linear-gradient(180deg,#fbfbfc,#f2f3f6);">
            <div class="text-xs uppercase tracking-[0.18em] font-bold text-accent mb-4" data-i18n data-de="Classroom Navigation" data-en="Classroom navigation">Classroom Navigation</div>
            <div class="space-y-3 text-left">
              <div class="rounded-xl p-4" style="background:rgba(255,26,26,.08);border:1px solid rgba(255,26,26,.15);"><div class="font-semibold mb-1">Modul 1</div><div class="text-sm text-muted" data-i18n data-de="KI-Grundlagen und Technologien" data-en="AI fundamentals and technologies">KI-Grundlagen und Technologien</div></div>
              <div class="rounded-xl p-4" style="background:#fff;border:1px solid rgba(0,0,0,.08);"><div class="font-semibold mb-1">Modul 2</div><div class="text-sm text-muted" data-i18n data-de="Generative KI und Prompt Engineering" data-en="Generative AI and prompt engineering">Generative KI und Prompt Engineering</div></div>
              <div class="rounded-xl p-4" style="background:#fff;border:1px solid rgba(0,0,0,.08);"><div class="font-semibold mb-1">Modul 7</div><div class="text-sm text-muted" data-i18n data-de="EU AI Act und Governance" data-en="EU AI Act and governance">EU AI Act und Governance</div></div>
              <div class="rounded-xl p-4" style="background:#fff;border:1px solid rgba(0,0,0,.08);"><div class="font-semibold mb-1">Modul 8</div><div class="text-sm text-muted" data-i18n data-de="Implementierung und Change" data-en="Implementation and change">Implementierung und Change</div></div>
            </div>
          </div>
          <div class="p-6 lg:p-8 text-left">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div class="rounded-2xl p-5" style="background:rgba(255,26,26,.05);border:1px solid rgba(255,26,26,.12);"><div class="text-xs uppercase tracking-[0.18em] text-accent font-bold mb-2" data-i18n data-de="Fortschritt" data-en="Progress">Fortschritt</div><div class="text-3xl font-black">42%</div><div class="text-sm text-muted" data-i18n data-de="durchschnittlicher Lernstand" data-en="average learning completion">durchschnittlicher Lernstand</div></div>
              <div class="rounded-2xl p-5" style="background:rgba(0,0,0,.03);border:1px solid rgba(0,0,0,.08);"><div class="text-xs uppercase tracking-[0.18em] text-accent font-bold mb-2">XP</div><div class="text-3xl font-black">1,280</div><div class="text-sm text-muted" data-i18n data-de="Level: Anwender" data-en="Level: Practitioner">Level: Anwender</div></div>
              <div class="rounded-2xl p-5" style="background:rgba(0,0,0,.03);border:1px solid rgba(0,0,0,.08);"><div class="text-xs uppercase tracking-[0.18em] text-accent font-bold mb-2" data-i18n data-de="Checklist" data-en="Checklist">Checklist</div><div class="text-3xl font-black">9 / 12</div><div class="text-sm text-muted" data-i18n data-de="Governance-Aufgaben erledigt" data-en="governance tasks completed">Governance-Aufgaben erledigt</div></div>
            </div>

            <div class="rounded-2xl p-6 mb-5" style="background:linear-gradient(135deg,rgba(255,26,26,.07),rgba(255,26,26,.02));border:1px solid rgba(255,26,26,.15);">
              <div class="text-xs uppercase tracking-[0.18em] text-accent font-bold mb-2" data-i18n data-de="Aktuelle Lektion" data-en="Current lesson">Aktuelle Lektion</div>
              <h3 class="text-2xl font-bold mb-3" data-i18n data-de="Risk Classification unter dem EU AI Act" data-en="Risk classification under the EU AI Act">Risk Classification unter dem EU AI Act</h3>
              <p class="text-sm text-muted leading-relaxed mb-4" data-i18n data-de="Hook, Theorie, praktischer Transfer und Zusammenfassung werden in einer linearen Classroom-Logik praesentiert. Genau dort liegen auch Bookmarks, private Notizen und Download-Assets." data-en="Hook, theory, practical transfer, and summary are presented in a linear classroom flow. Bookmarks, personal notes, and download assets live in the same workspace.">Hook, Theorie, praktischer Transfer und Zusammenfassung werden in einer linearen Classroom-Logik praesentiert. Genau dort liegen auch Bookmarks, private Notizen und Download-Assets.</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="rounded-xl p-4" style="background:#fff;border:1px solid rgba(0,0,0,.08);"><div class="font-semibold mb-1" data-i18n data-de="Industrie-Szenario" data-en="Industry scenario">Industrie-Szenario</div><div class="text-sm text-muted" data-i18n data-de="Retail-Churn-Prognose: Welche Pflichten entstehen bei einem begrenzten oder hochriskanten System?" data-en="Retail churn prediction: which obligations arise for a limited-risk or high-risk system?">Retail-Churn-Prognose: Welche Pflichten entstehen bei einem begrenzten oder hochriskanten System?</div></div>
                <div class="rounded-xl p-4" style="background:#fff;border:1px solid rgba(0,0,0,.08);"><div class="font-semibold mb-1" data-i18n data-de="Knowledge Check" data-en="Knowledge check">Knowledge Check</div><div class="text-sm text-muted" data-i18n data-de="4 Fragen, 70 Prozent Mindestscore, 3 Versuche, direkte Erklaerung nach jeder Antwort." data-en="4 questions, 70 percent minimum score, 3 attempts, direct explanation after each answer.">4 Fragen, 70 Prozent Mindestscore, 3 Versuche, direkte Erklaerung nach jeder Antwort.</div></div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="rounded-2xl p-5" style="background:#fff;border:1px solid rgba(0,0,0,.08);"><div class="font-semibold mb-2" data-i18n data-de="Admin-Sicht" data-en="Admin view">Admin-Sicht</div><p class="text-sm text-muted" data-i18n data-de="Seat-Auslastung, aktive Nutzer, Completion-Rates und Quiz-Performance aggregiert auf Organisationsebene." data-en="Seat utilization, active users, completion rates, and quiz performance aggregated at organization level.">Seat-Auslastung, aktive Nutzer, Completion-Rates und Quiz-Performance aggregiert auf Organisationsebene.</p></div>
              <div class="rounded-2xl p-5" style="background:#fff;border:1px solid rgba(0,0,0,.08);"><div class="font-semibold mb-2" data-i18n data-de="Learner-Sicht" data-en="Learner view">Learner-Sicht</div><p class="text-sm text-muted" data-i18n data-de="Ein durchgehender Trainingspfad mit XP, Badges, Streaks, Finalprojekt und klarer Restanforderung bis zum Abschluss." data-en="A continuous training path with XP, badges, streaks, final project, and clear remaining requirements until completion.">Ein durchgehender Trainingspfad mit XP, Badges, Streaks, Finalprojekt und klarer Restanforderung bis zum Abschluss.</p></div>
            </div>
          </div>
        </div>`;

const demoNew = `<div class="grid grid-cols-1 lg:grid-cols-[240px_1fr]" style="background:#fff;">
          <div class="p-5" style="border-right:1px solid rgba(0,0,0,.08);background:linear-gradient(180deg,#fbfbfc,#f2f3f6);">
            <div class="text-xs uppercase tracking-[0.18em] font-bold text-accent mb-4" data-i18n data-de="Projekte" data-en="Projects">Projekte</div>
            <div class="space-y-2 text-left">
              <div class="rounded-xl p-3" style="background:rgba(255,26,26,.08);border:1px solid rgba(255,26,26,.15);"><div class="font-semibold text-sm mb-0.5" data-i18n data-de="Website Redesign" data-en="Website Redesign">Website Redesign</div><div class="text-xs text-muted">3 / 5 Antworten</div></div>
              <div class="rounded-xl p-3" style="background:#fff;border:1px solid rgba(0,0,0,.08);"><div class="font-semibold text-sm mb-0.5" data-i18n data-de="CRM Integration" data-en="CRM Integration">CRM Integration</div><div class="text-xs text-muted">1 / 3 Antworten</div></div>
              <div class="rounded-xl p-3" style="background:#fff;border:1px solid rgba(0,0,0,.08);"><div class="font-semibold text-sm mb-0.5" data-i18n data-de="Mobile App MVP" data-en="Mobile App MVP">Mobile App MVP</div><div class="text-xs text-muted">5 / 5 &#10003;</div></div>
              <div class="rounded-xl p-3 text-center text-sm font-semibold" style="border:1px dashed rgba(0,0,0,.15);color:var(--color-muted);cursor:pointer;" data-i18n data-de="+ Neues Projekt" data-en="+ New Project">+ Neues Projekt</div>
            </div>
          </div>
          <div class="p-5 lg:p-7 text-left">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <div class="rounded-xl p-4" style="background:rgba(255,26,26,.05);border:1px solid rgba(255,26,26,.12);"><div class="text-xs uppercase tracking-[0.18em] text-accent font-bold mb-1" data-i18n data-de="Antworten" data-en="Responses">Antworten</div><div class="text-2xl font-black">9 / 13</div><div class="text-xs text-muted" data-i18n data-de="Eingegangene Antworten" data-en="Responses received">Eingegangene Antworten</div></div>
              <div class="rounded-xl p-4" style="background:rgba(0,0,0,.03);border:1px solid rgba(0,0,0,.08);"><div class="text-xs uppercase tracking-[0.18em] text-accent font-bold mb-1" data-i18n data-de="Vorlagen" data-en="Templates">Vorlagen</div><div class="text-2xl font-black">5</div><div class="text-xs text-muted" data-i18n data-de="Aktive Templates" data-en="Active templates">Aktive Templates</div></div>
              <div class="rounded-xl p-4" style="background:rgba(0,0,0,.03);border:1px solid rgba(0,0,0,.08);"><div class="text-xs uppercase tracking-[0.18em] text-accent font-bold mb-1" data-i18n data-de="Sprachen" data-en="Languages">Sprachen</div><div class="text-2xl font-black">25</div><div class="text-xs text-muted" data-i18n data-de="Verfuegbare Sprachen" data-en="Available languages">Verfuegbare Sprachen</div></div>
            </div>

            <div class="rounded-xl p-5 mb-4" style="background:linear-gradient(135deg,rgba(255,26,26,.07),rgba(255,26,26,.02));border:1px solid rgba(255,26,26,.15);">
              <div class="text-xs uppercase tracking-[0.18em] text-accent font-bold mb-1" data-i18n data-de="Aktuelles Projekt" data-en="Current project">Aktuelles Projekt</div>
              <h3 class="text-xl font-bold mb-2" data-i18n data-de="Website Redesign" data-en="Website Redesign">Website Redesign</h3>
              <p class="text-sm text-muted leading-relaxed mb-3" data-i18n data-de="Letzte Antwort von Thomas M. via KI-Interview. 3 von 5 Antworten eingegangen. KI hat 2 Luecken erkannt." data-en="Last response from Thomas M. via AI interview. 3 of 5 responses received. AI detected 2 gaps.">Letzte Antwort von Thomas M. via KI-Interview. 3 von 5 Antworten eingegangen. KI hat 2 Luecken erkannt.</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="rounded-lg p-3" style="background:#fff;border:1px solid rgba(0,0,0,.08);"><div class="font-semibold text-sm mb-1" data-i18n data-de="KI-Zusammenfassung" data-en="AI summary">&#9889; KI-Zusammenfassung</div><div class="text-xs text-muted" data-i18n data-de="Automatische Analyse: Kernpunkte extrahiert, Performance-Anforderungen fehlen, Budget noch offen." data-en="Automatic analysis: key points extracted, performance requirements missing, budget still open.">Automatische Analyse: Kernpunkte extrahiert, Performance-Anforderungen fehlen, Budget noch offen.</div></div>
                <div class="rounded-lg p-3" style="background:#fff;border:1px solid rgba(0,0,0,.08);"><div class="font-semibold text-sm mb-1" data-i18n data-de="Naechste Schritte" data-en="Next steps">&#9998; Naechste Schritte</div><div class="text-xs text-muted" data-i18n data-de="2 Kunden ausstehend. Follow-up per Magic Link senden. Export als PDF verfuegbar." data-en="2 clients pending. Send follow-up via magic link. PDF export available.">2 Kunden ausstehend. Follow-up per Magic Link senden. Export als PDF verfuegbar.</div></div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="rounded-xl p-4" style="background:#fff;border:1px solid rgba(0,0,0,.08);"><div class="font-semibold text-sm mb-1" data-i18n data-de="Manager Dashboard" data-en="Manager dashboard">&#128202; Manager Dashboard</div><p class="text-xs text-muted" data-i18n data-de="Projekte verwalten, Vorlagen erstellen, Antworten analysieren, KI-Zusammenfassungen exportieren." data-en="Manage projects, create templates, analyze responses, export AI summaries.">Projekte verwalten, Vorlagen erstellen, Antworten analysieren, KI-Zusammenfassungen exportieren.</p></div>
              <div class="rounded-xl p-4" style="background:#fff;border:1px solid rgba(0,0,0,.08);"><div class="font-semibold text-sm mb-1" data-i18n data-de="Client Formular" data-en="Client form">&#128221; Client Formular</div><p class="text-xs text-muted" data-i18n data-de="Kunden fuellen Formulare aus, nutzen Spracheingabe oder KI-Interview. Kein Konto noetig." data-en="Clients fill forms, use voice input, or AI interview. No account needed.">Kunden fuellen Formulare aus, nutzen Spracheingabe oder KI-Interview. Kein Konto noetig.</p></div>
            </div>
          </div>
        </div>`;

if (html.includes('Classroom Navigation')) {
  html = html.replace(demoOld, demoNew);
  console.log('✓ Demo section replaced with AM content');
} else {
  console.log('⚠ Classroom Navigation not found — demo already fixed?');
}

// ─── 4. Replace wizard section with roadmap timeline ───────────────────────
// The wizard section currently has a duplicate 4-card grid. Replace with a
// proper animated roadmap timeline showing the 5-step AM workflow.
const wizardOldContent = `<span class="reveal inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-6" style="color:var(--color-accent);background:rgba(255,26,26,.1);border:1px solid rgba(255,26,26,.2);" data-i18n data-de="Der Ablauf" data-en="The journey">Der Ablauf</span>
      <h2 class="reveal text-3xl md:text-5xl font-bold leading-[1.1] tracking-tight mb-5" style="color:#f0f0f2;" data-i18n data-de="Von der Einladung zur fertigen Anforderung" data-en="From invitation to finished requirements">Von der Einladung zur fertigen Anforderung</h2>
      <p class="reveal text-lg max-w-[680px] mx-auto leading-relaxed mb-14" style="color:#9999a1;" data-i18n data-de="Der gesamte Prozess ist durchgaengig gefuehrt." data-en="The entire process is guided end-to-end.">Der gesamte Prozess ist durchgaengig gefuehrt.</p>

      <div class="reveal grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[980px] mx-auto">
        <div class="rounded-2xl p-7" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);"><div class="text-5xl mb-4">1</div><h3 class="text-lg font-bold mb-2" style="color:#f0f0f2;" data-i18n data-de="Projekt erstellen" data-en="Create project">Projekt erstellen</h3><p class="text-sm" style="color:#8e8e96;" data-i18n data-de="Erstellen Sie ein Projekt mit Name, Beschreibung und Deadline." data-en="Create a project with name, description, and deadline.">Erstellen Sie ein Projekt mit Name, Beschreibung und Deadline.</p></div>
        <div class="rounded-2xl p-7" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);"><div class="text-5xl mb-4">2</div><h3 class="text-lg font-bold mb-2" style="color:#f0f0f2;" data-i18n data-de="Kunden einladen" data-en="Invite client">Kunden einladen</h3><p class="text-sm" style="color:#8e8e96;" data-i18n data-de="Ihr Kunde erhaelt einen sicheren Magic Link per E-Mail." data-en="Your client receives a secure magic link via email.">Ihr Kunde erhaelt einen sicheren Magic Link per E-Mail.</p></div>
        <div class="rounded-2xl p-7" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);"><div class="text-5xl mb-4">3</div><h3 class="text-lg font-bold mb-2" style="color:#f0f0f2;" data-i18n data-de="Anforderungen erfassen" data-en="Collect requirements">Anforderungen erfassen</h3><p class="text-sm" style="color:#8e8e96;" data-i18n data-de="Formular, KI-Interview oder Spracheingabe. Die KI stellt Rueckfragen." data-en="Form, AI interview, or voice input. The AI asks follow-ups.">Formular, KI-Interview oder Spracheingabe. Die KI stellt Rueckfragen.</p></div>
        <div class="rounded-2xl p-7" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);"><div class="text-5xl mb-4">4</div><h3 class="text-lg font-bold mb-2" style="color:#f0f0f2;" data-i18n data-de="Ergebnis erhalten" data-en="Get results">Ergebnis erhalten</h3><p class="text-sm" style="color:#8e8e96;" data-i18n data-de="Strukturierte Anforderungen mit KI-Zusammenfassung. Export als PDF, Excel oder Word." data-en="Structured requirements with AI summary. Export as PDF, Excel, or Word.">Strukturierte Anforderungen mit KI-Zusammenfassung. Export als PDF, Excel oder Word.</p></div>
      </div>`;

const wizardNewContent = `<span class="reveal inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-6" style="color:var(--color-accent);background:rgba(255,26,26,.1);border:1px solid rgba(255,26,26,.2);" data-i18n data-de="Der Ablauf" data-en="The journey">Der Ablauf</span>
      <h2 class="reveal text-3xl md:text-5xl font-bold leading-[1.1] tracking-tight mb-5" style="color:#f0f0f2;" data-i18n data-de="Von der Einladung zur fertigen Anforderung" data-en="From invitation to finished requirements">Von der Einladung zur fertigen Anforderung</h2>
      <p class="reveal text-lg max-w-[680px] mx-auto leading-relaxed mb-4" style="color:#9999a1;" data-i18n data-de="Der gesamte Prozess ist KI-gestuetzt und durchgaengig gefuehrt." data-en="The entire process is AI-powered and guided end-to-end.">Der gesamte Prozess ist KI-gestuetzt und durchgaengig gefuehrt.</p>

      <div class="rm">
        <div class="rm__line">
          <svg viewBox="0 0 120 900" preserveAspectRatio="none">
            <defs><linearGradient id="rmGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FE0404" stop-opacity="0.8"/><stop offset="100%" stop-color="#ff6b6b" stop-opacity="0.3"/></linearGradient></defs>
            <path class="rm__line-bg" d="M60 0 C60 150 60 150 60 180 C60 210 60 210 60 360 C60 510 60 510 60 540 C60 570 60 570 60 720 C60 870 60 870 60 900"/>
            <path class="rm__line-progress" d="M60 0 C60 150 60 150 60 180 C60 210 60 210 60 360 C60 510 60 510 60 540 C60 570 60 570 60 720 C60 870 60 870 60 900"/>
          </svg>
          <div class="rm__line-glow"></div>
        </div>

        <!-- Step 1: Create project (Left) -->
        <div class="rm__row">
          <div class="rm__cell">
            <div class="rm__card rm__card--l">
              <span class="rm__label" data-i18n data-de="Schritt 1" data-en="Step 1">Schritt 1</span>
              <div class="rm__title" data-i18n data-de="Projekt erstellen" data-en="Create project">Projekt erstellen</div>
              <div class="rm__desc" data-i18n data-de="Manager erstellt ein neues Projekt mit Name, Beschreibung und Deadline. Waehlt ein Template oder erstellt ein eigenes mit dem Drag-and-Drop-Builder." data-en="Manager creates a new project with name, description, and deadline. Picks a template or builds a custom one with the drag-and-drop builder.">Manager erstellt ein neues Projekt mit Name, Beschreibung und Deadline. Waehlt ein Template oder erstellt ein eigenes mit dem Drag-and-Drop-Builder.</div>
              <div class="rm__tags"><span class="rm__tag">Dashboard</span><span class="rm__tag">Templates</span><span class="rm__tag">Deadline</span></div>
            </div>
          </div>
          <div class="rm__center"><div class="rm__dot"></div><div class="rm__branch rm__branch--l"></div></div>
          <div class="rm__cell rm__cell--hide"></div>
        </div>

        <!-- Step 2: Configure template (Right) -->
        <div class="rm__row">
          <div class="rm__cell rm__cell--hide"></div>
          <div class="rm__center"><div class="rm__dot"></div><div class="rm__branch rm__branch--r"></div></div>
          <div class="rm__cell">
            <div class="rm__card rm__card--r">
              <span class="rm__label" data-i18n data-de="Schritt 2" data-en="Step 2">Schritt 2</span>
              <div class="rm__title" data-i18n data-de="Vorlage konfigurieren" data-en="Configure template">Vorlage konfigurieren</div>
              <div class="rm__desc" data-i18n data-de="10+ Fragetypen: Kurztext, Dropdown, Multi-Select, Datei-Upload, Spracheingabe. Die KI schlaegt automatisch passende Fragen vor." data-en="10+ question types: short text, dropdown, multi-select, file upload, voice input. AI automatically suggests relevant questions.">10+ Fragetypen: Kurztext, Dropdown, Multi-Select, Datei-Upload, Spracheingabe. Die KI schlaegt automatisch passende Fragen vor.</div>
              <div class="rm__tags"><span class="rm__tag">Drag &amp; Drop</span><span class="rm__tag">10+ Typen</span><span class="rm__tag">KI-Vorschlaege</span></div>
            </div>
          </div>
        </div>

        <!-- Step 3: Invite client (Left) -->
        <div class="rm__row">
          <div class="rm__cell">
            <div class="rm__card rm__card--l">
              <span class="rm__label" data-i18n data-de="Schritt 3" data-en="Step 3">Schritt 3</span>
              <div class="rm__title" data-i18n data-de="Kunden einladen" data-en="Invite client">Kunden einladen</div>
              <div class="rm__desc" data-i18n data-de="Sicherer Magic Link per E-Mail. Der Kunde klickt und startet sofort: kein Registrierungszwang, kein Passwort." data-en="Secure magic link via email. Client clicks and starts immediately: no sign-up required, no password.">Sicherer Magic Link per E-Mail. Der Kunde klickt und startet sofort: kein Registrierungszwang, kein Passwort.</div>
              <div class="rm__tags"><span class="rm__tag">Magic Link</span><span class="rm__tag">E-Mail</span><span class="rm__tag">Kein Konto</span></div>
            </div>
          </div>
          <div class="rm__center"><div class="rm__dot"></div><div class="rm__branch rm__branch--l"></div></div>
          <div class="rm__cell rm__cell--hide"></div>
        </div>

        <!-- Step 4: Collect requirements (Right) -->
        <div class="rm__row">
          <div class="rm__cell rm__cell--hide"></div>
          <div class="rm__center"><div class="rm__dot"></div><div class="rm__branch rm__branch--r"></div></div>
          <div class="rm__cell">
            <div class="rm__card rm__card--r">
              <span class="rm__label" data-i18n data-de="Schritt 4" data-en="Step 4">Schritt 4</span>
              <div class="rm__title" data-i18n data-de="Anforderungen erfassen" data-en="Collect requirements">Anforderungen erfassen</div>
              <div class="rm__desc" data-i18n data-de="Der Kunde waehlt: Formular, KI-Interview oder Spracheingabe in 25 Sprachen. Die KI stellt bei vagen Antworten automatisch Rueckfragen." data-en="Client chooses: form, AI interview, or voice input in 25 languages. AI automatically asks follow-ups for vague answers.">Der Kunde waehlt: Formular, KI-Interview oder Spracheingabe in 25 Sprachen. Die KI stellt bei vagen Antworten automatisch Rueckfragen.</div>
              <div class="rm__tags"><span class="rm__tag">Formulare</span><span class="rm__tag">Spracheingabe</span><span class="rm__tag">KI-Interview</span></div>
            </div>
          </div>
        </div>

        <!-- Step 5: Get results (Left) -->
        <div class="rm__row">
          <div class="rm__cell">
            <div class="rm__card rm__card--l">
              <span class="rm__label" data-i18n data-de="Schritt 5" data-en="Step 5">Schritt 5</span>
              <div class="rm__title" data-i18n data-de="Ergebnis erhalten" data-en="Get results">Ergebnis erhalten</div>
              <div class="rm__desc" data-i18n data-de="Manager erhaelt strukturierte Anforderungen mit KI-Zusammenfassung, Luecken-Analyse und Export als PDF, Excel, Word, PowerPoint oder CSV." data-en="Manager receives structured requirements with AI summary, gap analysis, and export as PDF, Excel, Word, PowerPoint, or CSV.">Manager erhaelt strukturierte Anforderungen mit KI-Zusammenfassung, Luecken-Analyse und Export als PDF, Excel, Word, PowerPoint oder CSV.</div>
              <div class="rm__tags"><span class="rm__tag">KI-Summary</span><span class="rm__tag">Export</span><span class="rm__tag">Follow-up</span></div>
            </div>
          </div>
          <div class="rm__center"><div class="rm__dot"></div><div class="rm__branch rm__branch--l"></div></div>
          <div class="rm__cell rm__cell--hide"></div>
        </div>

        <!-- End marker -->
        <div class="rm__end">
          <div class="rm__end-marker">
            <div class="rm__end-ring">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span class="rm__end-label" data-i18n data-de="Fertig" data-en="Done">Fertig</span>
          </div>
        </div>
      </div>`;

if (html.includes(wizardOldContent)) {
  html = html.replace(wizardOldContent, wizardNewContent);
  console.log('✓ Wizard section replaced with roadmap timeline');
} else {
  console.log('⚠ Wizard old content not found');
}

// ─── 5. Fix footer navigation links ───────────────────────────────────────
// Currently some links point to wrong sections
html = html.replace(
  '<li><a href="#roadmap" class="hover:text-text-main transition-colors">Features</a></li>',
  '<li><a href="#funktionen" class="hover:text-text-main transition-colors" data-i18n data-de="Features" data-en="Features">Features</a></li>'
);
html = html.replace(
  '<li><a href="#funktionen" class="hover:text-text-main transition-colors">Demo</a></li>',
  '<li><a href="#demo" class="hover:text-text-main transition-colors">Demo</a></li>'
);
html = html.replace(
  '<li><a href="#rollen" class="hover:text-text-main transition-colors">Roles</a></li>',
  '<li><a href="#rollen" class="hover:text-text-main transition-colors" data-i18n data-de="Rollen" data-en="Roles">Rollen</a></li>'
);
html = html.replace(
  '<li><a href="#problem" class="hover:text-text-main transition-colors">Problem</a></li>',
  '<li><a href="#problem" class="hover:text-text-main transition-colors" data-i18n data-de="Problem" data-en="Problem">Problem</a></li>'
);
html = html.replace(
  '<li><a href="#wizard" class="hover:text-text-main transition-colors">Journey</a></li>',
  '<li><a href="#wizard" class="hover:text-text-main transition-colors" data-i18n data-de="Ablauf" data-en="Journey">Ablauf</a></li>'
);
html = html.replace(
  '<li><a href="#roi" class="hover:text-text-main transition-colors">Security</a></li>',
  '<li><a href="#roi" class="hover:text-text-main transition-colors" data-i18n data-de="Sicherheit" data-en="Security">Sicherheit</a></li>'
);
html = html.replace(
  '<li><a href="#architektur" class="hover:text-text-main transition-colors">Tech</a></li>',
  '<li><a href="#architektur" class="hover:text-text-main transition-colors" data-i18n data-de="Tech" data-en="Tech">Tech</a></li>'
);
html = html.replace(
  '<li><a href="#team" class="hover:text-text-main transition-colors">About</a></li>',
  '<li><a href="#team" class="hover:text-text-main transition-colors" data-i18n data-de="Ueber uns" data-en="About">Ueber uns</a></li>'
);

// ─── 6. Fix footer legal links ─────────────────────────────────────────────
// Replace placeholder # links with real routes
const legalOld = `<div class="font-semibold text-xs mb-2 text-faint uppercase tracking-widest" data-i18n data-de="Rechtliches" data-en="Legal">Rechtliches</div>
        <ul class="space-y-1 text-sm text-muted">
          <li><a href="#" class="hover:text-text-main transition-colors">Datenschutz</a></li>
          <li><a href="#" class="hover:text-text-main transition-colors">Impressum</a></li>
          <li><a href="#" class="hover:text-text-main transition-colors">AGB</a></li>
          <li><a href="#" class="hover:text-text-main transition-colors">Cookies</a></li>
        </ul>`;

const legalNew = `<div class="font-semibold text-xs mb-2 text-faint uppercase tracking-widest" data-i18n data-de="Rechtliches" data-en="Legal">Rechtliches</div>
        <ul class="space-y-1 text-sm text-muted">
          <li><a href="/de/datenschutz" class="hover:text-text-main transition-colors" data-i18n data-de="Datenschutz" data-en="Privacy policy">Datenschutz</a></li>
          <li><a href="/de/impressum" class="hover:text-text-main transition-colors" data-i18n data-de="Impressum" data-en="Imprint">Impressum</a></li>
          <li><a href="/de/agb" class="hover:text-text-main transition-colors" data-i18n data-de="AGB" data-en="Terms of service">AGB</a></li>
          <li><a href="/de/cookies" class="hover:text-text-main transition-colors" data-i18n data-de="Cookies" data-en="Cookie policy">Cookies</a></li>
        </ul>`;
html = html.replace(legalOld, legalNew);

// Also fix bottom bar legal links
html = html.replace(
  '<a href="#" class="hover:text-text-main transition-colors">Datenschutz</a>\n          <a href="#" class="hover:text-text-main transition-colors">Impressum</a>\n          <a href="#" class="hover:text-text-main transition-colors">Cookies</a>',
  '<a href="/de/datenschutz" class="hover:text-text-main transition-colors" data-i18n data-de="Datenschutz" data-en="Privacy">Datenschutz</a>\n          <a href="/de/impressum" class="hover:text-text-main transition-colors" data-i18n data-de="Impressum" data-en="Imprint">Impressum</a>\n          <a href="/de/cookies" class="hover:text-text-main transition-colors" data-i18n data-de="Cookies" data-en="Cookies">Cookies</a>'
);

// ─── 7. Fix cookie banner links ────────────────────────────────────────────
html = html.replaceAll("href='datenschutz.html'", "href='/de/datenschutz'");
html = html.replaceAll("href='cookies.html'", "href='/de/cookies'");

// ─── 8. Fix cookie localStorage key ────────────────────────────────────────
html = html.replaceAll('ki_manager_lms_cookie_consent', 'anforderungs_manager_cookie_consent');

// ─── 9. Fix copyright year ────────────────────────────────────────────────
html = html.replace('© 2025 WAMOCON', '© 2026 WAMOCON');
html = html.replace('data-de="© 2025', 'data-de="© 2026');
html = html.replace('data-en="© 2025', 'data-en="© 2026');

// ─── Write ──────────────────────────────────────────────────────────────
fs.writeFileSync(FILE, html, 'utf8');
console.log(`\nDone. ${originalLen} → ${html.length} bytes`);

// Verify no KI-Manager LMS references remain
const lmsRefs = (html.match(/KI-Manager|Classroom|Modul [1-8]|curriculum|Learner-Sicht|Admin-Sicht|Risk Classification|EU AI Act|Churn-Prognose|Knowledge Check|Lernstand|Governance-Aufgaben/gi) || []);
if (lmsRefs.length > 0) {
  console.log(`⚠ Found ${lmsRefs.length} potential LMS references remaining:`, [...new Set(lmsRefs)]);
} else {
  console.log('✓ No KI-Manager LMS references found');
}

// Verify broken section tag is fixed
if (html.includes('>tion class=')) {
  console.log('⚠ Broken <section tag still present!');
} else {
  console.log('✓ Section tag is clean');
}
