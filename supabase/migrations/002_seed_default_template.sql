-- WMC Anforderungsportal - Default App Requirements Template Seed
-- This inserts the default template used for new projects

-- Insert the default template (system-level, no org_id)
insert into public.requirement_templates (id, org_id, name, description, is_default) values
  ('00000000-0000-0000-0000-000000000001', null, 'App Requirements', 'Default template for collecting app/software requirements from clients. Covers project overview, features, design, technical needs, timeline, and additional information.', true);

-- Section 1: Project Overview
insert into public.template_sections (id, template_id, title, description, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001',
   '{"en":"Project Overview","de":"Projektübersicht","tr":"Projeye Genel Bakış","ru":"Обзор проекта"}',
   '{"en":"Tell us about your project","de":"Erzählen Sie uns von Ihrem Projekt","tr":"Projeniz hakkında bilgi verin","ru":"Расскажите нам о вашем проекте"}',
   0, true);

-- Section 2: Functional Requirements
insert into public.template_sections (id, template_id, title, description, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
   '{"en":"Functional Requirements","de":"Funktionale Anforderungen","tr":"İşlevsel Gereksinimler","ru":"Функциональные требования"}',
   '{"en":"What should the app do?","de":"Was soll die App können?","tr":"Uygulama ne yapmalı?","ru":"Что должно делать приложение?"}',
   1, true);

-- Section 3: Design & User Experience
insert into public.template_sections (id, template_id, title, description, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001',
   '{"en":"Design & User Experience","de":"Design & Benutzererfahrung","tr":"Tasarım ve Kullanıcı Deneyimi","ru":"Дизайн и UX"}',
   null, 2, false);

-- Section 4: Technical Requirements
insert into public.template_sections (id, template_id, title, description, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001',
   '{"en":"Technical Requirements","de":"Technische Anforderungen","tr":"Teknik Gereksinimler","ru":"Технические требования"}',
   null, 3, true);

-- Section 5: Timeline & Budget
insert into public.template_sections (id, template_id, title, description, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000001',
   '{"en":"Timeline & Budget","de":"Zeitplan & Budget","tr":"Zaman Çizelgesi ve Bütçe","ru":"Сроки и бюджет"}',
   null, 4, false);

-- Section 6: Additional Information
insert into public.template_sections (id, template_id, title, description, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000006', '00000000-0000-0000-0000-000000000001',
   '{"en":"Additional Information","de":"Zusätzliche Informationen","tr":"Ek Bilgiler","ru":"Дополнительная информация"}',
   null, 5, false);

-- =============================================
-- QUESTIONS
-- =============================================

-- Section 1: Project Overview
insert into public.template_questions (section_id, type, label, placeholder, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000001', 'text',
   '{"en":"What is the name of your project/app?","de":"Wie lautet der Name Ihres Projekts/Ihrer App?","tr":"Projenizin/uygulamanızın adı nedir?","ru":"Как называется ваш проект/приложение?"}',
   '{"en":"e.g., My Fitness App","de":"z.B. Meine Fitness-App","tr":"ör. Fitness Uygulamam","ru":"напр. Мое фитнес-приложение"}',
   0, true);

insert into public.template_questions (section_id, type, label, placeholder, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000001', 'textarea',
   '{"en":"Describe your project in 2-3 sentences","de":"Beschreiben Sie Ihr Projekt in 2-3 Sätzen","tr":"Projenizi 2-3 cümleyle açıklayın","ru":"Опишите ваш проект в 2-3 предложениях"}',
   null, 1, true);

insert into public.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000001', 'multi_select',
   '{"en":"Who is the target audience?","de":"Wer ist die Zielgruppe?","tr":"Hedef kitle kimdir?","ru":"Кто целевая аудитория?"}',
   '[{"value":"children","label":{"en":"Children","de":"Kinder","tr":"Çocuklar","ru":"Дети"}},{"value":"parents","label":{"en":"Parents","de":"Eltern","tr":"Ebeveynler","ru":"Родители"}},{"value":"teachers","label":{"en":"Teachers","de":"Lehrer","tr":"Öğretmenler","ru":"Учителя"}},{"value":"administrators","label":{"en":"Administrators","de":"Verwaltung","tr":"Yöneticiler","ru":"Администраторы"}},{"value":"general","label":{"en":"General Public","de":"Allgemeine Öffentlichkeit","tr":"Genel Halk","ru":"Широкая публика"}},{"value":"other","label":{"en":"Other","de":"Andere","tr":"Diğer","ru":"Другое"}}]',
   2, true);

insert into public.template_questions (section_id, type, label, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000001', 'textarea',
   '{"en":"What problem does this app solve?","de":"Welches Problem löst diese App?","tr":"Bu uygulama hangi sorunu çözer?","ru":"Какую проблему решает это приложение?"}',
   3, true);

insert into public.template_questions (section_id, type, label, placeholder, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000001', 'text',
   '{"en":"Do you have an existing app or website?","de":"Haben Sie eine bestehende App oder Website?","tr":"Mevcut bir uygulamanız veya web siteniz var mı?","ru":"У вас есть существующее приложение или сайт?"}',
   '{"en":"https://...","de":"https://...","tr":"https://...","ru":"https://..."}',
   4, false);

-- Section 2: Functional Requirements
insert into public.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000002', 'multi_select',
   '{"en":"What are the main features you need?","de":"Welche Hauptfunktionen benötigen Sie?","tr":"İhtiyacınız olan ana özellikler nelerdir?","ru":"Какие основные функции вам нужны?"}',
   '[{"value":"registration","label":{"en":"User Registration","de":"Benutzerregistrierung","tr":"Kullanıcı Kaydı","ru":"Регистрация"}},{"value":"login","label":{"en":"Login/Authentication","de":"Anmeldung","tr":"Giriş","ru":"Вход"}},{"value":"profiles","label":{"en":"User Profiles","de":"Benutzerprofile","tr":"Kullanıcı Profilleri","ru":"Профили"}},{"value":"search","label":{"en":"Search","de":"Suche","tr":"Arama","ru":"Поиск"}},{"value":"notifications","label":{"en":"Push Notifications","de":"Push-Benachrichtigungen","tr":"Bildirimler","ru":"Уведомления"}},{"value":"payments","label":{"en":"Payments","de":"Zahlungen","tr":"Ödemeler","ru":"Платежи"}},{"value":"messaging","label":{"en":"Messaging/Chat","de":"Nachrichten/Chat","tr":"Mesajlaşma","ru":"Чат"}},{"value":"calendar","label":{"en":"Calendar","de":"Kalender","tr":"Takvim","ru":"Календарь"}},{"value":"files","label":{"en":"File Sharing","de":"Dateien teilen","tr":"Dosya Paylaşımı","ru":"Файлы"}},{"value":"reports","label":{"en":"Reports","de":"Berichte","tr":"Raporlar","ru":"Отчеты"}},{"value":"admin","label":{"en":"Admin Panel","de":"Admin-Panel","tr":"Yönetim Paneli","ru":"Админ-панель"}}]',
   0, true);

insert into public.template_questions (section_id, type, label, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000002', 'textarea',
   '{"en":"Describe the most important feature in detail","de":"Beschreiben Sie die wichtigste Funktion im Detail","tr":"En önemli özelliği detaylı açıklayın","ru":"Подробно опишите самую важную функцию"}',
   1, true);

insert into public.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000002', 'radio',
   '{"en":"Should the app work offline?","de":"Soll die App offline funktionieren?","tr":"Uygulama çevrimdışı çalışmalı mı?","ru":"Должно ли приложение работать офлайн?"}',
   '[{"value":"yes","label":{"en":"Yes, fully","de":"Ja, vollständig","tr":"Evet, tamamen","ru":"Да, полностью"}},{"value":"partial","label":{"en":"Partially","de":"Teilweise","tr":"Kısmen","ru":"Частично"}},{"value":"no","label":{"en":"No, online only","de":"Nein, nur online","tr":"Hayır, yalnızca çevrimiçi","ru":"Нет, только онлайн"}}]',
   2, true);

-- Section 3: Design
insert into public.template_questions (section_id, type, label, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000003', 'file',
   '{"en":"Upload brand guidelines (logo, colors, fonts)","de":"Markenrichtlinien hochladen (Logo, Farben, Schriften)","tr":"Marka kılavuzunu yükleyin","ru":"Загрузите руководство по бренду"}',
   0, false);

insert into public.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000003', 'radio',
   '{"en":"Preferred design style?","de":"Bevorzugter Designstil?","tr":"Tercih edilen tasarım stili?","ru":"Предпочитаемый стиль дизайна?"}',
   '[{"value":"modern","label":{"en":"Modern / Minimal","de":"Modern / Minimal","tr":"Modern / Minimal","ru":"Современный / Минимальный"}},{"value":"playful","label":{"en":"Colorful / Playful","de":"Bunt / Verspielt","tr":"Renkli / Eğlenceli","ru":"Яркий / Игривый"}},{"value":"corporate","label":{"en":"Corporate / Professional","de":"Geschäftlich / Professionell","tr":"Kurumsal / Profesyonel","ru":"Корпоративный / Профессиональный"}},{"value":"unsure","label":{"en":"Not sure","de":"Nicht sicher","tr":"Emin değilim","ru":"Не уверен"}}]',
   1, false);

-- Section 4: Technical
insert into public.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000004', 'multi_select',
   '{"en":"Which platforms?","de":"Welche Plattformen?","tr":"Hangi platformlar?","ru":"Какие платформы?"}',
   '[{"value":"ios","label":{"en":"iOS","de":"iOS","tr":"iOS","ru":"iOS"}},{"value":"android","label":{"en":"Android","de":"Android","tr":"Android","ru":"Android"}},{"value":"web","label":{"en":"Web Browser","de":"Webbrowser","tr":"Web Tarayıcı","ru":"Веб-браузер"}},{"value":"desktop","label":{"en":"Desktop","de":"Desktop","tr":"Masaüstü","ru":"Десктоп"}}]',
   0, true);

insert into public.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000004', 'radio',
   '{"en":"Expected number of users?","de":"Erwartete Benutzeranzahl?","tr":"Beklenen kullanıcı sayısı?","ru":"Ожидаемое число пользователей?"}',
   '[{"value":"<100","label":{"en":"Less than 100","de":"Weniger als 100","tr":"100den az","ru":"Менее 100"}},{"value":"100-1000","label":{"en":"100-1,000","de":"100-1.000","tr":"100-1.000","ru":"100-1000"}},{"value":"1000-10000","label":{"en":"1,000-10,000","de":"1.000-10.000","tr":"1.000-10.000","ru":"1000-10000"}},{"value":"10000+","label":{"en":"10,000+","de":"10.000+","tr":"10.000+","ru":"10 000+"}}]',
   1, true);

insert into public.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000004', 'multi_select',
   '{"en":"Data privacy requirements?","de":"Datenschutzanforderungen?","tr":"Veri gizliliği gereksinimleri?","ru":"Требования к конфиденциальности?"}',
   '[{"value":"gdpr","label":{"en":"GDPR/DSGVO","de":"DSGVO","tr":"KVKK/GDPR","ru":"GDPR"}},{"value":"encryption","label":{"en":"Data Encryption","de":"Datenverschlüsselung","tr":"Veri Şifreleme","ru":"Шифрование"}},{"value":"export","label":{"en":"Data Export","de":"Datenexport","tr":"Veri Dışa Aktarma","ru":"Экспорт данных"}},{"value":"deletion","label":{"en":"Right to Deletion","de":"Recht auf Löschung","tr":"Silme Hakkı","ru":"Право на удаление"}}]',
   2, true);

-- Section 5: Timeline & Budget
insert into public.template_questions (section_id, type, label, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000005', 'date',
   '{"en":"When do you need the app ready?","de":"Wann benötigen Sie die App?","tr":"Uygulamayı ne zaman hazır olmasını istiyorsunuz?","ru":"Когда вам нужно готовое приложение?"}',
   0, false);

insert into public.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000005', 'radio',
   '{"en":"Budget range?","de":"Budgetrahmen?","tr":"Bütçe aralığı?","ru":"Бюджет?"}',
   '[{"value":"<5k","label":{"en":"Under €5,000","de":"Unter 5.000€","tr":"5.000€ altı","ru":"До €5 000"}},{"value":"5-15k","label":{"en":"€5-15K","de":"5-15.000€","tr":"5-15.000€","ru":"€5-15 тыс."}},{"value":"15-50k","label":{"en":"€15-50K","de":"15-50.000€","tr":"15-50.000€","ru":"€15-50 тыс."}},{"value":"50-100k","label":{"en":"€50-100K","de":"50-100.000€","tr":"50-100.000€","ru":"€50-100 тыс."}},{"value":"100k+","label":{"en":"€100K+","de":"100.000€+","tr":"100.000€+","ru":"€100 тыс.+"}},{"value":"unsure","label":{"en":"Not sure yet","de":"Noch unsicher","tr":"Henüz emin değilim","ru":"Пока не уверен"}}]',
   1, false);

insert into public.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000005', 'radio',
   '{"en":"What is more important?","de":"Was ist wichtiger?","tr":"Hangisi daha önemli?","ru":"Что важнее?"}',
   '[{"value":"speed","label":{"en":"Speed (MVP first)","de":"Geschwindigkeit (MVP zuerst)","tr":"Hız (önce MVP)","ru":"Скорость (сначала MVP)"}},{"value":"features","label":{"en":"Feature completeness","de":"Vollständigkeit","tr":"Özellik tamlığı","ru":"Полнота функций"}},{"value":"balance","label":{"en":"Balance of both","de":"Beides ausgewogen","tr":"Her ikisi dengeli","ru":"Баланс обоих"}}]',
   2, true);

-- Section 6: Additional
insert into public.template_questions (section_id, type, label, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000006', 'textarea',
   '{"en":"Anything else we should know?","de":"Gibt es noch etwas, das wir wissen sollten?","tr":"Bilmemiz gereken başka bir şey var mı?","ru":"Что еще нам следует знать?"}',
   0, false);

insert into public.template_questions (section_id, type, label, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000006', 'file',
   '{"en":"Upload reference documents or mockups","de":"Referenzdokumente oder Mockups hochladen","tr":"Referans belgelerini veya tasarımları yükleyin","ru":"Загрузите справочные документы или макеты"}',
   1, false);

insert into public.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000006', 'radio',
   '{"en":"Preferred communication channel?","de":"Bevorzugter Kommunikationskanal?","tr":"Tercih edilen iletişim kanalı?","ru":"Предпочтительный канал связи?"}',
   '[{"value":"email","label":{"en":"Email","de":"E-Mail","tr":"E-posta","ru":"Электронная почта"}},{"value":"phone","label":{"en":"Phone","de":"Telefon","tr":"Telefon","ru":"Телефон"}},{"value":"video","label":{"en":"Video Call","de":"Videoanruf","tr":"Video Görüşme","ru":"Видеозвонок"}},{"value":"inperson","label":{"en":"In-Person","de":"Persönlich","tr":"Yüz yüze","ru":"Лично"}}]',
   2, true);
