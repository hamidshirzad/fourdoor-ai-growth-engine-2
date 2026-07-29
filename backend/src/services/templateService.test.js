import test from 'node:test';
import assert from 'node:assert/strict';
import { extractTemplateVariables, fillTemplateVariables } from './templateService.js';

test('extractTemplateVariables identifies all bracketed placeholders', () => {
  const subject = 'Meeting with {{name}} from {{company}}';
  const body = 'Hi {{ name }}, please check {{booking_link}} for {{company}}. Thanks, {{sender_name}}!';
  const vars = extractTemplateVariables(subject, body);
  assert.deepEqual(vars.sort(), ['booking_link', 'company', 'name', 'sender_name'].sort());
});

test('fillTemplateVariables replaces lead placeholders with values', () => {
  const text = 'Hi {{name}}, how is {{company}}? Book here: {{booking_link}}';
  const lead = { name: 'Sarah', company: 'Acme Corp', booking_link: 'https://calendly.com/acme' };
  const rendered = fillTemplateVariables(text, lead);
  assert.equal(rendered, 'Hi Sarah, how is Acme Corp? Book here: https://calendly.com/acme');
});

test('fillTemplateVariables falls back gracefully when fields are missing', () => {
  const text = 'Hi {{name}} from {{company}}';
  const rendered = fillTemplateVariables(text, {});
  assert.equal(rendered, 'Hi there from your company');
});
