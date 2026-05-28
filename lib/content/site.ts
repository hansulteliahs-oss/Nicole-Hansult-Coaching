export interface SiteConfig {
  name: string;
  contactEmail: string;
  nap: {
    name: string;
    city: string;
    region: string;
    country: string;
  };
  acuity: {
    ownerId: string;
  };
  socials: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
}

export const site: SiteConfig = {
  name: 'Nicole Hansult Coaching',
  contactEmail: 'nicole@nicolehansultcoaching.com',
  nap: {
    name: 'Nicole Hansult Coaching',
    city: 'Carlsbad',
    region: 'CA',
    country: 'US',
  },
  acuity: {
    ownerId: '16610306',
  },
  socials: {
    instagram: 'https://www.instagram.com/nicole_hansultcoaching/',
    facebook: 'https://www.facebook.com/nicolehansultcoaching/',
    linkedin: 'https://www.linkedin.com/in/nicole-hansult-coaching/',
  },
};
