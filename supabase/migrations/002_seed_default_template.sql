-- WMC Anforderungsportal - Default App Requirements Template Seed
-- This inserts the default template used for new projects

-- Insert the default template (system-level, no org_id)
insert into anforderungsportal.requirement_templates (id, org_id, name, description, is_default) values
  ('00000000-0000-0000-0000-000000000001', null, 'App Requirements', 'Default template for collecting app/software requirements from clients. Covers project overview, features, design, technical needs, timeline, and additional information.', true);

-- Section 1: Project Overview
insert into anforderungsportal.template_sections (id, template_id, title, description, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001',
   '{"en":"Project Overview","de":"ProjektÃ¼bersicht","tr":"Projeye Genel BakÄ±ÅŸ","ru":"ÐžÐ±Ð·Ð¾Ñ€ Ð¿Ñ€Ð¾ÐµÐºÑ‚Ð°"}',
   '{"en":"Tell us about your project","de":"ErzÃ¤hlen Sie uns von Ihrem Projekt","tr":"Projeniz hakkÄ±nda bilgi verin","ru":"Ð Ð°ÑÑÐºÐ°Ð¶Ð¸Ñ‚Ðµ Ð½Ð°Ð¼ Ð¾ Ð²Ð°ÑˆÐµÐ¼ Ð¿Ñ€Ð¾ÐµÐºÑ‚Ðµ"}',
   0, true);

-- Section 2: Functional Requirements
insert into anforderungsportal.template_sections (id, template_id, title, description, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
   '{"en":"Functional Requirements","de":"Funktionale Anforderungen","tr":"Ä°ÅŸlevsel Gereksinimler","ru":"Ð¤ÑƒÐ½ÐºÑ†Ð¸Ð¾Ð½Ð°Ð»ÑŒÐ½Ñ‹Ðµ Ñ‚Ñ€ÐµÐ±Ð¾Ð²Ð°Ð½Ð¸Ñ"}',
   '{"en":"What should the app do?","de":"Was soll die App kÃ¶nnen?","tr":"Uygulama ne yapmalÄ±?","ru":"Ð§Ñ‚Ð¾ Ð´Ð¾Ð»Ð¶Ð½Ð¾ Ð´ÐµÐ»Ð°Ñ‚ÑŒ Ð¿Ñ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ðµ?"}',
   1, true);

-- Section 3: Design & User Experience
insert into anforderungsportal.template_sections (id, template_id, title, description, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001',
   '{"en":"Design & User Experience","de":"Design & Benutzererfahrung","tr":"TasarÄ±m ve KullanÄ±cÄ± Deneyimi","ru":"Ð”Ð¸Ð·Ð°Ð¹Ð½ Ð¸ UX"}',
   null, 2, false);

-- Section 4: Technical Requirements
insert into anforderungsportal.template_sections (id, template_id, title, description, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001',
   '{"en":"Technical Requirements","de":"Technische Anforderungen","tr":"Teknik Gereksinimler","ru":"Ð¢ÐµÑ…Ð½Ð¸Ñ‡ÐµÑÐºÐ¸Ðµ Ñ‚Ñ€ÐµÐ±Ð¾Ð²Ð°Ð½Ð¸Ñ"}',
   null, 3, true);

-- Section 5: Timeline & Budget
insert into anforderungsportal.template_sections (id, template_id, title, description, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000001',
   '{"en":"Timeline & Budget","de":"Zeitplan & Budget","tr":"Zaman Ã‡izelgesi ve BÃ¼tÃ§e","ru":"Ð¡Ñ€Ð¾ÐºÐ¸ Ð¸ Ð±ÑŽÐ´Ð¶ÐµÑ‚"}',
   null, 4, false);

-- Section 6: Additional Information
insert into anforderungsportal.template_sections (id, template_id, title, description, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000006', '00000000-0000-0000-0000-000000000001',
   '{"en":"Additional Information","de":"ZusÃ¤tzliche Informationen","tr":"Ek Bilgiler","ru":"Ð”Ð¾Ð¿Ð¾Ð»Ð½Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ð°Ñ Ð¸Ð½Ñ„Ð¾Ñ€Ð¼Ð°Ñ†Ð¸Ñ"}',
   null, 5, false);

-- =============================================
-- QUESTIONS
-- =============================================

-- Section 1: Project Overview
insert into anforderungsportal.template_questions (section_id, type, label, placeholder, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000001', 'text',
   '{"en":"What is the name of your project/app?","de":"Wie lautet der Name Ihres Projekts/Ihrer App?","tr":"Projenizin/uygulamanÄ±zÄ±n adÄ± nedir?","ru":"ÐšÐ°Ðº Ð½Ð°Ð·Ñ‹Ð²Ð°ÐµÑ‚ÑÑ Ð²Ð°Ñˆ Ð¿Ñ€Ð¾ÐµÐºÑ‚/Ð¿Ñ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ðµ?"}',
   '{"en":"e.g., My Fitness App","de":"z.B. Meine Fitness-App","tr":"Ã¶r. Fitness Uygulamam","ru":"Ð½Ð°Ð¿Ñ€. ÐœÐ¾Ðµ Ñ„Ð¸Ñ‚Ð½ÐµÑ-Ð¿Ñ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ðµ"}',
   0, true);

insert into anforderungsportal.template_questions (section_id, type, label, placeholder, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000001', 'textarea',
   '{"en":"Describe your project in 2-3 sentences","de":"Beschreiben Sie Ihr Projekt in 2-3 SÃ¤tzen","tr":"Projenizi 2-3 cÃ¼mleyle aÃ§Ä±klayÄ±n","ru":"ÐžÐ¿Ð¸ÑˆÐ¸Ñ‚Ðµ Ð²Ð°Ñˆ Ð¿Ñ€Ð¾ÐµÐºÑ‚ Ð² 2-3 Ð¿Ñ€ÐµÐ´Ð»Ð¾Ð¶ÐµÐ½Ð¸ÑÑ…"}',
   null, 1, true);

insert into anforderungsportal.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000001', 'multi_select',
   '{"en":"Who is the target audience?","de":"Wer ist die Zielgruppe?","tr":"Hedef kitle kimdir?","ru":"ÐšÑ‚Ð¾ Ñ†ÐµÐ»ÐµÐ²Ð°Ñ Ð°ÑƒÐ´Ð¸Ñ‚Ð¾Ñ€Ð¸Ñ?"}',
   '[{"value":"children","label":{"en":"Children","de":"Kinder","tr":"Ã‡ocuklar","ru":"Ð”ÐµÑ‚Ð¸"}},{"value":"parents","label":{"en":"Parents","de":"Eltern","tr":"Ebeveynler","ru":"Ð Ð¾Ð´Ð¸Ñ‚ÐµÐ»Ð¸"}},{"value":"teachers","label":{"en":"Teachers","de":"Lehrer","tr":"Ã–ÄŸretmenler","ru":"Ð£Ñ‡Ð¸Ñ‚ÐµÐ»Ñ"}},{"value":"administrators","label":{"en":"Administrators","de":"Verwaltung","tr":"YÃ¶neticiler","ru":"ÐÐ´Ð¼Ð¸Ð½Ð¸ÑÑ‚Ñ€Ð°Ñ‚Ð¾Ñ€Ñ‹"}},{"value":"general","label":{"en":"General Public","de":"Allgemeine Ã–ffentlichkeit","tr":"Genel Halk","ru":"Ð¨Ð¸Ñ€Ð¾ÐºÐ°Ñ Ð¿ÑƒÐ±Ð»Ð¸ÐºÐ°"}},{"value":"other","label":{"en":"Other","de":"Andere","tr":"DiÄŸer","ru":"Ð”Ñ€ÑƒÐ³Ð¾Ðµ"}}]',
   2, true);

insert into anforderungsportal.template_questions (section_id, type, label, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000001', 'textarea',
   '{"en":"What problem does this app solve?","de":"Welches Problem lÃ¶st diese App?","tr":"Bu uygulama hangi sorunu Ã§Ã¶zer?","ru":"ÐšÐ°ÐºÑƒÑŽ Ð¿Ñ€Ð¾Ð±Ð»ÐµÐ¼Ñƒ Ñ€ÐµÑˆÐ°ÐµÑ‚ ÑÑ‚Ð¾ Ð¿Ñ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ðµ?"}',
   3, true);

insert into anforderungsportal.template_questions (section_id, type, label, placeholder, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000001', 'text',
   '{"en":"Do you have an existing app or website?","de":"Haben Sie eine bestehende App oder Website?","tr":"Mevcut bir uygulamanÄ±z veya web siteniz var mÄ±?","ru":"Ð£ Ð²Ð°Ñ ÐµÑÑ‚ÑŒ ÑÑƒÑ‰ÐµÑÑ‚Ð²ÑƒÑŽÑ‰ÐµÐµ Ð¿Ñ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ðµ Ð¸Ð»Ð¸ ÑÐ°Ð¹Ñ‚?"}',
   '{"en":"https://...","de":"https://...","tr":"https://...","ru":"https://..."}',
   4, false);

-- Section 2: Functional Requirements
insert into anforderungsportal.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000002', 'multi_select',
   '{"en":"What are the main features you need?","de":"Welche Hauptfunktionen benÃ¶tigen Sie?","tr":"Ä°htiyacÄ±nÄ±z olan ana Ã¶zellikler nelerdir?","ru":"ÐšÐ°ÐºÐ¸Ðµ Ð¾ÑÐ½Ð¾Ð²Ð½Ñ‹Ðµ Ñ„ÑƒÐ½ÐºÑ†Ð¸Ð¸ Ð²Ð°Ð¼ Ð½ÑƒÐ¶Ð½Ñ‹?"}',
   '[{"value":"registration","label":{"en":"User Registration","de":"Benutzerregistrierung","tr":"KullanÄ±cÄ± KaydÄ±","ru":"Ð ÐµÐ³Ð¸ÑÑ‚Ñ€Ð°Ñ†Ð¸Ñ"}},{"value":"login","label":{"en":"Login/Authentication","de":"Anmeldung","tr":"GiriÅŸ","ru":"Ð’Ñ…Ð¾Ð´"}},{"value":"profiles","label":{"en":"User Profiles","de":"Benutzerprofile","tr":"KullanÄ±cÄ± Profilleri","ru":"ÐŸÑ€Ð¾Ñ„Ð¸Ð»Ð¸"}},{"value":"search","label":{"en":"Search","de":"Suche","tr":"Arama","ru":"ÐŸÐ¾Ð¸ÑÐº"}},{"value":"notifications","label":{"en":"Push Notifications","de":"Push-Benachrichtigungen","tr":"Bildirimler","ru":"Ð£Ð²ÐµÐ´Ð¾Ð¼Ð»ÐµÐ½Ð¸Ñ"}},{"value":"payments","label":{"en":"Payments","de":"Zahlungen","tr":"Ã–demeler","ru":"ÐŸÐ»Ð°Ñ‚ÐµÐ¶Ð¸"}},{"value":"messaging","label":{"en":"Messaging/Chat","de":"Nachrichten/Chat","tr":"MesajlaÅŸma","ru":"Ð§Ð°Ñ‚"}},{"value":"calendar","label":{"en":"Calendar","de":"Kalender","tr":"Takvim","ru":"ÐšÐ°Ð»ÐµÐ½Ð´Ð°Ñ€ÑŒ"}},{"value":"files","label":{"en":"File Sharing","de":"Dateien teilen","tr":"Dosya PaylaÅŸÄ±mÄ±","ru":"Ð¤Ð°Ð¹Ð»Ñ‹"}},{"value":"reports","label":{"en":"Reports","de":"Berichte","tr":"Raporlar","ru":"ÐžÑ‚Ñ‡ÐµÑ‚Ñ‹"}},{"value":"admin","label":{"en":"Admin Panel","de":"Admin-Panel","tr":"YÃ¶netim Paneli","ru":"ÐÐ´Ð¼Ð¸Ð½-Ð¿Ð°Ð½ÐµÐ»ÑŒ"}}]',
   0, true);

insert into anforderungsportal.template_questions (section_id, type, label, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000002', 'textarea',
   '{"en":"Describe the most important feature in detail","de":"Beschreiben Sie die wichtigste Funktion im Detail","tr":"En Ã¶nemli Ã¶zelliÄŸi detaylÄ± aÃ§Ä±klayÄ±n","ru":"ÐŸÐ¾Ð´Ñ€Ð¾Ð±Ð½Ð¾ Ð¾Ð¿Ð¸ÑˆÐ¸Ñ‚Ðµ ÑÐ°Ð¼ÑƒÑŽ Ð²Ð°Ð¶Ð½ÑƒÑŽ Ñ„ÑƒÐ½ÐºÑ†Ð¸ÑŽ"}',
   1, true);

insert into anforderungsportal.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000002', 'radio',
   '{"en":"Should the app work offline?","de":"Soll die App offline funktionieren?","tr":"Uygulama Ã§evrimdÄ±ÅŸÄ± Ã§alÄ±ÅŸmalÄ± mÄ±?","ru":"Ð”Ð¾Ð»Ð¶Ð½Ð¾ Ð»Ð¸ Ð¿Ñ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ðµ Ñ€Ð°Ð±Ð¾Ñ‚Ð°Ñ‚ÑŒ Ð¾Ñ„Ð»Ð°Ð¹Ð½?"}',
   '[{"value":"yes","label":{"en":"Yes, fully","de":"Ja, vollstÃ¤ndig","tr":"Evet, tamamen","ru":"Ð”Ð°, Ð¿Ð¾Ð»Ð½Ð¾ÑÑ‚ÑŒÑŽ"}},{"value":"partial","label":{"en":"Partially","de":"Teilweise","tr":"KÄ±smen","ru":"Ð§Ð°ÑÑ‚Ð¸Ñ‡Ð½Ð¾"}},{"value":"no","label":{"en":"No, online only","de":"Nein, nur online","tr":"HayÄ±r, yalnÄ±zca Ã§evrimiÃ§i","ru":"ÐÐµÑ‚, Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ð¾Ð½Ð»Ð°Ð¹Ð½"}}]',
   2, true);

-- Section 3: Design
insert into anforderungsportal.template_questions (section_id, type, label, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000003', 'file',
   '{"en":"Upload brand guidelines (logo, colors, fonts)","de":"Markenrichtlinien hochladen (Logo, Farben, Schriften)","tr":"Marka kÄ±lavuzunu yÃ¼kleyin","ru":"Ð—Ð°Ð³Ñ€ÑƒÐ·Ð¸Ñ‚Ðµ Ñ€ÑƒÐºÐ¾Ð²Ð¾Ð´ÑÑ‚Ð²Ð¾ Ð¿Ð¾ Ð±Ñ€ÐµÐ½Ð´Ñƒ"}',
   0, false);

insert into anforderungsportal.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000003', 'radio',
   '{"en":"Preferred design style?","de":"Bevorzugter Designstil?","tr":"Tercih edilen tasarÄ±m stili?","ru":"ÐŸÑ€ÐµÐ´Ð¿Ð¾Ñ‡Ð¸Ñ‚Ð°ÐµÐ¼Ñ‹Ð¹ ÑÑ‚Ð¸Ð»ÑŒ Ð´Ð¸Ð·Ð°Ð¹Ð½Ð°?"}',
   '[{"value":"modern","label":{"en":"Modern / Minimal","de":"Modern / Minimal","tr":"Modern / Minimal","ru":"Ð¡Ð¾Ð²Ñ€ÐµÐ¼ÐµÐ½Ð½Ñ‹Ð¹ / ÐœÐ¸Ð½Ð¸Ð¼Ð°Ð»ÑŒÐ½Ñ‹Ð¹"}},{"value":"playful","label":{"en":"Colorful / Playful","de":"Bunt / Verspielt","tr":"Renkli / EÄŸlenceli","ru":"Ð¯Ñ€ÐºÐ¸Ð¹ / Ð˜Ð³Ñ€Ð¸Ð²Ñ‹Ð¹"}},{"value":"corporate","label":{"en":"Corporate / Professional","de":"GeschÃ¤ftlich / Professionell","tr":"Kurumsal / Profesyonel","ru":"ÐšÐ¾Ñ€Ð¿Ð¾Ñ€Ð°Ñ‚Ð¸Ð²Ð½Ñ‹Ð¹ / ÐŸÑ€Ð¾Ñ„ÐµÑÑÐ¸Ð¾Ð½Ð°Ð»ÑŒÐ½Ñ‹Ð¹"}},{"value":"unsure","label":{"en":"Not sure","de":"Nicht sicher","tr":"Emin deÄŸilim","ru":"ÐÐµ ÑƒÐ²ÐµÑ€ÐµÐ½"}}]',
   1, false);

-- Section 4: Technical
insert into anforderungsportal.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000004', 'multi_select',
   '{"en":"Which platforms?","de":"Welche Plattformen?","tr":"Hangi platformlar?","ru":"ÐšÐ°ÐºÐ¸Ðµ Ð¿Ð»Ð°Ñ‚Ñ„Ð¾Ñ€Ð¼Ñ‹?"}',
   '[{"value":"ios","label":{"en":"iOS","de":"iOS","tr":"iOS","ru":"iOS"}},{"value":"android","label":{"en":"Android","de":"Android","tr":"Android","ru":"Android"}},{"value":"web","label":{"en":"Web Browser","de":"Webbrowser","tr":"Web TarayÄ±cÄ±","ru":"Ð’ÐµÐ±-Ð±Ñ€Ð°ÑƒÐ·ÐµÑ€"}},{"value":"desktop","label":{"en":"Desktop","de":"Desktop","tr":"MasaÃ¼stÃ¼","ru":"Ð”ÐµÑÐºÑ‚Ð¾Ð¿"}}]',
   0, true);

insert into anforderungsportal.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000004', 'radio',
   '{"en":"Expected number of users?","de":"Erwartete Benutzeranzahl?","tr":"Beklenen kullanÄ±cÄ± sayÄ±sÄ±?","ru":"ÐžÐ¶Ð¸Ð´Ð°ÐµÐ¼Ð¾Ðµ Ñ‡Ð¸ÑÐ»Ð¾ Ð¿Ð¾Ð»ÑŒÐ·Ð¾Ð²Ð°Ñ‚ÐµÐ»ÐµÐ¹?"}',
   '[{"value":"<100","label":{"en":"Less than 100","de":"Weniger als 100","tr":"100den az","ru":"ÐœÐµÐ½ÐµÐµ 100"}},{"value":"100-1000","label":{"en":"100-1,000","de":"100-1.000","tr":"100-1.000","ru":"100-1000"}},{"value":"1000-10000","label":{"en":"1,000-10,000","de":"1.000-10.000","tr":"1.000-10.000","ru":"1000-10000"}},{"value":"10000+","label":{"en":"10,000+","de":"10.000+","tr":"10.000+","ru":"10 000+"}}]',
   1, true);

insert into anforderungsportal.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000004', 'multi_select',
   '{"en":"Data privacy requirements?","de":"Datenschutzanforderungen?","tr":"Veri gizliliÄŸi gereksinimleri?","ru":"Ð¢Ñ€ÐµÐ±Ð¾Ð²Ð°Ð½Ð¸Ñ Ðº ÐºÐ¾Ð½Ñ„Ð¸Ð´ÐµÐ½Ñ†Ð¸Ð°Ð»ÑŒÐ½Ð¾ÑÑ‚Ð¸?"}',
   '[{"value":"gdpr","label":{"en":"GDPR/DSGVO","de":"DSGVO","tr":"KVKK/GDPR","ru":"GDPR"}},{"value":"encryption","label":{"en":"Data Encryption","de":"DatenverschlÃ¼sselung","tr":"Veri Åžifreleme","ru":"Ð¨Ð¸Ñ„Ñ€Ð¾Ð²Ð°Ð½Ð¸Ðµ"}},{"value":"export","label":{"en":"Data Export","de":"Datenexport","tr":"Veri DÄ±ÅŸa Aktarma","ru":"Ð­ÐºÑÐ¿Ð¾Ñ€Ñ‚ Ð´Ð°Ð½Ð½Ñ‹Ñ…"}},{"value":"deletion","label":{"en":"Right to Deletion","de":"Recht auf LÃ¶schung","tr":"Silme HakkÄ±","ru":"ÐŸÑ€Ð°Ð²Ð¾ Ð½Ð° ÑƒÐ´Ð°Ð»ÐµÐ½Ð¸Ðµ"}}]',
   2, true);

-- Section 5: Timeline & Budget
insert into anforderungsportal.template_questions (section_id, type, label, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000005', 'date',
   '{"en":"When do you need the app ready?","de":"Wann benÃ¶tigen Sie die App?","tr":"UygulamayÄ± ne zaman hazÄ±r olmasÄ±nÄ± istiyorsunuz?","ru":"ÐšÐ¾Ð³Ð´Ð° Ð²Ð°Ð¼ Ð½ÑƒÐ¶Ð½Ð¾ Ð³Ð¾Ñ‚Ð¾Ð²Ð¾Ðµ Ð¿Ñ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ðµ?"}',
   0, false);

insert into anforderungsportal.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000005', 'radio',
   '{"en":"Budget range?","de":"Budgetrahmen?","tr":"BÃ¼tÃ§e aralÄ±ÄŸÄ±?","ru":"Ð‘ÑŽÐ´Ð¶ÐµÑ‚?"}',
   '[{"value":"<5k","label":{"en":"Under â‚¬5,000","de":"Unter 5.000â‚¬","tr":"5.000â‚¬ altÄ±","ru":"Ð”Ð¾ â‚¬5 000"}},{"value":"5-15k","label":{"en":"â‚¬5-15K","de":"5-15.000â‚¬","tr":"5-15.000â‚¬","ru":"â‚¬5-15 Ñ‚Ñ‹Ñ."}},{"value":"15-50k","label":{"en":"â‚¬15-50K","de":"15-50.000â‚¬","tr":"15-50.000â‚¬","ru":"â‚¬15-50 Ñ‚Ñ‹Ñ."}},{"value":"50-100k","label":{"en":"â‚¬50-100K","de":"50-100.000â‚¬","tr":"50-100.000â‚¬","ru":"â‚¬50-100 Ñ‚Ñ‹Ñ."}},{"value":"100k+","label":{"en":"â‚¬100K+","de":"100.000â‚¬+","tr":"100.000â‚¬+","ru":"â‚¬100 Ñ‚Ñ‹Ñ.+"}},{"value":"unsure","label":{"en":"Not sure yet","de":"Noch unsicher","tr":"HenÃ¼z emin deÄŸilim","ru":"ÐŸÐ¾ÐºÐ° Ð½Ðµ ÑƒÐ²ÐµÑ€ÐµÐ½"}}]',
   1, false);

insert into anforderungsportal.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000005', 'radio',
   '{"en":"What is more important?","de":"Was ist wichtiger?","tr":"Hangisi daha Ã¶nemli?","ru":"Ð§Ñ‚Ð¾ Ð²Ð°Ð¶Ð½ÐµÐµ?"}',
   '[{"value":"speed","label":{"en":"Speed (MVP first)","de":"Geschwindigkeit (MVP zuerst)","tr":"HÄ±z (Ã¶nce MVP)","ru":"Ð¡ÐºÐ¾Ñ€Ð¾ÑÑ‚ÑŒ (ÑÐ½Ð°Ñ‡Ð°Ð»Ð° MVP)"}},{"value":"features","label":{"en":"Feature completeness","de":"VollstÃ¤ndigkeit","tr":"Ã–zellik tamlÄ±ÄŸÄ±","ru":"ÐŸÐ¾Ð»Ð½Ð¾Ñ‚Ð° Ñ„ÑƒÐ½ÐºÑ†Ð¸Ð¹"}},{"value":"balance","label":{"en":"Balance of both","de":"Beides ausgewogen","tr":"Her ikisi dengeli","ru":"Ð‘Ð°Ð»Ð°Ð½Ñ Ð¾Ð±Ð¾Ð¸Ñ…"}}]',
   2, true);

-- Section 6: Additional
insert into anforderungsportal.template_questions (section_id, type, label, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000006', 'textarea',
   '{"en":"Anything else we should know?","de":"Gibt es noch etwas, das wir wissen sollten?","tr":"Bilmemiz gereken baÅŸka bir ÅŸey var mÄ±?","ru":"Ð§Ñ‚Ð¾ ÐµÑ‰Ðµ Ð½Ð°Ð¼ ÑÐ»ÐµÐ´ÑƒÐµÑ‚ Ð·Ð½Ð°Ñ‚ÑŒ?"}',
   0, false);

insert into anforderungsportal.template_questions (section_id, type, label, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000006', 'file',
   '{"en":"Upload reference documents or mockups","de":"Referenzdokumente oder Mockups hochladen","tr":"Referans belgelerini veya tasarÄ±mlarÄ± yÃ¼kleyin","ru":"Ð—Ð°Ð³Ñ€ÑƒÐ·Ð¸Ñ‚Ðµ ÑÐ¿Ñ€Ð°Ð²Ð¾Ñ‡Ð½Ñ‹Ðµ Ð´Ð¾ÐºÑƒÐ¼ÐµÐ½Ñ‚Ñ‹ Ð¸Ð»Ð¸ Ð¼Ð°ÐºÐµÑ‚Ñ‹"}',
   1, false);

insert into anforderungsportal.template_questions (section_id, type, label, options, order_index, is_required) values
  ('00000000-0000-0000-0001-000000000006', 'radio',
   '{"en":"Preferred communication channel?","de":"Bevorzugter Kommunikationskanal?","tr":"Tercih edilen iletiÅŸim kanalÄ±?","ru":"ÐŸÑ€ÐµÐ´Ð¿Ð¾Ñ‡Ñ‚Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ñ‹Ð¹ ÐºÐ°Ð½Ð°Ð» ÑÐ²ÑÐ·Ð¸?"}',
   '[{"value":"email","label":{"en":"Email","de":"E-Mail","tr":"E-posta","ru":"Ð­Ð»ÐµÐºÑ‚Ñ€Ð¾Ð½Ð½Ð°Ñ Ð¿Ð¾Ñ‡Ñ‚Ð°"}},{"value":"phone","label":{"en":"Phone","de":"Telefon","tr":"Telefon","ru":"Ð¢ÐµÐ»ÐµÑ„Ð¾Ð½"}},{"value":"video","label":{"en":"Video Call","de":"Videoanruf","tr":"Video GÃ¶rÃ¼ÅŸme","ru":"Ð’Ð¸Ð´ÐµÐ¾Ð·Ð²Ð¾Ð½Ð¾Ðº"}},{"value":"inperson","label":{"en":"In-Person","de":"PersÃ¶nlich","tr":"YÃ¼z yÃ¼ze","ru":"Ð›Ð¸Ñ‡Ð½Ð¾"}}]',
   2, true);
