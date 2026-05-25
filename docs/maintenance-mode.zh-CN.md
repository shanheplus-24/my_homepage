# 网站维护模式切换

这个项目支持两种构建结果：

- 正常站点：发布完整个人主页。
- 维护页面：所有使用 `BaseLayout` 的公开页面都会显示维护提示，并带 `noindex, nofollow`。

## 本地生成维护页面

```powershell
Set-Location -LiteralPath "D:\Personal_Webpage\[Program]\academic-website-v3"
npm run build:maintenance
```

生成结果在：

```text
D:\Personal_Webpage\[Program]\academic-website-v3\dist
```

## 本地恢复正常站点

```powershell
Set-Location -LiteralPath "D:\Personal_Webpage\[Program]\academic-website-v3"
npm run build:site
```

## EdgeOne Pages 切换方式

在 EdgeOne Pages 项目设置的环境变量中设置：

```text
PUBLIC_SITE_STATUS=maintenance
```

然后重新部署 Production，线上会进入维护模式。

恢复正式站点时删除这个环境变量，或把值改成：

```text
live
```

然后重新部署 Production。不要改 Cloudflare DNS，也不要删除自定义域名绑定。

## 如果使用 Cloudflare Pages 直传

维护页面上线：

```powershell
Set-Location -LiteralPath "D:\Personal_Webpage\[Program]\academic-website-v3"
npm run deploy:maintenance
```

正式站点恢复：

```powershell
Set-Location -LiteralPath "D:\Personal_Webpage\[Program]\academic-website-v3"
npm run deploy:site
```

第一次使用直传前，如果 Wrangler 没有登录，需要先运行：

```powershell
npx wrangler login
```

## 如果使用 EdgeOne Pages 自动构建

推荐做法是在 EdgeOne Pages 的构建设置中切换构建命令：

```text
维护页面：npm run build:maintenance
正式站点：npm run build
```

切换后重新部署 Production 即可。不要改 Cloudflare DNS，也不要删除自定义域名绑定。
