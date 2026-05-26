import React from 'react';
import { Html, Head, Body, Container, Section, Text, Heading, Hr } from 'react-email';
import type { ContactOutput } from '@/lib/schemas/contact';

export function ContactNotification(props: ContactOutput) {
  const { firstName, lastName, email, phone, service, message } = props;

  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <Html lang="en">
      <Head />
      <Body
        style={{
          backgroundColor: '#ffffff',
          margin: 0,
          padding: '24px',
          fontFamily: 'sans-serif',
          fontSize: '16px',
          color: '#1A1A1A',
        }}
      >
        <Container style={{ maxWidth: '560px', margin: '0 auto' }}>
          <Heading
            as="h2"
            style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#1A1A1A' }}
          >
            New Contact Form Submission
          </Heading>

          <Hr style={{ borderColor: '#e4e4e4', margin: '0 0 16px 0' }} />

          <Section>
            <Text style={{ margin: '0 0 8px 0' }}>
              <strong>Name:</strong> {firstName} {lastName}
            </Text>
            <Text style={{ margin: '0 0 8px 0' }}>
              <strong>Email:</strong>{' '}
              <a href={`mailto:${email}`} style={{ color: '#A87EC2' }}>
                {email}
              </a>
            </Text>
            <Text style={{ margin: '0 0 8px 0' }}>
              <strong>Phone:</strong> {phone ?? '—'}
            </Text>
            <Text style={{ margin: '0 0 8px 0' }}>
              <strong>Service interested in:</strong> {service ?? '—'}
            </Text>
          </Section>

          <Hr style={{ borderColor: '#e4e4e4', margin: '16px 0' }} />

          <Section>
            <Text style={{ margin: '0 0 4px 0' }}>
              <strong>Message:</strong>
            </Text>
            <Text
              style={{
                margin: 0,
                backgroundColor: '#f9f9f9',
                padding: '12px',
                borderRadius: '4px',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
              }}
            >
              {message}
            </Text>
          </Section>

          <Hr style={{ borderColor: '#e4e4e4', margin: '16px 0' }} />

          <Text style={{ fontSize: '13px', color: '#6B6B6B', margin: 0 }}>
            Submitted: {timestamp} PT
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
