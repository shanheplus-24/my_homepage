import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const urlSchema = z.url();

const linkSchema = z.object({
  paper: urlSchema.optional(),
  code: urlSchema.optional(),
  project: urlSchema.optional(),
  doi: urlSchema.optional(),
  slides: urlSchema.optional(),
  bibtex: z.string().optional(),
});

const imageSchema = z.object({
  src: z.string().min(1),
  alt: z.string().min(1),
});

const namedLinkSchema = z.object({
  label: z.string().min(1),
  href: urlSchema,
});

const embedSchema = z.object({
  title: z.string().min(1),
  src: z.string().min(1),
  type: z.enum(['local-video', 'external-video']).default('external-video'),
  poster: z.string().optional(),
});

const ctaSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

const homeSectionBaseSchema = z.object({
  id: z.string().min(1),
});

const homeSectionsSchema = z.discriminatedUnion('type', [
  homeSectionBaseSchema.extend({
    type: z.literal('hero'),
    ariaLabel: z.string().min(1),
    headingLines: z.array(z.string().min(1)).min(1),
    topics: z.array(z.string().min(1)).default([]),
    primaryCta: ctaSchema,
    secondaryCta: ctaSchema,
    scrollLabel: z.string().min(1).default('Scroll'),
  }),
  homeSectionBaseSchema.extend({
    type: z.literal('research_highlights'),
    heading: z.string().min(1),
    items: z.array(reference('research')).default([]),
  }),
  homeSectionBaseSchema.extend({
    type: z.literal('selected_publications'),
    heading: z.string().min(1),
    items: z.array(reference('publications')).default([]),
    allItemsCta: ctaSchema,
  }),
  homeSectionBaseSchema.extend({
    type: z.literal('news'),
    heading: z.string().min(1),
    items: z.array(reference('news')).default([]),
  }),
  homeSectionBaseSchema.extend({
    type: z.literal('collaboration_cta'),
    heading: z.string().min(1),
    headingHighlight: z.string().optional(),
    body: z.string().min(1),
    topics: z.array(z.string().min(1)).default([]),
    cta: ctaSchema,
  }),
]);

const publications = defineCollection({
  loader: glob({ base: './src/content/publications', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    image: imageSchema,
    title: z.string().min(1),
    authors: z.array(z.string().min(1)).min(1),
    venue: z.string().min(1),
    year: z.number().int().min(1900).max(2100),
    sortOrder: z.number().int().optional(),
    type: z.enum(['journal', 'conference', 'preprint', 'workshop', 'book-chapter', 'thesis']).default('journal'),
    status: z.enum(['published', 'accepted', 'in-review', 'working-paper', 'forthcoming']).default('published'),
    selected: z.boolean().default(false),
    links: linkSchema.default({}),
  }),
});

const research = defineCollection({
  loader: glob({ base: './src/content/research', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    image: imageSchema,
    title: z.string().min(1),
    summary: z.string().default(''),
    collaborators: z.array(z.string().min(1)).default([]),
    status: z.enum(['active', 'completed', 'paused', 'exploratory']).default('active'),
    period: z.string().optional(),
    highlight: z.boolean().default(false),
    relatedPublications: z.array(reference('publications')).default([]),
  }),
});

const news = defineCollection({
  loader: glob({ base: './src/content/news', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    summary: z.string().default(''),
    image: imageSchema.optional(),
    embeds: z.array(embedSchema).default([]),
    link: urlSchema.optional(),
  }),
});

const academicInfo = defineCollection({
  loader: glob({ base: './src/content/academic-info', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    category: z.enum(['award', 'fellowship', 'talk', 'teaching', 'service', 'education', 'contact', 'selected-publication', 'other']),
    title: z.string().min(1),
    titleZh: z.string().optional(),
    organization: z.string().min(1),
    organizationZh: z.string().optional(),
    date: z.string().min(1),
    dateZh: z.string().optional(),
    location: z.string().optional(),
    locationZh: z.string().optional(),
    description: z.string().optional(),
    descriptionZh: z.string().optional(),
    points: z.array(z.string().min(1)).default([]),
    pointsZh: z.array(z.string().min(1)).default([]),
    image: imageSchema.optional(),
    logos: z.array(imageSchema).default([]),
    links: z.array(namedLinkSchema).default([]),
    link: urlSchema.optional(),
    order: z.number().int().default(0),
  }),
});

const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    sections: z.array(homeSectionsSchema).default([]),
  }),
});

export const collections = {
  publications,
  research,
  news,
  academicInfo,
  pages,
};
