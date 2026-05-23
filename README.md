# Academic Personal Website

Maintainable personal academic website built with Astro, TypeScript, MDX, and Tailwind CSS.

## Run Locally

```powershell
Set-Location -LiteralPath "D:\Personal_Webpage\[Program]\academic-website-v3"
npm install
npm run dev
```

## Graphical Content Admin

The site now has a Git-based CMS at `/admin/`. It edits the structured content collections through forms, so routine changes do not require hand-editing MDX files.

Local workflow:

```powershell
Set-Location -LiteralPath "D:\Personal_Webpage\[Program]\academic-website-v3"
npm run dev
```

Open `http://127.0.0.1:4321/admin/`.

To enable local write-back through Decap's proxy server, run this in a second terminal:

```powershell
Set-Location -LiteralPath "D:\Personal_Webpage\[Program]\academic-website-v3"
npm run cms:server
```

CMS configuration lives in `public/admin/config.yml`. Update `backend.repo` there if the deployed GitHub repository is not `shanheplus-24/my_homepage`.

Chinese CMS guide:

```text
docs/cms-admin.zh-CN.md
```

## Content Model

Structured content lives in `src/content/` and is validated by `src/content.config.ts`.

- Home page sections: `src/content/pages/home.mdx`
- Publications: `src/content/publications/*.mdx`
- Research projects: `src/content/research/*.mdx`
- News: `src/content/news/*.mdx`
- Education, fellowships, awards, selected publications, and talks: `src/content/academic-info/*.mdx`

Chinese maintenance guide:

```text
docs/content-management.zh-CN.md
```

Reusable content templates:

```text
D:\Personal_Webpage\[Input]\content-templates\
```

## Add a Publication

Create a new file in `src/content/publications/`:

```md
---
image:
  src: "/assets/shanheplus/example-publication.jpg"
  alt: "Short accessible image description"
title: "Paper Title"
authors:
  - "First Author"
  - "Second Author"
venue: "Conference or Journal Name"
year: 2026
links:
  paper: "https://example.com/paper.pdf"
  doi: "https://doi.org/10.xxxx/example"
---
```

Titles and authors are separate fields and render separately on the site.

## Add a Research Project

Create a new file in `src/content/research/`:

```md
---
image:
  src: "/assets/shanheplus/example-project.jpg"
  alt: "Accessible project image description"
title: "Project Title"
summary: "One or two sentence project summary."
relatedPublications:
  - "publication-file-id-without-extension"
---
```

`relatedPublications` must match publication file names without `.mdx`.

## Add News

Create a new file in `src/content/news/`:

```md
---
title: "Short update title"
date: 2026-05-01
summary: "One sentence news summary."
---
```

## Add Education, Awards, Talks, Fellowships, or Selected Publications

Create a new file in `src/content/academic-info/`:

```md
---
category: "award"
title: "Item title"
organization: "Organization"
date: "2026"
location: "Optional location"
description: "Optional short description."
order: 1
---
```

Allowed categories are `education`, `fellowship`, `award`, `selected-publication`, and `talk`.

## Update Profile and CV

- Edit visible site settings in `src/data/site.json` or through `/admin/`.
- Store site images locally under `public/assets/shanheplus/`, then reference them as `/assets/shanheplus/file-name.png` in content files.
- Replace `public/cv.pdf` with the latest CV PDF.
- If deploying under GitHub Pages, set `SITE_URL` and `BASE_PATH` as shown in `.github/workflows/deploy.yml`.

## Visitor Analytics

Visitor analytics run in the background through GoatCounter. No visible traffic widget is rendered on the page.

- Default endpoint: `https://shanheplus.goatcounter.com/count`
- Optional override: set `PUBLIC_GOATCOUNTER_ENDPOINT` and `PUBLIC_GOATCOUNTER_SRC`.

Local example:

```powershell
$env:PUBLIC_GOATCOUNTER_ENDPOINT="https://shanheplus.goatcounter.com/count"
$env:PUBLIC_GOATCOUNTER_SRC="//gc.zgo.at/count.js"
npm run dev
```

## Validate and Build

```powershell
npm run check
npm run build
npm run validate
```

`npm run validate` runs Astro type/content checks and a production build.

## Deploy

### Cloudflare Pages

Use this when serving the site from the apex domain `shanheplus.com`.

Cloudflare Pages project settings:

```text
Project name: shanheplus-personal-page
Production branch: main
Framework preset: Astro
Build command: npm run build
Build output directory: dist
Root directory: /
Environment variable: SITE_URL=https://shanheplus.com
```

After the first successful Pages deployment, add `shanheplus.com` in the Pages project under **Custom domains**. Because the domain is already managed by Cloudflare nameservers, Cloudflare should create the required apex CNAME record automatically. Add `www.shanheplus.com` only if you also want the `www` hostname, then redirect it to the apex domain using a Cloudflare Bulk Redirect.

Detailed Chinese steps:

```text
docs/cloudflare-pages-domain.zh-CN.md
```

### GitHub Pages

Commit the project and push to `main`. The workflow in `.github/workflows/deploy.yml` builds from this nested app folder and publishes `dist`.

### Vercel

Set the Vercel project root to `[Program]/academic-website-v3`. The included `vercel.json` uses `npm run build` and outputs `dist`.
