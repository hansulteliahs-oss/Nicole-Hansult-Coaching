import React from 'react';
import { Text, Button } from 'react-email';

import { BrandedLayout } from './BrandedLayout';

interface PurchaseConfirmationProps {
  /** Recipient — shown for context only; not required by the template. */
  email: string;
  /** Absolute URL to /set-password?token=... */
  url: string;
  /** Discriminator — purchase = new Vibrant40 buyer, migration = existing member re-onboarding */
  kind: 'purchase' | 'migration';
}

/**
 * Set-your-password email — sent both to:
 *   1. New Stripe checkout buyers (kind='purchase') — Phase 5 Plan 03
 *   2. Existing Vibrant40 members during the migration blast (kind='migration') — Phase 6
 *
 * Single template, discriminator-driven copy. Mist-branded via BrandedLayout.
 */
export function PurchaseConfirmation({ url, kind }: PurchaseConfirmationProps) {
  const heading =
    kind === 'purchase' ? 'Welcome to Vibrant40' : 'Your Vibrant40 experience just got better';

  const body =
    kind === 'purchase'
      ? 'Thanks for your purchase. Click below to set your password and unlock your 8-day course.'
      : 'Set your password to access your Vibrant40 content on the new site.';

  // TTL line: purchase flow = 30 days (buyer may act later);
  // migration = 7 days per MIG-03 (coordinated blast, immediate action expected).
  const ttlLine =
    kind === 'purchase'
      ? 'This link is active for 30 days and works only once.'
      : 'This link is active for 7 days and works only once.';

  return (
    <BrandedLayout>
      <Text
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#1a1a1a',
          marginBottom: '12px',
          marginTop: 0,
        }}
      >
        {heading}
      </Text>
      <Text
        style={{
          fontSize: '14px',
          color: '#3a3a3a',
          lineHeight: '1.6',
          marginBottom: '8px',
        }}
      >
        {body}
      </Text>
      <Text
        style={{
          fontSize: '14px',
          color: '#6B6B6B',
          marginBottom: '24px',
          lineHeight: '1.6',
        }}
      >
        {ttlLine}
      </Text>
      <Button
        href={url}
        style={{
          backgroundColor: '#A87EC2',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '12px 24px',
          fontSize: '14px',
          fontWeight: 600,
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        Set my password
      </Button>
      <Text
        style={{
          fontSize: '12px',
          color: '#9B9B9B',
          marginTop: '24px',
          marginBottom: 0,
          wordBreak: 'break-all',
        }}
      >
        If the button does not work, copy and paste this link into your browser: {url}
      </Text>
    </BrandedLayout>
  );
}
