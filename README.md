# Academic Personal Website

Maintainable personal academic website built with Astro, TypeScript, MDX, and Tailwind CSS.

## Run Locally

```powershell
Set-Location -LiteralPath "D:\Personal_Webpage\[Program]\academic-website-v3"
npm install
npm run dev
```

## Graphical Content Admin

`/admin/` is the unified password-protected content site (username `admin`). It includes site settings, Home, bilingual About text/photo, publications, research, news and CV records.

```powershell
npm run admin:setup
# Set a password in the loopback-only setup window, then:
npm run cms:local
```

Open `http://127.0.0.1:4321/admin/`. Local saves update local files. Production saves use a repository-scoped server-side GitHub token and trigger deployment. GitHub Pages redirects administrators to the custom domain, which supports server authentication.

The complete CMS schema is in `scripts/admin/config.mjs`, served only after authentication. There is no public config.yml or publication maintenance snapshot. See [the Chinese administrator guide](docs/cms-admin.zh-CN.md) for credentials and EdgeOne configuration. No default password is shipped.

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

### EdgeOne Pages

The custom domain is deployed through Tencent Cloud EdgeOne Pages. Use `npm run build`, output directory `dist`, and keep `PUBLIC_SITE_STATUS=live` for the normal site. See `docs/maintenance-mode.zh-CN.md` for maintenance switching.

### GitHub Pages

Commit the project and push to `main`. The workflow in `.github/workflows/deploy.yml` builds from this nested app folder and publishes `dist`.

Migration and recovery instructions live in `docs/migration.zh-CN.md`. The cleanup evidence and retained/deleted scope are recorded in `docs/cleanup-audit.zh-CN.md`.
