import React from 'react';
import { Text, Button } from 'react-email';

import { BrandedLayout } from './BrandedLayout';

interface AuthPasswordResetProps {
  resetUrl: string;
}

/**
 * Password reset email — sent when an existing user requests a reset.
 *
 * Phase 4: Supabase Auth sends reset emails directly via the configured
 * Resend SMTP relay. This template is the canonical Mist-branded version
 * intended for a future Auth Hook (Edge Function) migration.
 */
export function AuthPasswordReset({ resetUrl }: AuthPasswordResetProps) {
  return (
    <BrandedLayout>
      <Text
        style={{
          fontSize: '16px',
          color: '#1a1a1a',
          marginBottom: '8px',
          marginTop: 0,
        }}
      >
        Reset your password
      </Text>
      <Text
        style={{
          fontSize: '14px',
          color: '#6B6B6B',
          marginBottom: '24px',
          lineHeight: '1.6',
        }}
      >
        Click the button below to set a new password. This link is valid for 1 hour.
      </Text>
      <Button
        href={resetUrl}
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
        Reset password
      </Button>
      <Text
        style={{
          fontSize: '12px',
          color: '#9B9B9B',
          marginTop: '24px',
          marginBottom: 0,
        }}
      >
        If you did not request a password reset, you can safely ignore this email.
      </Text>
    </BrandedLayout>
  );
}
