import React from 'react';
import { Text, Button } from 'react-email';

import { BrandedLayout } from './BrandedLayout';

interface AuthVerificationProps {
  verificationUrl: string;
}

/**
 * Signup verification email — sent when a new user creates an account.
 *
 * Phase 4: Supabase Auth sends verification emails directly via the configured
 * Resend SMTP relay. This template is the canonical Mist-branded version
 * intended for a future Auth Hook (Edge Function) migration.
 */
export function AuthVerification({ verificationUrl }: AuthVerificationProps) {
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
        Confirm your email to finish creating your account.
      </Text>
      <Text
        style={{
          fontSize: '14px',
          color: '#6B6B6B',
          marginBottom: '24px',
          lineHeight: '1.6',
        }}
      >
        Click the button below to verify your address at nicolehansultcoaching.com.
      </Text>
      <Button
        href={verificationUrl}
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
        Confirm email
      </Button>
      <Text
        style={{
          fontSize: '12px',
          color: '#9B9B9B',
          marginTop: '24px',
          marginBottom: 0,
        }}
      >
        If you did not create an account, you can safely ignore this email.
      </Text>
    </BrandedLayout>
  );
}
