import React from 'react';
import { Text, Button } from 'react-email';

import { BrandedLayout } from './BrandedLayout';

interface AuthMigrationWelcomeProps {
  setPasswordUrl: string;
}

/**
 * Migration "set password" welcome email — sent to existing Vibrant40 members
 * during the Phase 6 cutover blast, and re-sent on demand from the
 * /set-password/expired self-service page.
 *
 * Warmest tone of the three auth templates: orchid accent, personal framing,
 * 30-day single-use link copy.
 */
export function AuthMigrationWelcome({
  setPasswordUrl,
}: AuthMigrationWelcomeProps) {
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
        Welcome to your new home
      </Text>
      <Text
        style={{
          fontSize: '14px',
          color: '#3a3a3a',
          lineHeight: '1.6',
          marginBottom: '8px',
        }}
      >
        Your Vibrant40 content is now on a new, faster home at
        nicolehansultcoaching.com. Set a password to pick up right where you left
        off.
      </Text>
      <Text
        style={{
          fontSize: '14px',
          color: '#6B6B6B',
          marginBottom: '24px',
          lineHeight: '1.6',
        }}
      >
        This link is active for 30 days and works only once.
      </Text>
      <Button
        href={setPasswordUrl}
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
        Set my password and sign in
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
        If you have trouble with the button, copy and paste this link into your
        browser: {setPasswordUrl}
      </Text>
    </BrandedLayout>
  );
}
