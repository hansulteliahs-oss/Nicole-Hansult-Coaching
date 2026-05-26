import React from 'react';
import { Text, Button, Hr } from 'react-email';
import { BrandedLayout } from './BrandedLayout';

interface LeadMagnetEmailProps {
  firstName: string;
  pdfUrl: string;
}

export function LeadMagnetEmail({ firstName, pdfUrl }: LeadMagnetEmailProps) {
  return (
    <BrandedLayout>
      <Text
        style={{
          fontSize: '16px',
          color: '#1A1A1A',
          margin: '0 0 12px 0',
          lineHeight: '1.6',
        }}
      >
        Hi {firstName},
      </Text>

      <Text
        style={{
          fontSize: '16px',
          color: '#1A1A1A',
          margin: '0 0 24px 0',
          lineHeight: '1.6',
        }}
      >
        Your free guide is ready — click below to download.
      </Text>

      {/* Primary CTA — PDF download */}
      <Button
        href={pdfUrl}
        style={{
          display: 'inline-block',
          backgroundColor: '#A87EC2',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '15px',
          fontWeight: 600,
          textDecoration: 'none',
          textAlign: 'center',
          marginBottom: '32px',
        }}
      >
        Download Your Free Guide
      </Button>

      <Hr style={{ borderColor: '#e4e4e4', margin: '0 0 24px 0' }} />

      {/* Next-step pitch */}
      <Text
        style={{
          fontSize: '14px',
          color: '#4A4A4A',
          margin: '0 0 20px 0',
          lineHeight: '1.6',
        }}
      >
        Ready for a personalized plan? Book a free Strategy Session with Nicole — no commitment, just clarity.
      </Text>

      {/* Secondary CTA — Strategy Session */}
      <Button
        href="https://nicole-hansult-coaching.vercel.app/booking-appointment"
        style={{
          display: 'inline-block',
          backgroundColor: '#1A1A1A',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '15px',
          fontWeight: 600,
          textDecoration: 'none',
          textAlign: 'center',
        }}
      >
        Book a Strategy Session
      </Button>
    </BrandedLayout>
  );
}
