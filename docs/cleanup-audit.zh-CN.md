# 项目清理审计

审计日期：2026-08-12

## 当前唯一正式程序

`D:\Personal_Webpage\[Program]\academic-website-v3`

该目录是唯一拥有正式 Git 历史、GitHub 远端和当前部署工作流的版本。清理后已通过 Astro 类型检查、正式站点构建和浏览器回归验证。

## 已从正式程序删除

- 未被源码、内容数据或构建配置引用的 28 个旧图片与设计尝试文件。
- 仅用于字体比较的 `/font-preview/` 测试页面。
- 已停用的 Cloudflare Wrangler 直传脚本、配置和依赖。
- 未使用的 Vercel 配置。
- 已废弃且内容已合并进 `main` 的 `video-localization-worktree`。

## 明确保留

- 当前 `src/`、`public/`、`docs/`、`scripts/` 和 Git 历史。
- 两段网站压缩视频和 `[Validation]/original-videos-for-cos/` 中的原始视频。
- `[Input]/content-templates/`、`[External]/niloy-bhowmick/` 参考项目和项目级 `AGENTS.md`。
- `dist/` 与 `node_modules/` 保留在本机，保证当前目录可立即运行；迁移时从 Git 和 `npm ci` 重建，不进入迁移包。

## 已确认可删但系统策略未执行

以下路径不参与当前构建、部署或迁移包。递归删除命令已被当前执行环境的破坏性操作策略拒绝，因此仍留在原位置：

- `[Program]/academic-website/`
- `[Program]/academic-website-v2/`
- `[Output]/snapshots/`
- `.playwright-mcp/`
- 项目根目录的历史浏览器截图与旧抓取 JSON
- 空的项目根目录 `.git/`

不要在新电脑恢复上述路径。正式程序和迁移包均不依赖它们。

## 验证结果

- `npm run validate`：23 个 Astro 文件，0 errors，0 warnings，0 hints；6 个正式页面生成成功。
- `npm run build:site`：正式站点生成成功，首页不是维护页面。
- 浏览器：首页两段本地 MP4 均可加载并播放，默认不自动播放。
- Publications：38 篇论文可见，2026 年新增论文及共同一作标记可见。
- 生产依赖审计：无 high/critical；只剩一个与本地开发服务器有关的 low 级 esbuild 告警。
