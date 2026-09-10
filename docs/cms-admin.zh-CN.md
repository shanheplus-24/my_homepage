# 网站维护后台

正式入口：https://www.shanheplus.com/admin/ 。账号名 `admin`，不提供默认密码。GitHub Pages 的管理入口自动转到此域名。旧 `/admin/publications/` 转到登录入口，旧公开配置和维护 JSON 已移除。

## 首次配置

在项目根目录运行 `npm run admin:setup`，打开终端显示的本机链接。密码至少 14 个字符，重复输入确认。原密码不会保存；窗口生成 PBKDF2-SHA256 验证值和随机会话密钥。不要把配置粘贴到聊天或提交到 Git。

线上保存需要 GitHub Fine-grained personal access token：资源所有者为 `shanheplus-24`，仅选择 `my_homepage` 仓库，Repository permissions → Contents → Read and write；Metadata 的只读权限为默认。不需要 Workflows、Actions 或其他仓库权限。令牌应设置到期日期，到期后通过 EdgeOne 更新。

本机窗口将配置保存至被 Git 忽略的 `.env.admin.local`（JSON 格式）。此文件包括密码验证值和可选仓库令牌，仍属于敏感配置，保留在本人 Windows 账户下。原始密码不会写入其中。

在 EdgeOne 中打开绑定 `www.shanheplus.com`、关联 `shanheplus-24/my_homepage` 的现有项目，进入设置／环境变量，将窗口生成内容添加到生产环境：

| 环境变量 | 内容 |
| --- | --- |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD_HASH` | 本机窗口生成的完整验证值 |
| `ADMIN_SESSION_SECRET` | 本机窗口生成的随机密钥 |
| `ADMIN_GITHUB_TOKEN` | 仅授权目标仓库的 Fine-grained token |

禁止使用 `PUBLIC_` 前缀。保存环境变量后必须重新部署才会生效，参见 [EdgeOne 构建与环境变量文档](https://pages.edgeone.ai/document/build-guide)。当前本地会话没有 EdgeOne 控制台权限，生成本机配置不等于已配置生产环境。

访问 `/api/admin/status` 可检查 `{configured:true,storageReady:true}`；此端点只公开两个布尔状态，不返回配置。之后实际使用账号密码登录并保存一项内容，核对 GitHub 部署完成及网页内容。未配置时服务关闭写入和维护数据访问，公开页面继续正常工作。

## 日常编辑

登录后左侧栏目统一提供：

- **维护总览**：全部论文、自动新增待核对、身份待核实及搜索。
- **站点设置**：姓名、身份、邮箱、SEO、导航与社交链接。
- **首页与个人介绍**：首页栏目／引用，以及 About 中英文正文和照片。
- **论文**：分类、摘要图、全名作者、共同一作、通讯作者、书目信息及自动新增论文确认。
- **添加论文 · DOI**：手动导入队列；仍执行身份核实和排除规则。
- **研究项目、动态、关于／简历条目**：对应内容与媒体。

修改完成，点击「发布」→「立即发布」。线上保存创建一个仓库提交并触发既有部署流程；网页更新需要等待部署完成。并发编辑或自动同步改变同一条目时，过期表单保存会被拒绝，需重新打开条目核对后保存。

分类和摘要图需将对应维护方式设为「手动」以保留值。已有论文默认保留人工字段。上传图片完整显示，支持 PNG/JPEG/GIF/WebP/AVIF，单文件最多 5 MB。CMS 媒体目录支持 MP4/WebM；已有大型视频继续采用仓库现有方式维护。为防误删仍被引用的图片，后台不提供媒体删除。

原有论文和手动添加的论文不需要信息确认。之后自动新增的才显示 `Information Check Needed`，位置仅为完整论文列表。确认并保存一次后，后续自动补全不重复提示。身份待核实是单独的收录规则，不因内容确认豁免而解除。

## 本地维护与验证

先通过 `npm run admin:setup` 配置密码，再运行 `npm run cms:local`；打开 http://127.0.0.1:4321/admin/ 。网页与内容 API 均绑定 loopback，本地同样需要登录。保存仅改本地文件，不会自动推送。

`npm run admin:test` 测试会话、权限、跨站请求、文件范围及并发保护；`npm run publications:test` 检查论文收录与确认规则；`npm run validate` 检查和构建全站。`Validation/admin-browser.mjs` 在隔离副本中验证实际表单和图片保存。

会话有效期 1 小时，HTTPS cookie 使用 HttpOnly、Secure、SameSite=Strict。退出清除浏览器会话和界面数据；更换密码验证值或会话密钥可使旧会话全部失效。登录失败次数限制位于每个运行实例内，不是跨所有边缘节点的持久计数；可使用 EdgeOne 的站点访问控制对登录接口增加统一速率限制。

服务端只允许当前内容集合和媒体目录；不允许修改程序、工作流、环境变量或任意文件。GitHub 令牌不会返回浏览器。源仓库本身的公开内容可见性不受后台登录改变。

## 实现说明

完整配置 `scripts/admin/config.mjs` 在登录后返回；初始化显式禁用隐式配置文件加载，避免仅传少量覆盖项导致必填配置丢失。Decap 使用自定义后端调用受保护 API。参考 [Decap 自定义控件](https://decapcms.org/docs/custom-widgets/) 和 [EdgeOne Edge Functions](https://pages.edgeone.ai/document/edge-functions)。

`scripts/admin/snapshot.generated.mjs` 在构建时生成，仅供服务端返回维护总览，不进入静态站点目录。总览反映最近成功部署的数据；编辑表单直接读取仓库当前版本。本地总览实时读取本地文件。
