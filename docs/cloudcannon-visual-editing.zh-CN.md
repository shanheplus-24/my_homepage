# CloudCannon 可视化拖拽编辑说明

这个站点现在保留 Decap CMS 表单后台，同时新增 CloudCannon 可视化编辑支持。

两者分工：

- Decap CMS：适合在 `/admin/` 表单里编辑论文、研究、新闻和 CV 条目。
- CloudCannon：适合在页面预览里直接点选文字、拖动首页模块、拖动首页精选条目顺序。

## 已完成的结构

CloudCannon 配置：

```text
cloudcannon.config.yml
```

首页内容源：

```text
src/content/pages/home.mdx
```

首页不再从 `src/pages/index.astro` 写死以下数组：

```text
selectedPublications
researchHighlights
homeActivities
collaborationTopics
```

这些内容已经迁移到 `home.mdx` 的 `sections` 数组中。CloudCannon 可以围绕这个数组做可视化排序。

## 首页可拖拽内容

`home.mdx` 中的顶层结构是：

```yaml
sections:
  - id: hero
    type: hero
  - id: research-directions
    type: research_highlights
  - id: recent-work
    type: selected_publications
  - id: recent-activities
    type: news
  - id: collaboration
    type: collaboration_cta
```

目标编辑体验：

- 拖动 `sections` 可以调整首页模块顺序。
- 拖动 `research_highlights.items` 可以调整首页研究方向卡片顺序。
- 拖动 `selected_publications.items` 可以调整首页精选论文顺序。
- 拖动 `news.items` 可以调整首页新闻卡片顺序。
- 拖动 `topics` 可以调整首页主题标签顺序。

## 已安装依赖

```text
@cloudcannon/editable-regions
```

Astro 集成位置：

```text
astro.config.mjs
```

为了不影响普通本地开发，`@cloudcannon/editable-regions` 只在环境变量 `CLOUDCANNON=1` 或 `CLOUDCANNON=true` 时启用。CloudCannon 预览构建命令已经在 `cloudcannon.config.yml` 中设置为：

```bash
CLOUDCANNON=1 npm run build
```

组件注册位置：

```text
src/scripts/register-cloudcannon-components.ts
```

## 内容校验

CloudCannon 保存后仍然要通过 Astro Content Collections 的 Zod schema。

验证命令：

```powershell
Set-Location -LiteralPath "D:\Personal_Webpage\[Program]\academic-website-v3"
npm run validate
```

如果 CloudCannon 中拖拽或修改后构建失败，优先检查：

- `src/content/pages/home.mdx` 中的 `items` 是否仍然对应真实文件名。
- `type` 是否是允许值：`hero`、`research_highlights`、`selected_publications`、`news`、`collaboration_cta`。
- URL 字段是否是完整路径或 `mailto:`。

## 与 Decap 的关系

不要删除 Decap。当前推荐同时保留：

- `/admin/`：快速表单管理。
- CloudCannon Visual Editor：页面内可见即可得和拖拽排序。

它们都写回 Git 仓库，事实源仍然是当前项目文件。
