-- ============================================================
-- Migration 027: Improve default requirements template
--
-- Fixes:
--   WIDEA-14 — Target audience options were kindergarten-specific;
--              replaced with industry-agnostic options + free-text field.
--   WIDEA-15 — "Main features" question renamed to "Core Functions &
--              Features"; added "Other (please specify)" option + free
--              text follow-up question.
--   WIDEA-17 — Many analysis fields expected by Waleri were missing;
--              added dedicated sections for Market & Competitive Analysis,
--              Business Case & Potential, and Role & Rights Concept.
-- ============================================================

-- ============================================================
-- WIDEA-14: Replace narrow target-audience options
-- ============================================================

-- Update the label to be more neutral
UPDATE anforderungsportal.template_questions
SET
  label = '{"en":"Who is the target audience for this product?","de":"Wer ist die Zielgruppe dieses Produkts?","tr":"Bu ürünün hedef kitlesi kimdir?","ru":"Кто является целевой аудиторией этого продукта?"}',
  options = '[
    {"value":"end_users","label":{"en":"End Users / Consumers (B2C)","de":"Endnutzer / Konsumenten (B2C)","tr":"Son Kullanıcılar / Tüketiciler (B2C)","ru":"Конечные пользователи / Потребители (B2C)"}},
    {"value":"businesses","label":{"en":"Businesses / Organisations (B2B)","de":"Unternehmen / Organisationen (B2B)","tr":"İşletmeler / Kuruluşlar (B2B)","ru":"Компании / Организации (B2B)"}},
    {"value":"internal","label":{"en":"Internal Teams / Employees","de":"Interne Teams / Mitarbeiter","tr":"Dahili Ekipler / Çalışanlar","ru":"Внутренние команды / Сотрудники"}},
    {"value":"children","label":{"en":"Children / Young People","de":"Kinder / Jugendliche","tr":"Çocuklar / Gençler","ru":"Дети / Молодёжь"}},
    {"value":"seniors","label":{"en":"Elderly / Senior Users","de":"Ältere / Senioren","tr":"Yaşlı Kullanıcılar","ru":"Пожилые пользователи"}},
    {"value":"healthcare","label":{"en":"Healthcare Professionals","de":"Fachkräfte im Gesundheitswesen","tr":"Sağlık Profesyonelleri","ru":"Медицинские работники"}},
    {"value":"students","label":{"en":"Students & Educators","de":"Schüler, Studenten & Lehrkräfte","tr":"Öğrenciler ve Eğitimciler","ru":"Студенты и преподаватели"}},
    {"value":"government","label":{"en":"Government / Public Sector","de":"Behörden / Öffentlicher Sektor","tr":"Devlet / Kamu Sektörü","ru":"Государство / Государственный сектор"}},
    {"value":"general","label":{"en":"General Public","de":"Allgemeine Öffentlichkeit","tr":"Genel Halk","ru":"Широкая публика"}},
    {"value":"other","label":{"en":"Other (please specify below)","de":"Sonstige (bitte unten angeben)","tr":"Diğer (lütfen aşağıda belirtin)","ru":"Другое (укажите ниже)"}}
  ]'
WHERE section_id = '00000000-0000-0000-0001-000000000001'
  AND type = 'multi_select'
  AND label::text LIKE '%target audience%';

-- Add free-text fallback question so "Other" can be specified
-- (placed at order 3 to appear immediately after the multi_select at order 2)
INSERT INTO anforderungsportal.template_questions
  (section_id, type, label, placeholder, order_index, is_required)
VALUES
  ('00000000-0000-0000-0001-000000000001', 'textarea',
   '{"en":"If you selected \"Other\", please describe your target audience in more detail.","de":"Falls Sie \"Sonstige\" gewählt haben, beschreiben Sie Ihre Zielgruppe bitte genauer.","tr":"\"Diğer\" seçtiyseniz, hedef kitlenizi daha ayrıntılı açıklayın.","ru":"Если вы выбрали «Другое», опишите вашу целевую аудиторию подробнее."}',
   '{"en":"e.g., Small restaurant owners in Germany aged 30-50","de":"z.B. Kleinrestaurantbesitzer in Deutschland, 30-50 Jahre alt","tr":"ör. Almanya''da 30-50 yaş arası küçük restoran sahipleri","ru":"напр. Владельцы небольших ресторанов в Германии, возраст 30-50 лет"}',
   3, false);

-- Push existing questions from order 3 onwards up by 2 to make room
-- (the existing "What problem does this app solve?" was at 3, now at 5;
--  "Do you have an existing app?" was at 4, now at 6, etc.)
UPDATE anforderungsportal.template_questions
SET order_index = order_index + 2
WHERE section_id = '00000000-0000-0000-0001-000000000001'
  AND order_index >= 3
  -- Exclude the row we just inserted (order 3)
  AND label::text NOT LIKE '%Other%'
  AND label::text NOT LIKE '%Sonstige%'
  AND label::text NOT LIKE '%Diğer%'
  AND label::text NOT LIKE '%Другое%';

-- ============================================================
-- WIDEA-15: Rename "main features" and add free-text option
-- ============================================================

-- Rename the label and add "Other / Custom" option
UPDATE anforderungsportal.template_questions
SET
  label = '{"en":"What are the core functions and features you need?","de":"Welche Kernfunktionen und -features benötigen Sie?","tr":"İhtiyacınız olan temel işlevler ve özellikler nelerdir?","ru":"Какие ключевые функции и возможности вам нужны?"}',
  options = '[
    {"value":"registration","label":{"en":"User Registration / Onboarding","de":"Benutzerregistrierung / Onboarding","tr":"Kullanıcı Kaydı / Onboarding","ru":"Регистрация / Онбординг"}},
    {"value":"login","label":{"en":"Login & Authentication","de":"Anmeldung & Authentifizierung","tr":"Giriş & Kimlik Doğrulama","ru":"Вход и аутентификация"}},
    {"value":"profiles","label":{"en":"User Profiles & Settings","de":"Benutzerprofile & Einstellungen","tr":"Kullanıcı Profilleri & Ayarlar","ru":"Профили пользователей и настройки"}},
    {"value":"search","label":{"en":"Search & Filtering","de":"Suche & Filter","tr":"Arama & Filtreleme","ru":"Поиск и фильтрация"}},
    {"value":"notifications","label":{"en":"Push Notifications & Alerts","de":"Push-Benachrichtigungen & Alarme","tr":"Push Bildirimleri & Uyarılar","ru":"Push-уведомления и оповещения"}},
    {"value":"payments","label":{"en":"Payments & Billing","de":"Zahlungen & Abrechnung","tr":"Ödemeler & Faturalandırma","ru":"Платежи и выставление счетов"}},
    {"value":"messaging","label":{"en":"Messaging / Chat","de":"Nachrichten / Chat","tr":"Mesajlaşma / Sohbet","ru":"Сообщения / Чат"}},
    {"value":"calendar","label":{"en":"Calendar & Scheduling","de":"Kalender & Terminplanung","tr":"Takvim & Zamanlama","ru":"Календарь и планирование"}},
    {"value":"files","label":{"en":"File Management & Sharing","de":"Dateiverwaltung & -freigabe","tr":"Dosya Yönetimi & Paylaşımı","ru":"Управление и обмен файлами"}},
    {"value":"reports","label":{"en":"Reports & Analytics Dashboard","de":"Berichte & Analyse-Dashboard","tr":"Raporlar & Analiz Panosu","ru":"Отчёты и аналитическая панель"}},
    {"value":"admin","label":{"en":"Admin / Back-Office Panel","de":"Admin- / Back-Office-Panel","tr":"Yönetim / Arka Ofis Paneli","ru":"Административная / бэк-офис панель"}},
    {"value":"ai","label":{"en":"AI / Automation Features","de":"KI- / Automatisierungsfunktionen","tr":"Yapay Zeka / Otomasyon Özellikleri","ru":"ИИ / Функции автоматизации"}},
    {"value":"other","label":{"en":"Other / Custom (describe below)","de":"Sonstige / Eigene (unten beschreiben)","tr":"Diğer / Özel (aşağıda açıklayın)","ru":"Другое / Пользовательское (опишите ниже)"}}
  ]'
WHERE section_id = '00000000-0000-0000-0001-000000000002'
  AND type = 'multi_select'
  AND order_index = 0;

-- Add free-text question for custom features right after the multi_select
INSERT INTO anforderungsportal.template_questions
  (section_id, type, label, placeholder, order_index, is_required)
VALUES
  ('00000000-0000-0000-0001-000000000002', 'textarea',
   '{"en":"Describe any additional or custom features not listed above.","de":"Beschreiben Sie weitere oder eigene Funktionen, die oben nicht aufgeführt sind.","tr":"Yukarıda listelenmeyen ek veya özel özellikleri açıklayın.","ru":"Опишите дополнительные или нестандартные функции, не указанные выше."}',
   '{"en":"e.g., A gamified loyalty system where users earn points for each completed task","de":"z.B. Ein gamifiziertes Treueprogramm, bei dem Nutzer Punkte für erledigte Aufgaben sammeln","tr":"ör. Kullanıcıların her tamamlanan görev için puan kazandığı bir oyunlaştırılmış sadakat sistemi","ru":"напр. Геймифицированная система лояльности, где пользователи зарабатывают очки за выполненные задания"}',
   1, false);

-- Shift existing questions from order 1 onwards to make room
-- (only affect questions that are not the one we just inserted)
UPDATE anforderungsportal.template_questions
SET order_index = order_index + 1
WHERE section_id = '00000000-0000-0000-0001-000000000002'
  AND order_index >= 1
  AND type != 'textarea'
  -- skip newly inserted row (it's a textarea at order 1)
  AND label::text NOT LIKE '%additional or custom%'
  AND label::text NOT LIKE '%weitere oder eigene%';

-- ============================================================
-- WIDEA-17: Add missing analysis sections
--
-- New sections (appended after existing sections):
--   Section 8  — Market & Competitive Analysis
--   Section 9  — Business Case & Potential
--   Section 10 — Role & Rights Concept
--   Section 11 — Sources & References
--
-- "Additional Information" stays last by bumping it to order 11
-- (it was already moved to 7 in migration 014; bump to 12 now)
-- ============================================================

-- Move "Additional Information" (section 006) to stay last
UPDATE anforderungsportal.template_sections
SET order_index = 12
WHERE id = '00000000-0000-0000-0001-000000000006';

-- ── Section 8: Market & Competitive Analysis ─────────────────
INSERT INTO anforderungsportal.template_sections
  (id, template_id, title, description, order_index, is_required)
VALUES
  ('00000000-0000-0000-0001-000000000008',
   '00000000-0000-0000-0000-000000000001',
   '{"en":"Market & Competitive Analysis","de":"Markt- & Wettbewerbsanalyse","tr":"Pazar & Rekabet Analizi","ru":"Рыночный и конкурентный анализ"}',
   '{"en":"Understanding your market landscape and competitors","de":"Verständnis Ihres Marktes und der Wettbewerber","tr":"Pazar ortamınızı ve rakiplerinizi anlamak","ru":"Понимание рыночной среды и конкурентов"}',
   8, false);

INSERT INTO anforderungsportal.template_questions
  (section_id, type, label, placeholder, order_index, is_required)
VALUES
  ('00000000-0000-0000-0001-000000000008', 'textarea',
   '{"en":"Who are your main competitors or similar products already on the market?","de":"Wer sind Ihre Hauptwettbewerber oder ähnliche Produkte auf dem Markt?","tr":"Ana rakipleriniz veya piyasadaki benzer ürünler nelerdir?","ru":"Кто ваши основные конкуренты или аналогичные продукты на рынке?"}',
   '{"en":"e.g., App X (strong mobile UX, weak admin tools), App Y (good pricing, no offline mode)","de":"z.B. App X (starke mobile UX, schwache Admin-Tools), App Y (gutes Pricing, kein Offline-Modus)","tr":"ör. Uygulama X (güçlü mobil UX, zayıf yönetim araçları), Uygulama Y (iyi fiyatlandırma, çevrimdışı yok)","ru":"напр. Приложение X (сильный мобильный UX, слабые инструменты администрирования)"}',
   0, false);

INSERT INTO anforderungsportal.template_questions
  (section_id, type, label, placeholder, order_index, is_required)
VALUES
  ('00000000-0000-0000-0001-000000000008', 'textarea',
   '{"en":"What is your unique value proposition? What makes this solution better or different?","de":"Was ist Ihr einzigartiges Wertangebot? Was macht diese Lösung besser oder anders?","tr":"Benzersiz değer teklifiniz nedir? Bu çözümü daha iyi veya farklı yapan nedir?","ru":"Каково ваше уникальное торговое предложение? Чем это решение лучше или отличается?"}',
   '{"en":"e.g., Only solution with real-time multilingual support and offline-first architecture","de":"z.B. Einzige Lösung mit Echtzeit-Mehrsprachigkeit und Offline-first-Architektur","tr":"ör. Gerçek zamanlı çok dilli destek ve çevrimdışı-önce mimariye sahip tek çözüm","ru":"напр. Единственное решение с поддержкой многоязычности в реальном времени"}',
   1, true);

INSERT INTO anforderungsportal.template_questions
  (section_id, type, label, placeholder, order_index, is_required)
VALUES
  ('00000000-0000-0000-0001-000000000008', 'textarea',
   '{"en":"How large is your target market? Do you have any market research or data?","de":"Wie groß ist Ihr Zielmarkt? Haben Sie Marktforschung oder Daten?","tr":"Hedef pazarınız ne kadar büyük? Pazar araştırmanız veya veriniz var mı?","ru":"Насколько велик ваш целевой рынок? Есть ли у вас рыночные исследования или данные?"}',
   '{"en":"e.g., ~50,000 SMEs in Germany, based on Statista 2025 report","de":"z.B. ca. 50.000 KMUs in Deutschland, basierend auf Statista-Bericht 2025","tr":"ör. Statista 2025 raporuna göre Almanya''da ~50.000 KOBİ","ru":"напр. ~50 000 малых и средних предприятий в Германии, по данным Statista 2025"}',
   2, false);

INSERT INTO anforderungsportal.template_questions
  (section_id, type, label, options, order_index, is_required)
VALUES
  ('00000000-0000-0000-0001-000000000008', 'radio',
   '{"en":"Have you validated this idea with real users or potential customers?","de":"Haben Sie diese Idee mit echten Nutzern oder potenziellen Kunden validiert?","tr":"Bu fikri gerçek kullanıcılarla veya potansiyel müşterilerle doğruladınız mı?","ru":"Валидировали ли вы эту идею с реальными пользователями или потенциальными клиентами?"}',
   '[
     {"value":"yes_formal","label":{"en":"Yes – formal research / surveys","de":"Ja – formale Forschung / Umfragen","tr":"Evet – resmi araştırma / anketler","ru":"Да — формальные исследования / опросы"}},
     {"value":"yes_informal","label":{"en":"Yes – informal interviews / feedback","de":"Ja – informelle Interviews / Feedback","tr":"Evet – gayri resmi görüşmeler / geri bildirim","ru":"Да — неформальные интервью / обратная связь"}},
     {"value":"in_progress","label":{"en":"Validation is in progress","de":"Validierung läuft noch","tr":"Doğrulama devam ediyor","ru":"Валидация в процессе"}},
     {"value":"no","label":{"en":"Not yet","de":"Noch nicht","tr":"Henüz hayır","ru":"Ещё нет"}}
   ]',
   3, false);

-- ── Section 9: Business Case & Potential ─────────────────────
INSERT INTO anforderungsportal.template_sections
  (id, template_id, title, description, order_index, is_required)
VALUES
  ('00000000-0000-0000-0001-000000000009',
   '00000000-0000-0000-0000-000000000001',
   '{"en":"Business Case & Potential","de":"Business Case & Potenzial","tr":"İş Gerekçesi & Potansiyel","ru":"Бизнес-кейс и потенциал"}',
   '{"en":"Commercial value, return on investment, and growth potential","de":"Kommerzieller Wert, Return on Investment und Wachstumspotenzial","tr":"Ticari değer, yatırım getirisi ve büyüme potansiyeli","ru":"Коммерческая ценность, рентабельность инвестиций и потенциал роста"}',
   9, false);

INSERT INTO anforderungsportal.template_questions
  (section_id, type, label, placeholder, order_index, is_required)
VALUES
  ('00000000-0000-0000-0001-000000000009', 'textarea',
   '{"en":"What is the business model? How will this product generate value or revenue?","de":"Was ist das Geschäftsmodell? Wie soll das Produkt Wert oder Umsatz generieren?","tr":"İş modeli nedir? Bu ürün nasıl değer veya gelir yaratacak?","ru":"Какова бизнес-модель? Как этот продукт будет генерировать ценность или доход?"}',
   '{"en":"e.g., SaaS subscription €29/month, one-time license, advertising-supported, internal cost reduction","de":"z.B. SaaS-Abonnement 29 €/Monat, Einmallizenz, werbebasiert, interne Kosteneinsparung","tr":"ör. SaaS aboneliği 29€/ay, tek seferlik lisans, reklam destekli, dahili maliyet azaltma","ru":"напр. SaaS-подписка €29/мес, единовременная лицензия, реклама, внутренняя экономия затрат"}',
   0, true);

INSERT INTO anforderungsportal.template_questions
  (section_id, type, label, placeholder, order_index, is_required)
VALUES
  ('00000000-0000-0000-0001-000000000009', 'textarea',
   '{"en":"What ROI or measurable business impact do you expect from this project?","de":"Welchen ROI oder messbaren Geschäftlichen Impact erwarten Sie von diesem Projekt?","tr":"Bu projeden beklediğiniz ROI veya ölçülebilir iş etkisi nedir?","ru":"Какой ROI или измеримое бизнес-влияние вы ожидаете от проекта?"}',
   '{"en":"e.g., 30% reduction in manual processing time, 20% increase in customer retention","de":"z.B. 30% Reduktion manueller Bearbeitungszeit, 20% Steigerung der Kundenbindung","tr":"ör. %30 manuel işlem süresinde azalma, %20 müşteri elde tutma oranı artışı","ru":"напр. Сокращение ручной обработки на 30%, повышение удержания клиентов на 20%"}',
   1, false);

INSERT INTO anforderungsportal.template_questions
  (section_id, type, label, options, order_index, is_required)
VALUES
  ('00000000-0000-0000-0001-000000000009', 'radio',
   '{"en":"How urgent is this project to the business?","de":"Wie dringend ist dieses Projekt für das Unternehmen?","tr":"Bu proje işletme için ne kadar acil?","ru":"Насколько срочен этот проект для бизнеса?"}',
   '[
     {"value":"critical","label":{"en":"Critical – blocking current operations","de":"Kritisch – blockiert aktuelle Abläufe","tr":"Kritik – mevcut operasyonları engelliyor","ru":"Критический — блокирует текущие операции"}},
     {"value":"high","label":{"en":"High – significant competitive disadvantage without it","de":"Hoch – ohne es erheblicher Wettbewerbsnachteil","tr":"Yüksek – olmadan önemli rekabet dezavantajı","ru":"Высокий — серьёзный конкурентный недостаток без него"}},
     {"value":"medium","label":{"en":"Medium – important but not blocking","de":"Mittel – wichtig, aber nicht blockierend","tr":"Orta – önemli ama engellemiyor","ru":"Средний — важно, но не блокирует"}},
     {"value":"low","label":{"en":"Low – nice to have","de":"Niedrig – schön zu haben","tr":"Düşük – olsa iyi olur","ru":"Низкий — было бы неплохо"}}
   ]',
   2, false);

INSERT INTO anforderungsportal.template_questions
  (section_id, type, label, placeholder, order_index, is_required)
VALUES
  ('00000000-0000-0000-0001-000000000009', 'textarea',
   '{"en":"Who are the key internal stakeholders and decision-makers for this project?","de":"Wer sind die wichtigsten internen Stakeholder und Entscheider für dieses Projekt?","tr":"Bu projenin kilit iç paydaşları ve karar alıcıları kimlerdir?","ru":"Кто являются ключевыми внутренними заинтересованными сторонами и принимающими решения?"}',
   '{"en":"e.g., CEO (final sign-off), Head of Marketing (feature owner), IT Lead (technical approval)","de":"z.B. CEO (finale Freigabe), Marketingleiter (Feature-Owner), IT-Leiter (technische Freigabe)","tr":"ör. CEO (nihai onay), Pazarlama Müdürü (özellik sahibi), IT Müdürü (teknik onay)","ru":"напр. Генеральный директор (финальное одобрение), Руководитель маркетинга (владелец функции)"}',
   3, false);

-- ── Section 10: Role & Rights Concept ────────────────────────
INSERT INTO anforderungsportal.template_sections
  (id, template_id, title, description, order_index, is_required)
VALUES
  ('00000000-0000-0000-0001-000000000010',
   '00000000-0000-0000-0000-000000000001',
   '{"en":"Role & Rights Concept","de":"Rollen- & Berechtigungskonzept","tr":"Rol & Yetki Konsepti","ru":"Концепция ролей и прав доступа"}',
   '{"en":"User types, permissions structure, and access control model","de":"Benutzertypen, Berechtigungsstruktur und Zugangskontrollmodell","tr":"Kullanıcı türleri, izin yapısı ve erişim kontrol modeli","ru":"Типы пользователей, структура прав доступа и модель управления доступом"}',
   10, false);

INSERT INTO anforderungsportal.template_questions
  (section_id, type, label, placeholder, order_index, is_required)
VALUES
  ('00000000-0000-0000-0001-000000000010', 'textarea',
   '{"en":"What user roles do you need? List each role and describe what it can and cannot do.","de":"Welche Benutzerrollen benötigen Sie? Nennen Sie jede Rolle und beschreiben Sie, was sie darf und was nicht.","tr":"Hangi kullanıcı rollerine ihtiyacınız var? Her rolü listeleyin ve yapabileceklerini/yapamayacaklarını açıklayın.","ru":"Какие роли пользователей вам нужны? Перечислите каждую роль и опишите её права и ограничения."}',
   '{"en":"e.g.,\n• Super Admin: full access, user management, system config\n• Manager: view all data, create reports, cannot delete\n• Employee: view and edit own data only\n• Guest: read-only, no login required","de":"z.B.,\n• Super Admin: voller Zugriff, Nutzerverwaltung\n• Manager: alle Daten einsehen, Berichte erstellen, nicht löschen\n• Mitarbeiter: nur eigene Daten\n• Gast: nur lesen","tr":"ör.,\n• Süper Admin: tam erişim, kullanıcı yönetimi\n• Yönetici: tüm verileri görme, raporlar oluşturma\n• Çalışan: yalnızca kendi verileri\n• Misafir: salt okunur","ru":"напр.,\n• Супер-Администратор: полный доступ\n• Менеджер: просмотр всех данных, создание отчётов\n• Сотрудник: только свои данные\n• Гость: только чтение"}',
   0, true);

INSERT INTO anforderungsportal.template_questions
  (section_id, type, label, options, order_index, is_required)
VALUES
  ('00000000-0000-0000-0001-000000000010', 'multi_select',
   '{"en":"What type of access control model do you need?","de":"Welches Zugriffskontrollmodell benötigen Sie?","tr":"Ne tür bir erişim kontrol modeline ihtiyacınız var?","ru":"Какой тип модели контроля доступа вам нужен?"}',
   '[
     {"value":"rbac","label":{"en":"Role-Based (RBAC) – permissions tied to role","de":"Rollenbasiert (RBAC) – Berechtigungen an Rolle geknüpft","tr":"Rol Tabanlı (RBAC) – izinler role bağlı","ru":"На основе ролей (RBAC)"}},
     {"value":"abac","label":{"en":"Attribute-Based (ABAC) – fine-grained by attributes","de":"Attributbasiert (ABAC) – feingranular nach Attributen","tr":"Nitelik Tabanlı (ABAC) – niteliklere göre ayrıntılı","ru":"На основе атрибутов (ABAC)"}},
     {"value":"simple","label":{"en":"Simple admin / non-admin split","de":"Einfache Admin- / Nicht-Admin-Aufteilung","tr":"Basit yönetici / yönetici olmayan ayrımı","ru":"Простое разделение администратор / не администратор"}},
     {"value":"public","label":{"en":"Mostly public – minimal access control needed","de":"Überwiegend öffentlich – minimale Zugriffskontrolle","tr":"Büyük ölçüde kamuya açık – minimal erişim kontrolü","ru":"В основном публичный — минимальный контроль доступа"}},
     {"value":"unsure","label":{"en":"Not sure – need guidance","de":"Unsicher – benötige Beratung","tr":"Emin değilim – rehberliğe ihtiyacım var","ru":"Не уверен — нужна консультация"}}
   ]',
   1, false);

INSERT INTO anforderungsportal.template_questions
  (section_id, type, label, placeholder, order_index, is_required)
VALUES
  ('00000000-0000-0000-0001-000000000010', 'textarea',
   '{"en":"Are there any special access restrictions or data visibility rules? (e.g., department-level isolation, tenant-based access)","de":"Gibt es besondere Zugriffsbeschränkungen oder Datensichtbarkeitsregeln? (z.B. Abteilungsisolierung, mandantenbasierter Zugriff)","tr":"Özel erişim kısıtlamaları veya veri görünürlüğü kuralları var mı? (ör. departman izolasyonu, kiracı tabanlı erişim)","ru":"Есть ли особые ограничения доступа или правила видимости данных? (напр. изоляция по отделам, мультиарендность)"}',
   '{"en":"e.g., Each branch manager can only see data from their own branch","de":"z.B. Jeder Filialleiter sieht nur Daten seiner eigenen Filiale","tr":"ör. Her şube müdürü yalnızca kendi şubesinin verilerini görebilir","ru":"напр. Каждый менеджер филиала видит только данные своего филиала"}',
   2, false);

-- ── Section 11: Sources & References ─────────────────────────
INSERT INTO anforderungsportal.template_sections
  (id, template_id, title, description, order_index, is_required)
VALUES
  ('00000000-0000-0000-0001-000000000011',
   '00000000-0000-0000-0000-000000000001',
   '{"en":"Sources & References","de":"Quellen & Referenzen","tr":"Kaynaklar & Referanslar","ru":"Источники и ссылки"}',
   '{"en":"Documentation, research, and prior work that informs this project","de":"Dokumentation, Forschung und Vorarbeiten, die dieses Projekt beeinflussen","tr":"Bu projeyi destekleyen belgeler, araştırmalar ve önceki çalışmalar","ru":"Документация, исследования и предыдущие наработки, влияющие на проект"}',
   11, false);

INSERT INTO anforderungsportal.template_questions
  (section_id, type, label, placeholder, order_index, is_required)
VALUES
  ('00000000-0000-0000-0001-000000000011', 'textarea',
   '{"en":"List any existing documentation, research reports, user surveys, or analysis relevant to this project.","de":"Listen Sie alle vorhandenen Dokumentationen, Forschungsberichte, Nutzerbefragungen oder Analysen auf, die für dieses Projekt relevant sind.","tr":"Bu proje için ilgili mevcut belgeleri, araştırma raporlarını, kullanıcı anketlerini veya analizleri listeleyin.","ru":"Перечислите все существующие документы, исследовательские отчёты, пользовательские опросы или анализы, относящиеся к проекту."}',
   '{"en":"e.g., Internal process audit (2024), customer survey results (80% want mobile app), competitor benchmark study","de":"z.B. Internes Prozessaudit (2024), Kundenbefragungsergebnisse (80% wünschen mobile App), Wettbewerber-Benchmark","tr":"ör. İç süreç denetimi (2024), müşteri anketi sonuçları (%80 mobil uygulama istiyor)","ru":"напр. Внутренний аудит процессов (2024), результаты опроса клиентов (80% хотят мобильное приложение)"}',
   0, false);

INSERT INTO anforderungsportal.template_questions
  (section_id, type, label, placeholder, order_index, is_required)
VALUES
  ('00000000-0000-0000-0001-000000000011', 'file',
   '{"en":"Upload any supporting documents (research reports, wireframes, process diagrams, surveys)","de":"Laden Sie unterstützende Dokumente hoch (Forschungsberichte, Wireframes, Prozessdiagramme, Umfragen)","tr":"Destekleyici belgeleri yükleyin (araştırma raporları, tel kafesler, süreç diyagramları, anketler)","ru":"Загрузите вспомогательные документы (исследовательские отчёты, вайрфреймы, диаграммы процессов)"}',
   null,
   1, false);

INSERT INTO anforderungsportal.template_questions
  (section_id, type, label, placeholder, order_index, is_required)
VALUES
  ('00000000-0000-0000-0001-000000000011', 'text',
   '{"en":"Link to any online resources, shared drives, or relevant external documents","de":"Link zu Online-Ressourcen, freigegebenen Laufwerken oder relevanten externen Dokumenten","tr":"Çevrimiçi kaynaklara, paylaşılan sürücülere veya ilgili harici belgelere bağlantı","ru":"Ссылка на онлайн-ресурсы, общие диски или соответствующие внешние документы"}',
   '{"en":"https://drive.google.com/... or https://onedrive.live.com/...","de":"https://drive.google.com/... oder https://onedrive.live.com/...","tr":"https://drive.google.com/... veya https://onedrive.live.com/...","ru":"https://drive.google.com/... или https://onedrive.live.com/..."}',
   2, false);
