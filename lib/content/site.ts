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
  /**
   * The Skool community the site links to. Follows the cart: the free group
   * while paid doors are closed, the paid group Oct 12-25 and from Jan 4.
   * Swap name + url here (and the card copy in offers.ts / offerDetails.ts).
   */
  community: {
    name: string;
    url: string;
  };
  /**
   * The free Skool group, always. It never follows the cart: the free guide
   * lives in its Classroom (Free Downloads) since 2026-09-30, so every
   * free-guide link on the site points here.
   */
  freeCommunity: {
    name: string;
    url: string;
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
  community: {
    name: 'Keep Your Muscle (Free)',
    url: 'https://www.skool.com/nicoles-free-community-7461/about',
  },
  freeCommunity: {
    name: 'Keep Your Muscle (Free)',
    url: 'https://www.skool.com/nicoles-free-community-7461/about',
  },
};
