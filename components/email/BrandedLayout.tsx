import React from 'react';
import { Html, Head, Body, Container, Section, Img, Text } from 'react-email';

interface BrandedLayoutProps {
  children: React.ReactNode;
}

export function BrandedLayout({ children }: BrandedLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={{ backgroundColor: '#f4f4f4', margin: 0, padding: '32px 0', fontFamily: 'sans-serif' }}>
        <Container
          style={{
            maxWidth: '560px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {/* Orchid header band */}
          <Section
            style={{
              backgroundColor: '#A87EC2',
              padding: '16px 24px',
              textAlign: 'center',
            }}
          >
            <Img
              src="https://nicole-hansult-coaching.vercel.app/images/nicolehansult-logo-edit.png"
              alt="Nicole Hansult Coaching"
              width={140}
              height={40}
              style={{ display: 'inline-block' }}
            />
          </Section>

          {/* White body */}
          <Section style={{ padding: '32px 24px' }}>
            {children}
          </Section>

          {/* NAP footer */}
          <Section
            style={{
              borderTop: '1px solid #e4e4e4',
              padding: '16px 24px',
              textAlign: 'center',
            }}
          >
            <Text
              style={{
                fontSize: '12px',
                color: '#6B6B6B',
                margin: 0,
                lineHeight: '1.5',
              }}
            >
              Nicole Hansult Coaching · Carlsbad, CA · nicole@nicolehansultcoaching.com
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
