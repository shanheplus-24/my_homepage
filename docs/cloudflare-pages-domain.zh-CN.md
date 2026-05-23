# Cloudflare Pages 绑定一级域名

目标：把这个 Astro 静态站发布到 Cloudflare Pages，并用 `https://shanheplus.com` 作为主访问域名。

## 当前项目配置

- 项目目录：`D:\Personal_Webpage\[Program]\academic-website-v3`
- GitHub 仓库：`shanheplus-24/my_homepage`
- Pages 项目名：`shanheplus-personal-page`
- 构建命令：`npm run build`
- 输出目录：`dist`
- 生产站点 URL：`https://shanheplus.com`

## Cloudflare Pages 创建项目

1. 打开 Cloudflare Dashboard。
2. 进入 **Workers & Pages**。
3. 选择 **Create application**，再选择 **Pages**。
4. 连接 GitHub 仓库 `shanheplus-24/my_homepage`。
5. 选择生产分支 `main`。
6. 构建设置填写：

```text
Framework preset: Astro
Build command: npm run build
Build output directory: dist
Root directory: /
```

7. 在环境变量中添加：

```text
SITE_URL=https://shanheplus.com
```

8. 保存并触发第一次部署。

## 绑定一级域名

1. 进入 Cloudflare Pages 项目 `shanheplus-personal-page`。
2. 打开 **Custom domains**。
3. 点击 **Set up a domain**。
4. 填入：

```text
shanheplus.com
```

5. 继续确认。该域名已经使用 Cloudflare nameservers，Cloudflare 会为 Pages 自动创建 apex CNAME 记录。
6. 等待证书状态变为 Active 后访问：

```text
https://shanheplus.com
```

## 可选：让 www 跳转到一级域名

如果也希望 `https://www.shanheplus.com` 可访问：

1. 在同一个 Pages 项目中继续添加 Custom domain：

```text
www.shanheplus.com
```

2. 等 `www` 证书 Active。
3. 在 Cloudflare **Bulk Redirects** 中创建跳转规则：

```text
https://www.shanheplus.com/*
https://shanheplus.com/${1}
Status: 301
Preserve query string: enabled
```

不要只手动添加 DNS CNAME 而不在 Pages 的 **Custom domains** 中绑定域名；Cloudflare Pages 需要先完成 Custom domains 关联和证书签发。

## 本地验证命令

```powershell
Set-Location -LiteralPath "D:\Personal_Webpage\[Program]\academic-website-v3"
npm run build
npx wrangler whoami
```

如果 `npx wrangler whoami` 显示未登录，需要先运行：

```powershell
npx wrangler login
```

登录后可以手动直传一次当前 `dist`：

```powershell
$env:SITE_URL="https://shanheplus.com"
npm run build
npx wrangler pages deploy "dist" --project-name "shanheplus-personal-page" --branch "main"
```
