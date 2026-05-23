# 网站维护模式切换

这个项目支持两种构建结果：

- 正常站点：发布完整个人主页。
- 维护页面：所有使用 `BaseLayout` 的公开页面都会显示维护提示，并带 `noindex, nofollow`。

## 本地生成维护页面

```powershell
Set-Location -LiteralPath "D:\Personal_Webpage\[Program]\academic-website-v3"
npm run build:maintenance
```

## 本地恢复正常站点

```powershell
Set-Location -LiteralPath "D:\Personal_Webpage\[Program]\academic-website-v3"
npm run build:site
```

## EdgeOne Pages 切换方式

在 EdgeOne Pages 项目设置的环境变量中设置：

```text
PUBLIC_MAINTENANCE_MODE=true
```

然后重新部署 Production，线上会进入维护模式。

恢复正式站点时删除这个环境变量，或把值改成：

```text
false
```

然后重新部署 Production。不要改 Cloudflare DNS，也不要删除自定义域名绑定。

