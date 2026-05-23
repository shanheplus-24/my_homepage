# 网站后续管理说明

这个网站的核心维护原则是：日常更新只改结构化内容文件，尽量不改页面组件。

## 常用命令

```powershell
Set-Location -LiteralPath "D:\Personal_Webpage\[Program]\academic-website-v3"
npm run dev
npm run validate
npm run build
```

- `npm run dev`：本地预览。
- `npm run validate`：检查内容 schema、TypeScript、Astro 构建。
- `npm run build`：生成生产站点到 `dist/`。

## 修改个人信息

编辑：

```text
src/data/site.json
```

这里仅保留当前页面实际使用的站点名称、姓名、页脚角色、邮箱、SEO 简介、页脚签名、LinkedIn 和导航。中英文资料字段保留。

CV 文件放在：

```text
public/cv.pdf
```

替换同名 PDF 即可。

## 管理图片

从参考网页下载下来的图片已经放在：

```text
public/assets/shanheplus/
```

新增或替换图片时，也先放到这个目录，然后在内容文件中使用：

```yaml
image:
  src: "/assets/shanheplus/file-name.png"
  alt: "清楚描述图片内容的替代文本"
```

不要直接引用 Google Sites 或其他远程图片地址，这样部署后速度和稳定性更好。

## 增加论文

在这里新建一个 `.mdx` 文件：

```text
src/content/publications/
```

可从模板复制：

```text
D:\Personal_Webpage\[Input]\content-templates\publication.mdx
```

论文必须拆开写 `title` 和 `authors`，页面会分别显示。后台只保留当前页面实际使用的 `doi` 和 `paper` 链接。新增后出版物页会自动进入搜索和筛选系统。

## 增加研究项目

在这里新建一个 `.mdx` 文件：

```text
src/content/research/
```

可从模板复制：

```text
D:\Personal_Webpage\[Input]\content-templates\research-project.mdx
```

`relatedPublications` 使用论文文件名，不带 `.mdx` 后缀。例如论文文件是 `thermodynamic-boundaries-awh.mdx`，就写：

```yaml
relatedPublications:
  - "thermodynamic-boundaries-awh"
```

## 增加新闻

在这里新建一个 `.mdx` 文件：

```text
src/content/news/
```

建议文件名使用日期开头，例如：

```text
2026-05-new-paper-accepted.mdx
```

## 增加教育、奖项、代表性论文、报告等 CV 项

在这里新建一个 `.mdx` 文件：

```text
src/content/academic-info/
```

`category` 可选：

- `award`
- `fellowship`
- `talk`
- `education`
- `selected-publication`

如果需要在最后一个页面显示中文，也填写 `titleZh`、`organizationZh`、`dateZh`、`locationZh`、`descriptionZh`。

## 发布

GitHub Pages 已配置：

```text
.github/workflows/deploy.yml
```

Vercel 已配置：

```text
vercel.json
```

如果用 Vercel，项目根目录选择：

```text
[Program]/academic-website
```

## 更新前检查清单

1. 新增内容文件是否放在正确 collection 文件夹。
2. 图片是否放在 `public/assets/shanheplus/`，并且有 `alt` 描述。
3. 论文作者是否写在 `authors` 数组，而不是混在标题里。
4. 研究项目的 `relatedPublications` 是否对应真实论文文件名。
5. 本地运行 `npm run validate` 是否通过。
