export type TestimonialVideoSource = {
  kind: 'youtube';
  youtubeId: string;
  embedUrl: string;
  watchUrl: string;
};

export interface TestimonialVideo {
  slug: string;
  name: string;
  location?: string;
  title: string;
  source: TestimonialVideoSource;
}

export const testimonialVideos: TestimonialVideo[] = [
  {
    slug: 'bianca-san-diego',
    name: 'Bianca',
    location: 'San Diego',
    title: 'Bianca San Diego',
    source: {
      kind: 'youtube',
      youtubeId: '8dLnl5LIm1I',
      embedUrl: 'https://www.youtube.com/embed/8dLnl5LIm1I',
      watchUrl: 'https://www.youtube.com/watch?v=8dLnl5LIm1I',
    },
  },
  {
    slug: 'john-mcclure',
    name: 'John McClure',
    location: 'La Jolla',
    title: 'John McClure',
    source: {
      kind: 'youtube',
      youtubeId: 'BlQt9NWM8iE',
      embedUrl: 'https://www.youtube.com/embed/BlQt9NWM8iE',
      watchUrl: 'https://www.youtube.com/watch?v=BlQt9NWM8iE',
    },
  },
  {
    slug: 'vanessa-atlanta',
    name: 'Vanessa',
    location: 'Atlanta',
    title: "Vanessa's Testimonial",
    source: {
      kind: 'youtube',
      youtubeId: 'z4_kqU5vRho',
      embedUrl: 'https://www.youtube.com/embed/z4_kqU5vRho',
      watchUrl: 'https://www.youtube.com/watch?v=z4_kqU5vRho',
    },
  },
  {
    slug: 'richard',
    name: 'Richard',
    title: "Richard's Testimonial",
    source: {
      kind: 'youtube',
      youtubeId: 'Q0v1zMs9qkk',
      embedUrl: 'https://www.youtube.com/embed/Q0v1zMs9qkk',
      watchUrl: 'https://www.youtube.com/watch?v=Q0v1zMs9qkk',
    },
  },
  {
    slug: 'allen',
    name: 'Allen',
    title: "Allen's Testimonial",
    source: {
      kind: 'youtube',
      youtubeId: 'OcSRlcTMAgM',
      embedUrl: 'https://www.youtube.com/embed/OcSRlcTMAgM',
      watchUrl: 'https://www.youtube.com/watch?v=OcSRlcTMAgM',
    },
  },
  {
    slug: 'michael',
    name: 'Michael',
    title: "Michael's Testimonial",
    source: {
      kind: 'youtube',
      youtubeId: 'B6DFre8QozQ',
      embedUrl: 'https://www.youtube.com/embed/B6DFre8QozQ',
      watchUrl: 'https://www.youtube.com/watch?v=B6DFre8QozQ',
    },
  },
  {
    slug: 'helen-and-natalie',
    name: 'Helen & Natalie',
    title: "Helen & Natalie's Testimonial",
    source: {
      kind: 'youtube',
      youtubeId: '1ipG8bCd0L0',
      embedUrl: 'https://www.youtube.com/embed/1ipG8bCd0L0',
      watchUrl: 'https://www.youtube.com/watch?v=1ipG8bCd0L0',
    },
  },
  {
    slug: 'alice',
    name: 'Alice',
    title: "Alice's Testimonial",
    source: {
      kind: 'youtube',
      youtubeId: 'vypRGirsVAI',
      embedUrl: 'https://www.youtube.com/embed/vypRGirsVAI',
      watchUrl: 'https://www.youtube.com/watch?v=vypRGirsVAI',
    },
  },
  {
    slug: 'randy',
    name: 'Randy',
    title: "Randy's Testimonial",
    source: {
      kind: 'youtube',
      youtubeId: 'SKjteeuBX1c',
      embedUrl: 'https://www.youtube.com/embed/SKjteeuBX1c',
      watchUrl: 'https://www.youtube.com/watch?v=SKjteeuBX1c',
    },
  },
  {
    slug: 'scott',
    name: 'Scott',
    title: "Scott's Testimonial",
    source: {
      kind: 'youtube',
      youtubeId: 'uCU-j-inGPQ',
      embedUrl: 'https://www.youtube.com/embed/uCU-j-inGPQ',
      watchUrl: 'https://www.youtube.com/watch?v=uCU-j-inGPQ',
    },
  },
  {
    slug: 'heidi',
    name: 'Heidi',
    title: "Heidi's Testimonial",
    source: {
      kind: 'youtube',
      youtubeId: 'p_21Om8KFh0',
      embedUrl: 'https://www.youtube.com/embed/p_21Om8KFh0',
      watchUrl: 'https://www.youtube.com/watch?v=p_21Om8KFh0',
    },
  },
];
