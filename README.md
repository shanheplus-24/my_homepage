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

## Visual Drag-and-Drop Editing

CloudCannon visual editing support is configured alongside Decap. The homepage content source is now `src/content/pages/home.mdx`, where homepage sections and featured item order are stored as structured frontmatter instead of hard-coded arrays in `src/pages/index.astro`.

Key files:

```text
cloudcannon.config.yml
src/content/pages/home.mdx
.cloudcannon/schemas/
src/scripts/register-cloudcannon-components.ts
```

Chinese visual editing guide:

```text
docs/cloudcannon-visual-editing.zh-CN.md
```

## Content Model

Structured content lives in `src/content/` and is validated by `src/content.config.ts`.

- Publications: `src/content/publications/*.mdx`
- Research projects: `src/content/research/*.mdx`
- News: `src/content/news/*.mdx`
- Awards, fellowships, talks, teaching, service, and other information: `src/content/academic-info/*.mdx`

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
type: "conference"
status: "published"
selected: true
links:
  paper: "https://example.com/paper.pdf"
  code: "https://github.com/example/repo"
  project: "https://example.com/project"
  doi: "https://doi.org/10.xxxx/example"
  slides: "https://example.com/slides.pdf"
  bibtex: "@inproceedings{key,title={Paper Title},year={2026}}"
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
collaborators:
  - "Lab or collaborator name"
status: "active"
period: "2026-present"
highlight: true
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
link: "https://example.com/optional-link"
---
```

## Add Awards, Talks, Teaching, Service, or Other CV Items

Create a new file in `src/content/academic-info/`:

```md
---
category: "award"
title: "Item title"
organization: "Organization"
date: "2026"
location: "Optional location"
description: "Optional short description."
link: "https://example.com/optional-link"
order: 1
---
```

Allowed categories are `award`, `fellowship`, `talk`, `teaching`, `service`, and `other`.

## Update Profile and CV

- Edit name, affiliation, email, interests, links, and profile image in `src/data/site.ts`.
- Store site images locally under `public/assets/shanheplus/`, then reference them as `/assets/shanheplus/file-name.png` in content files.
- Replace `public/cv.pdf` with the latest CV PDF.
- If deploying under GitHub Pages, set `SITE_URL` and `BASE_PATH` as shown in `.github/workflows/deploy.yml`.

## Visitor Analytics

The bottom of every page includes a visible analytics area.

- For country/source-location statistics, generate a free counter image at `https://flagcounter.com/` and set `PUBLIC_FLAG_COUNTER_URL`.
- For page analytics, set `PUBLIC_PLAUSIBLE_DOMAIN` if using Plausible.

Local example:

```powershell
$env:PUBLIC_FLAG_COUNTER_URL="https://s01.flagcounter.com/count2/YOURCODE/bg_FFFFFF/txt_17202A/border_D9E0E7/columns_4/maxflags_12/viewers_Visitors/labels_1/pageviews_1/flags_0/percent_0/"
$env:PUBLIC_PLAUSIBLE_DOMAIN="your-domain.com"
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

### GitHub Pages

Commit the project and push to `main`. The workflow in `.github/workflows/deploy.yml` builds from this nested app folder and publishes `dist`.

### Vercel

Set the Vercel project root to `[Program]/academic-website-v3`. The included `vercel.json` uses `npm run build` and outputs `dist`.
