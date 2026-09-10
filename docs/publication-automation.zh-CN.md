# 自动论文收录与人工维护

论文数据采用自动信息和手动修正分开保存的方式。新论文只从本人公开 ORCID 或手动 DOI 输入发现。Crossref 和出版社提供书目信息；OpenAlex 仅按已确定 DOI 和相同题名补充摘要及分类参考。无需付费模型 API。OpenAlex／Semantic Scholar 作者档案不参与生产环境发现或身份认证。

## 当前收录规则

- 作者 ORCID 为 `0000-0002-9105-3006`。身份需匹配出版社作者的精确 ORCID，或本人 ORCID 中同时匹配的 DOI、题名与全名，或 `publication-verified.json` 中经独立来源复查的 DOI、题名和完整作者顺序。作者 ORCID 冲突不得绕过。已有网页条目、同名、合作作者重合均不能单独认证。
- 只自动公开身份核验通过的期刊文章。会议、书籍章节、预印本、数据集／数据库存储、更正／撤稿不收录。身份未核实、缓存身份策略版本过期或手动 DOI 不同于已核验 DOI 时，公开开关不生效；即使手动确认作者，也不能绕过文献类型排除。
- 用户指定排除 `10.11949/0438-1157.20221538`、`10.11949/0438-1157.20201569`、`10.11949/0438-1157.20201560`。名单位于 `src/data/publication-identity.json`，后续导入同 DOI 仍排除。其他期刊增刊先待核对。
- DOI 统一大小写、去除网址前缀后去重。旧条目没有 DOI 时，用精确标题和作者匹配检索；唯一匹配才补 DOI，保持原 slug 和首页引用。
- Crossref 的 first/additional 不能证明共同一作。仅当出版商贡献声明或 JATS 脚注明确关联到连续的首位作者组时标共同一作；通讯／共同末作声明不会被当作共同一作。无法访问或说明含糊时保留待核对状态，保留原有手动标记。
- 已有同 DOI 的人工全名可用于补足数据库缩写，但必须同时匹配作者顺序、姓氏和首字母，并记录原缩写与来源。新论文的缩写若不能核实则暂不自动公开。已核实旧条目 `solid-sorbent-dehumidification` 的期刊应为 Joule，已在人工覆盖中纠正。
- 分类保留 Water / Energy / Food 和 Models / Materials / Devices / AI 两组，可多选。自动建议依据标题与可用摘要的明确词项；OpenAlex topics 只供核对，不直接决定分类。
- 自动同步保留原摘要图。新论文缺图时显示统一尺寸的占位，维护页提示上传；不会把随机图或裁切截图当作摘要图。

## 本地编辑窗口

在仓库根目录运行：

```powershell
npm run admin:setup
# 在本机窗口设置账号密码后：
npm run cms:local
```

打开 `http://127.0.0.1:4321/admin/`。一个命令同时启动网页开发服务和绑定本机 `127.0.0.1:8082` 的内容服务。停止时按 Ctrl+C。

1. 在维护总览按标题、作者、年份搜索，或筛选自动新增待核对、身份待核实。
2. 登录后点击对应论文「编辑」。进入编辑器后，可查看自动数据与贡献声明来源。
3. 修改领域和方法时，将「分类维护方式」设为「手动」。更换摘要图时将「摘要图维护方式」设为「手动」，上传或选择图片，填写图片说明。两项已经人工维护的旧论文默认是手动。
4. 作者字段支持全名、排序、共同一作、通讯作者、本人高亮。人工修改后将作者维护方式设为手动。
5. 点击「发布」→「立即发布」保存。本地保存会写入本机文件；开发页面随文件变化重新加载。Git 提交和推送由用户自己的发布流程处理，本地编辑器不会自动创建提交。

切回「自动」后，使用自动同步结果。手动图片留空表示移除；手动分类可清空。DOI、发表状态与标题／年份维护方式相互独立，因此已接收论文可自动补 DOI 和更新状态，同时保留人工标题。

「粘贴 DOI 添加」会创建导入队列。若不勾选作者身份确认，将继续使用常规身份核验。勾选代表你确认作者身份；会议、数据库等类型仍被排除。同步成功后会创建对应编辑条目，隐藏／排除候选也保留可核对记录。

```powershell
npm run publications:sync -- --write
# 强制重新核验一篇
npm run publications:sync -- --write --refresh --doi=10.1016/j.xcrp.2026.103351
# 生成全部补全清单
node "scripts/publications/report.mjs"
```

## 自动更新和部署

`.github/workflows/sync-publications.yml` 每天 UTC 10:23 运行，也可通过 GitHub Actions 的 Sync publications 手动运行；导入队列和身份配置推送到 main 后也会触发。默认有效缓存七天，工作流 refresh 开关可强制重取。同步前运行规则测试，写入后运行完整网站检查。

工作流只提交自动数据及新建的覆盖条目，不改已有人工覆盖。若远端变化则 rebase 并重新验证，随后明确触发 GitHub Pages 部署工作流。单个来源失败时保留已有数据，在 artifact 报告失败；公开网站构建不请求论文 API。聚合作者档案的适配器只保留给技术审计，不用于生产同步。

此工作流只有在代码推送到远端 main 后才会启用。本地文件存在不能证明线上已启用；以远端 Actions 和网站内容为准。

## 统一后台与账号登录

网站 `/admin/` 使用用户名和密码登录，账号名为 `admin`。所有维护数据、完整 CMS 配置、编辑窗口和保存 API 均由服务端校验会话。配置与上线步骤见 [后台维护说明](cms-admin.zh-CN.md)。旧 OAuth 适配器不再用于后台登录。

## 文件和验证

| 路径 | 用途 |
| --- | --- |
| `src/content/publications/*.mdx` | 原始 38 篇论文，保留作迁移基线 |
| `src/data/publication-verified.json` | 独立来源逐篇核验凭据及完整作者顺序；不得由作者聚合档案自动扩充 |
| `src/data/publications-auto.json` | 自动书目信息、摘要、分类、贡献声明、身份、排除和导入状态 |
| `src/data/publication-overrides/*.json` | CMS 编辑的手动覆盖与维护方式 |
| `src/data/publication-imports/*.json` | 手动 DOI 导入队列 |
| `Output/publication-sync-report.json` | 本次同步的新增、补全、排除、失败记录 |
| `Output/publication-enrichment-list.zh-CN.md` | 面向用户的全量补全与排除清单 |
| `Validation/publications.test.mjs` | DOI、身份、贡献、分类、手动覆盖及同步回归 |
| `Validation/oauth.test.mjs` | OAuth 状态与权限验证 |
| `Validation/browser-publications.mjs` | 桌面／手机页面和真实本地 CMS 表单保存验证 |

标准检查为 `npm run publications:test` 和 `npm run validate`。浏览器验证复用工作区 Playwright，或通过 `PLAYWRIGHT_MODULE` 指定安装路径；会创建独立副本，保存测试只修改副本。GitHub Pages 子路径验证时先用 `BASE_PATH=/my_homepage` 构建，再以同一变量运行浏览器验证。

参考实现：[we3lab](https://github.com/stanford-developers/we3lab)、[Greene Lab Website Template](https://github.com/greenelab/lab-website-template)、[al-folio](https://github.com/alshedivat/al-folio)。本实现采用适合当前 Astro／Decap 网站的独立数据层，没有复制其他模板的发布系统。

## 2026-09-10 身份重新核查

原网页 38 篇逐篇重新获取 Crossref 数据，题名和作者顺序全匹配。27 篇由本人 ORCID 支持，5 篇由旧 Google Sites 个人主页支持，5 篇由出版社作者单位和合作关系人工复核，1 篇冷凝综述待本人确认并暂停公开。未删除原 MDX。误匹配的 12 条同名论文及 1 条更正通知从编辑列表移出，清理前完整快照保存在本地 `Validation/results/identity-reaudit/before-cleanup.json`。主清单不再展示外部误匹配文章。

## 网页上的信息核对标记（当前规则）

原有 38 篇论文和手动添加的论文无需内容确认。之后由 ORCID 自动发现并新增的论文记录 `origin: automatic`；手动 DOI 导入记录 `origin: manual`，来源一经确定，后续补全不会改变。

只有自动新增且尚未确认的论文，在完整 Publications 列表显示 `Information Check Needed`。首页精选卡片和首页不显示核对标记或待确认汇总。

后台论文编辑表单可确认或撤销。确认保存在人工覆盖 `reviewedAutomaticRevision` 中，今后元数据补全不会重复要求确认。版本摘要仍用于避免通过 GitHub 工作流确认过期内容；它不再决定已确认论文是否重新提示。

当前公开 37 篇，自动新增待信息核对 0 篇。原第 38 篇冷凝综述仍处于独立的身份待核实状态；免除内容确认不等于补充缺失的身份依据。

浏览器回归使用 `Validation/admin-browser.mjs`，在隔离副本验证登录、完整配置加载、分类、中文图片、站点资料保存和退出；旧 `browser-publications.mjs` 是之前版本的历史验证程序，不适用于当前后台。核心命令为 `npm run publications:test`、`npm run admin:test`、`npm run validate`。
