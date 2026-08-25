/**
 * app/approve/approval-state — the press gate.
 *
 * A blog post publishes on one press: publishing is reversible. A newsletter
 * send is not — it reaches roughly 1,110 people and cannot be recalled — and
 * there is no ARM interlock anywhere in the n8n workflow (the `Live Send?
 * (ARM)` node the README describes does not exist; verified 2026-08-24). With
 * approval moving to one tap on a phone from an SMS link, a newsletter takes
 * two deliberate presses.
 */
import { describe, it, expect } from 'vitest';

import {
  nextOnPress,
  pressLabel,
  NEWSLETTER_AUDIENCE_APPROX,
} from '@/app/approve/approval-state';

describe('nextOnPress', () => {
  it('submits a post on the first press', () => {
    expect(nextOnPress('idle', 'post')).toEqual({ state: 'working', submit: true });
  });

  it('does not submit a newsletter on the first press', () => {
    expect(nextOnPress('idle', 'newsletter')).toEqual({
      state: 'confirming',
      submit: false,
    });
  });

  it('submits a newsletter on the second press', () => {
    expect(nextOnPress('confirming', 'newsletter')).toEqual({
      state: 'working',
      submit: true,
    });
  });

  it('ignores presses while a submit is in flight', () => {
    expect(nextOnPress('working', 'post')).toEqual({ state: 'working', submit: false });
    expect(nextOnPress('working', 'newsletter')).toEqual({
      state: 'working',
      submit: false,
    });
  });

  it('ignores presses once it is done', () => {
    expect(nextOnPress('done', 'newsletter')).toEqual({ state: 'done', submit: false });
  });

  it('lets a failed newsletter retry without re-confirming', () => {
    // The reader already passed the interlock; making them do it twice after a
    // network blip trains them to tap through it.
    expect(nextOnPress('error', 'newsletter')).toEqual({
      state: 'working',
      submit: true,
    });
    expect(nextOnPress('error', 'post')).toEqual({ state: 'working', submit: true });
  });
});

describe('pressLabel', () => {
  it('names the audience size on the newsletter confirm press', () => {
    const label = pressLabel('confirming', 'newsletter');
    expect(label).toContain(String(NEWSLETTER_AUDIENCE_APPROX).slice(0, 1));
    expect(label.toLowerCase()).toContain('send');
  });

  it('does not name an audience before the first press', () => {
    expect(pressLabel('idle', 'newsletter').toLowerCase()).not.toContain('1,110');
  });

  it('reads as publishing for a post', () => {
    expect(pressLabel('idle', 'post').toLowerCase()).toContain('publish');
  });

  it('shows progress while working', () => {
    expect(pressLabel('working', 'post')).toBe('Publishing…');
    expect(pressLabel('working', 'newsletter')).toBe('Sending…');
  });
});
