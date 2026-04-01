-- WMC Anforderungsportal - Enrich default template with production-grade fields
-- Adds questions commonly expected in real-world project requirement gathering (2026 best practices)

-- =============================================
-- Section 1: Project Overview — add stakeholder contact
-- =============================================
insert into anforderungsportal.template_questions (section_id, type, label, placeholder, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000001', 'text',
   '{"en":"Primary contact person (name & role)","de":"Hauptansprechpartner (Name & Rolle)","tr":"Birincil iletişim kişisi (ad & rol)","ru":"Основное контактное лицо (имя и роль)"}',
   '{"en":"e.g., Max Müller, Product Owner","de":"z.B. Max Müller, Product Owner","tr":"ör. Max Müller, Ürün Sahibi","ru":"напр. Макс Мюллер, Product Owner"}',
   5, true);

insert into anforderungsportal.template_questions (section_id, type, label, placeholder, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000001', 'textarea',
   '{"en":"What does success look like for this project? (KPIs / measurable goals)","de":"Wie sieht Erfolg für dieses Projekt aus? (KPIs / messbare Ziele)","tr":"Bu proje için başarı neye benzer? (KPI''lar / ölçülebilir hedefler)","ru":"Как выглядит успех для этого проекта? (KPI / измеримые цели)"}',
   '{"en":"e.g., 1000 active users in 3 months, 50% reduction in manual work","de":"z.B. 1000 aktive Nutzer in 3 Monaten, 50% Reduktion manueller Arbeit","tr":"ör. 3 ayda 1000 aktif kullanıcı","ru":"напр. 1000 активных пользователей за 3 месяца"}',
   6, false);

-- =============================================
-- Section 2: Functional Requirements — add user roles, integrations, multilingual
-- =============================================
insert into anforderungsportal.template_questions (section_id, type, label, placeholder, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000002', 'textarea',
   '{"en":"What user roles do you need? Describe each role and its permissions.","de":"Welche Benutzerrollen benötigen Sie? Beschreiben Sie jede Rolle und ihre Berechtigungen.","tr":"Hangi kullanıcı rollerine ihtiyacınız var? Her rolü ve izinlerini açıklayın.","ru":"Какие роли пользователей вам нужны? Опишите каждую роль и её права."}',
   '{"en":"e.g., Admin (full access), Editor (content management), Viewer (read-only)","de":"z.B. Admin (voller Zugriff), Redakteur (Inhaltsverwaltung), Betrachter (nur lesen)","tr":"ör. Admin (tam erişim), Editör (içerik yönetimi)","ru":"напр. Админ (полный доступ), Редактор (управление контентом)"}',
   3, true);

insert into anforderungsportal.template_questions (section_id, type, label, placeholder, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000002', 'textarea',
   '{"en":"Are there existing systems or third-party services to integrate with?","de":"Gibt es bestehende Systeme oder Drittanbieter-Dienste, die integriert werden müssen?","tr":"Entegre edilmesi gereken mevcut sistemler veya üçüncü taraf hizmetler var mı?","ru":"Есть ли существующие системы или сторонние сервисы для интеграции?"}',
   '{"en":"e.g., SAP, Salesforce, Stripe, Google Maps, existing REST API","de":"z.B. SAP, Salesforce, Stripe, Google Maps, bestehende REST-API","tr":"ör. SAP, Salesforce, Stripe, Google Maps","ru":"напр. SAP, Salesforce, Stripe, Google Maps, существующий REST API"}',
   4, false);

insert into anforderungsportal.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000002', 'radio',
   '{"en":"Should the app support multiple languages?","de":"Soll die App mehrere Sprachen unterstützen?","tr":"Uygulama birden fazla dili desteklemeli mi?","ru":"Должно ли приложение поддерживать несколько языков?"}',
   '[{"value":"no","label":{"en":"No, single language","de":"Nein, nur eine Sprache","tr":"Hayır, tek dil","ru":"Нет, один язык"}},{"value":"yes_few","label":{"en":"Yes, 2-3 languages","de":"Ja, 2-3 Sprachen","tr":"Evet, 2-3 dil","ru":"Да, 2-3 языка"}},{"value":"yes_many","label":{"en":"Yes, 5+ languages","de":"Ja, 5+ Sprachen","tr":"Evet, 5+ dil","ru":"Да, 5+ языков"}}]',
   5, false);

-- =============================================
-- Section 3: Design & UX — add accessibility, reference sites
-- =============================================
insert into anforderungsportal.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000003', 'multi_select',
   '{"en":"Accessibility requirements?","de":"Barrierefreiheitsanforderungen?","tr":"Erişilebilirlik gereksinimleri?","ru":"Требования к доступности?"}',
   '[{"value":"wcag_aa","label":{"en":"WCAG 2.2 AA","de":"WCAG 2.2 AA","tr":"WCAG 2.2 AA","ru":"WCAG 2.2 AA"}},{"value":"wcag_aaa","label":{"en":"WCAG 2.2 AAA","de":"WCAG 2.2 AAA","tr":"WCAG 2.2 AAA","ru":"WCAG 2.2 AAA"}},{"value":"screen_reader","label":{"en":"Screen Reader Support","de":"Screenreader-Unterstützung","tr":"Ekran Okuyucu Desteği","ru":"Поддержка экранных читалок"}},{"value":"keyboard","label":{"en":"Full Keyboard Navigation","de":"Volle Tastaturnavigation","tr":"Tam Klavye Navigasyonu","ru":"Полная навигация с клавиатуры"}},{"value":"not_required","label":{"en":"Not required","de":"Nicht erforderlich","tr":"Gerekli değil","ru":"Не требуется"}}]',
   2, false);

insert into anforderungsportal.template_questions (section_id, type, label, placeholder, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000003', 'textarea',
   '{"en":"Are there websites or apps you like the look and feel of? (Reference links)","de":"Gibt es Websites oder Apps, deren Look & Feel Ihnen gefällt? (Referenz-Links)","tr":"Görünüm ve hissiyatını beğendiğiniz web siteleri veya uygulamalar var mı?","ru":"Есть ли сайты или приложения, дизайн которых вам нравится? (Ссылки)"}',
   '{"en":"e.g., https://example.com — I like their navigation and color scheme","de":"z.B. https://example.com — Mir gefällt deren Navigation und Farbschema","tr":"ör. https://example.com — Navigasyonunu ve renk şemasını beğeniyorum","ru":"напр. https://example.com — Мне нравится их навигация и цветовая схема"}',
   3, false);

-- =============================================
-- Section 4: Technical — add hosting, performance, API needs
-- =============================================
insert into anforderungsportal.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000004', 'radio',
   '{"en":"Hosting preference?","de":"Hosting-Präferenz?","tr":"Barındırma tercihi?","ru":"Предпочтение по хостингу?"}',
   '[{"value":"cloud","label":{"en":"Cloud (AWS, Azure, GCP)","de":"Cloud (AWS, Azure, GCP)","tr":"Bulut (AWS, Azure, GCP)","ru":"Облако (AWS, Azure, GCP)"}},{"value":"onprem","label":{"en":"On-Premise / Self-Hosted","de":"On-Premise / Selbst gehostet","tr":"Şirket içi / Kendi sunucu","ru":"Локально / Собственный хостинг"}},{"value":"managed","label":{"en":"Managed (Vercel, Railway, etc.)","de":"Verwaltet (Vercel, Railway, etc.)","tr":"Yönetilen (Vercel, Railway, vb.)","ru":"Управляемый (Vercel, Railway, и т.д.)"}},{"value":"unsure","label":{"en":"No preference / Unsure","de":"Keine Präferenz / Unsicher","tr":"Tercih yok / Emin değilim","ru":"Без предпочтений / Не уверен"}}]',
   3, false);

insert into anforderungsportal.template_questions (section_id, type, label, placeholder, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000004', 'textarea',
   '{"en":"Performance expectations? (e.g., page load time, concurrent users, response time)","de":"Leistungserwartungen? (z.B. Ladezeit, gleichzeitige Nutzer, Antwortzeit)","tr":"Performans beklentileri? (ör. sayfa yükleme süresi, eşzamanlı kullanıcılar)","ru":"Ожидания по производительности? (напр. время загрузки, одновременные пользователи)"}',
   '{"en":"e.g., Page load under 2 seconds, support 500 concurrent users","de":"z.B. Seitenladezeit unter 2 Sekunden, 500 gleichzeitige Nutzer","tr":"ör. 2 saniye altında sayfa yüklemesi, 500 eşzamanlı kullanıcı","ru":"напр. Загрузка страницы менее 2 секунд, 500 одновременных пользователей"}',
   4, false);

-- =============================================
-- Section 5: Timeline & Budget — add phases, post-launch support
-- =============================================
insert into anforderungsportal.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000005', 'radio',
   '{"en":"Do you want phased delivery (milestones)?","de":"Möchten Sie eine phasenweise Lieferung (Meilensteine)?","tr":"Aşamalı teslimat (kilometre taşları) ister misiniz?","ru":"Хотите поэтапную доставку (вехи)?"}',
   '[{"value":"yes","label":{"en":"Yes, with regular milestones","de":"Ja, mit regelmäßigen Meilensteinen","tr":"Evet, düzenli kilometre taşlarıyla","ru":"Да, с регулярными вехами"}},{"value":"mvp_first","label":{"en":"MVP first, then iterations","de":"Erst MVP, dann Iterationen","tr":"Önce MVP, sonra iterasyonlar","ru":"Сначала MVP, потом итерации"}},{"value":"big_bang","label":{"en":"No, deliver everything at once","de":"Nein, alles auf einmal liefern","tr":"Hayır, her şeyi bir kerede teslim edin","ru":"Нет, доставить всё сразу"}}]',
   3, false);

insert into anforderungsportal.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000005', 'radio',
   '{"en":"Do you need ongoing maintenance and support after launch?","de":"Benötigen Sie laufende Wartung und Support nach dem Start?","tr":"Lansman sonrası sürekli bakım ve desteğe ihtiyacınız var mı?","ru":"Нужна ли вам постоянная поддержка после запуска?"}',
   '[{"value":"yes_sla","label":{"en":"Yes, with SLA (Service Level Agreement)","de":"Ja, mit SLA (Service Level Agreement)","tr":"Evet, SLA (Hizmet Düzeyi Sözleşmesi) ile","ru":"Да, с SLA"}},{"value":"yes_basic","label":{"en":"Yes, basic support","de":"Ja, grundlegender Support","tr":"Evet, temel destek","ru":"Да, базовая поддержка"}},{"value":"no","label":{"en":"No, one-time delivery","de":"Nein, einmalige Lieferung","tr":"Hayır, tek seferlik teslimat","ru":"Нет, одноразовая доставка"}},{"value":"unsure","label":{"en":"Not sure yet","de":"Noch unsicher","tr":"Henüz emin değilim","ru":"Пока не уверен"}}]',
   4, false);

-- =============================================
-- NEW Section 7: Compliance & Security
-- =============================================
insert into anforderungsportal.template_sections (id, template_id, title, description, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000007', '00000000-0000-0000-0000-000000000001',
   '{"en":"Compliance & Security","de":"Compliance & Sicherheit","tr":"Uyumluluk & Güvenlik","ru":"Соответствие и безопасность"}',
   '{"en":"Legal, regulatory, and security requirements","de":"Rechtliche, regulatorische und Sicherheitsanforderungen","tr":"Yasal, düzenleyici ve güvenlik gereksinimleri","ru":"Юридические, нормативные и требования безопасности"}',
   6, false);

insert into anforderungsportal.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000007', 'multi_select',
   '{"en":"Which industry regulations apply?","de":"Welche Branchenvorschriften gelten?","tr":"Hangi sektör düzenlemeleri geçerlidir?","ru":"Какие отраслевые нормы применимы?"}',
   '[{"value":"gdpr","label":{"en":"GDPR / DSGVO","de":"DSGVO","tr":"KVKK/GDPR","ru":"GDPR"}},{"value":"hipaa","label":{"en":"HIPAA (Healthcare)","de":"HIPAA (Gesundheitswesen)","tr":"HIPAA (Sağlık)","ru":"HIPAA (Здравоохранение)"}},{"value":"pci","label":{"en":"PCI DSS (Payments)","de":"PCI DSS (Zahlungen)","tr":"PCI DSS (Ödemeler)","ru":"PCI DSS (Платежи)"}},{"value":"iso27001","label":{"en":"ISO 27001","de":"ISO 27001","tr":"ISO 27001","ru":"ISO 27001"}},{"value":"soc2","label":{"en":"SOC 2","de":"SOC 2","tr":"SOC 2","ru":"SOC 2"}},{"value":"eidas","label":{"en":"eIDAS (Digital Identity)","de":"eIDAS (Digitale Identität)","tr":"eIDAS (Dijital Kimlik)","ru":"eIDAS (Цифровая идентификация)"}},{"value":"none","label":{"en":"None / Not sure","de":"Keine / Unsicher","tr":"Yok / Emin değilim","ru":"Нет / Не уверен"}}]',
   0, false);

insert into anforderungsportal.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000007', 'multi_select',
   '{"en":"Authentication & security requirements?","de":"Authentifizierungs- & Sicherheitsanforderungen?","tr":"Kimlik doğrulama ve güvenlik gereksinimleri?","ru":"Требования к аутентификации и безопасности?"}',
   '[{"value":"sso","label":{"en":"SSO (Single Sign-On)","de":"SSO (Single Sign-On)","tr":"SSO (Tek Oturum Açma)","ru":"SSO (Единый вход)"}},{"value":"mfa","label":{"en":"Multi-Factor Authentication","de":"Multi-Faktor-Authentifizierung","tr":"Çok Faktörlü Kimlik Doğrulama","ru":"Многофакторная аутентификация"}},{"value":"rbac","label":{"en":"Role-Based Access Control","de":"Rollenbasierte Zugriffskontrolle","tr":"Rol Tabanlı Erişim Kontrolü","ru":"Управление доступом на основе ролей"}},{"value":"audit_log","label":{"en":"Audit Logging","de":"Audit-Protokollierung","tr":"Denetim Günlüğü","ru":"Журнал аудита"}},{"value":"e2e_encryption","label":{"en":"End-to-End Encryption","de":"Ende-zu-Ende-Verschlüsselung","tr":"Uçtan Uca Şifreleme","ru":"Сквозное шифрование"}},{"value":"basic","label":{"en":"Basic (email + password)","de":"Einfach (E-Mail + Passwort)","tr":"Temel (e-posta + şifre)","ru":"Базовая (email + пароль)"}}]',
   1, false);

-- Move "Additional Information" to position 7 (after Compliance) so it's always last
update anforderungsportal.template_sections
  set order_index = 7
  where id = '00000000-0000-0000-0001-000000000006';

-- =============================================
-- Section 6 (Additional) — add competitor references
-- =============================================
insert into anforderungsportal.template_questions (section_id, type, label, placeholder, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000006', 'textarea',
   '{"en":"Are there competitors or similar products? What do you like/dislike about them?","de":"Gibt es Wettbewerber oder ähnliche Produkte? Was gefällt Ihnen / was nicht?","tr":"Rakipler veya benzer ürünler var mı? Neyi beğeniyorsunuz / beğenmiyorsunuz?","ru":"Есть ли конкуренты или аналогичные продукты? Что вам нравится / не нравится?"}',
   '{"en":"e.g., Competitor X has great search but poor mobile experience","de":"z.B. Wettbewerber X hat eine tolle Suche, aber schlechte mobile Erfahrung","tr":"ör. Rakip X''in arama özelliği harika ama mobil deneyimi zayıf","ru":"напр. У конкурента X отличный поиск, но плохой мобильный опыт"}',
   3, false);
