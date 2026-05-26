export type TestimonialVideoSource =
  | { kind: 'youtube'; youtubeId: string; embedUrl: string; watchUrl: string }
  | {
      kind: 'squarespace-mp4';
      libraryId: string;
      systemDataId: string;
      urlTemplate: string;
      variants: { label: string; url: string }[];
      durationSeconds: number;
      aspectRatio: number;
    };

export interface TestimonialVideo {
  slug: string;
  name: string;
  location?: string;
  title: string;
  source: TestimonialVideoSource;
}

const SQS_LIBRARY_ID = '5b83975d45776e48dcfe0f15';
const GREG_SYSTEM_DATA_ID = '60837fe5-7452-4446-8760-e907e548d313';
const GREG_URL_TEMPLATE = `https://video.squarespace-cdn.com/content/v1/${SQS_LIBRARY_ID}/${GREG_SYSTEM_DATA_ID}/{variant}`;

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
    slug: 'greg-r-carlsbad',
    name: 'Greg R.',
    location: 'Carlsbad',
    title: 'Greg R. (Carlsbad)',
    source: {
      kind: 'squarespace-mp4',
      libraryId: SQS_LIBRARY_ID,
      systemDataId: GREG_SYSTEM_DATA_ID,
      urlTemplate: GREG_URL_TEMPLATE,
      variants: [
        { label: '1080p', url: GREG_URL_TEMPLATE.replace('{variant}', '1908:1080') },
        { label: '360p', url: GREG_URL_TEMPLATE.replace('{variant}', '636:360') },
      ],
      durationSeconds: 184.466992,
      aspectRatio: 16 / 9,
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
];
