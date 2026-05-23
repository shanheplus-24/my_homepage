# 图形化内容后台

当前站点已经接入 Decap CMS。以后日常内容维护优先进入后台表单，不需要直接打开 `.mdx` 文件。

## 访问入口

本地开发时：

```powershell
Set-Location -LiteralPath "D:\Personal_Webpage\[Program]\academic-website-v3"
npm run dev
```

然后打开：

```text
http://127.0.0.1:4321/admin/
```

如果要让后台直接写回本地仓库文件，另开一个 PowerShell 窗口运行：

```powershell
Set-Location -LiteralPath "D:\Personal_Webpage\[Program]\academic-website-v3"
npm run cms:server
```

注意：Decap 的本地写回代理要求当前项目目录是 Git 仓库。如果当前目录没有 `.git`，后台仍可构建和展示，但本地保存不能真正提交到文件系统。

## 可编辑内容

后台已经配置当前页面实际展示的内容：

- `Pages / Home Page`：对应 `src/content/pages/home.mdx`
- `Site Settings`：对应 `src/data/site.json`
- `Publications`：对应 `src/content/publications/*.mdx`
- `Research Projects`：对应 `src/content/research/*.mdx`
- `News`：对应 `src/content/news/*.mdx`
- `About / CV Items`：对应 `src/content/academic-info/*.mdx`

后台字段已经按当前站点展示范围清洗：不再显示未使用的 publication 类型/状态、research 高亮/状态/周期、news 外链/body、未显示的 CV 分类等。中英文 About/CV 字段保留。

图片默认上传到：

```text
public/assets/cms/
```

网页中使用的路径会自动写成：

```text
/assets/cms/...
```

## GitHub 写回配置

CMS 配置文件在：

```text
public/admin/config.yml
```

其中这两行需要和最终 GitHub 仓库保持一致：

```yaml
repo: shanheplus-24/my_homepage
branch: main
```

如果实际仓库不是这个地址，只需要改 `repo`。正式部署后，进入 `/admin/` 登录 GitHub，即可通过表单编辑内容并提交到仓库。

## 验证

每次后台保存后建议运行：

```powershell
npm run validate
```

验证通过后再发布或推送。
