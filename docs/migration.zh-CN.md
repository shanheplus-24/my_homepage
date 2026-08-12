# 网站迁移与恢复

## 权威来源

- 当前程序：`[Program]/academic-website-v3`
- GitHub：`https://github.com/shanheplus-24/my_homepage`
- 默认分支：`main`
- GitHub Pages：`https://shanheplus-24.github.io/my_homepage/`
- 自定义域名：`https://www.shanheplus.com/`
- 自定义域名部署：腾讯云 EdgeOne Pages

不要恢复已删除的 `academic-website`、`academic-website-v2` 或 `video-localization-worktree`；它们是旧副本。

## 新电脑恢复

1. 安装 Git、Node.js 22 LTS（至少 22.12）、npm 和 Codex。
2. 克隆仓库，或从迁移包中的 `my_homepage.bundle` 恢复 Git 历史。
3. 将仓库放入 `[Program]/academic-website-v3`。
4. 在项目目录运行：

```powershell
npm ci
npm run validate
npm run dev
```

5. 本地打开 `http://127.0.0.1:4321/`。

## 部署

- GitHub Pages：推送 `main` 后由 `.github/workflows/deploy.yml` 自动部署。
- EdgeOne Pages：构建命令 `npm run build`，输出目录 `dist`。
- 正式站点：`PUBLIC_SITE_STATUS=live`。
- 维护页面：`PUBLIC_SITE_STATUS=maintenance`，重新部署后生效。

## 必须保留

- `src/`、`public/`、`docs/`、`scripts/`
- `.github/workflows/deploy.yml`
- `package.json`、`package-lock.json`
- `.env.example`、`astro.config.mjs`、`tsconfig.json`
- `[Input]/content-templates/`
- `[Validation]/validate-content.mjs`（工作区兼容入口；仓库自身验证使用 `scripts/validate.mjs`）
- `[Validation]/original-videos-for-cos/` 中两段原始视频
- 迁移包中的 Git bundle、Codex 记忆、技能清单和校验文件

## 不迁移秘密

`.env`、GitHub/Codex 登录状态、腾讯云凭据、Token、浏览器 Cookie 和 `auth.json` 不进入迁移包。它们应在新电脑重新登录或手动配置。

迁移包保留 Codex 的项目记忆、个人技能、必要会话日志和脱敏配置模板，但不保留登录凭据或插件缓存。插件缓存可在新电脑重新安装生成。
