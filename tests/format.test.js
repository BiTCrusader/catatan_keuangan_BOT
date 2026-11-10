import { describe, it, expect } from 'vitest';
import { escapeHtml, stripHtml } from '../src/utils/format.js';

describe('HTML Format Utilities', () => {
  it('correctly escapes HTML special characters', () => {
    expect(escapeHtml('kopi & donat <script>')).toBe('kopi &amp; donat &lt;script&gt;');
    expect(escapeHtml('MAKAN_MINUM')).toBe('MAKAN_MINUM');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('correctly strips HTML tags', () => {
    expect(stripHtml('<b>Halo</b> <i>dunia</i>')).toBe('Halo dunia');
    expect(stripHtml('&lt;test&gt;')).toBe('<test>');
    expect(stripHtml('')).toBe('');
  });
});
