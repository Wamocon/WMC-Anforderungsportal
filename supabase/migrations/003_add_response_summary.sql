alter table anforderungsportal.responses
add column if not exists summary_markdown text;

comment on column anforderungsportal.responses.summary_markdown is 'AI-generated or user-edited markdown summary of the collected requirements.';