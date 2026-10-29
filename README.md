# 我的早报

只保留「我的早报」的团队阅读站，使用 BestBlogs OpenAPI 的个人早报数据。

正式分享地址：https://wonderful-0803.github.io/morning-brief/

## GitHub Pages（正式版）

GitHub Actions 在北京时间每天 08:17、10:17 拉取早报并部署，也支持在 Actions 中手动运行。GitHub 的定时任务可能延迟；当天尚未出刊时保留最近一期。无需电脑保持运行。

API Key 仅存于仓库的 `BESTBLOGS_API_KEY` Actions Secret。同步脚本只发布文章字段，密钥、原始 API 响应、个人资料和内部推荐画像不会提交。

`npm run sync` 将脱敏早报存入 `web/data/`，保留往期；`web/briefs.json` 是最新一期索引。使用 `BRIEF_MODE=static npm run build` 生成适用于 GitHub Pages 的网站，访问者直接读取静态 JSON，不调用 BestBlogs API。

## 本地使用

需要 Node.js 22 或更新版本。复制 `.env.example` 为 `.env.local`，设置 `BESTBLOGS_API_KEY`，然后执行 `npm run dev`。打开 http://localhost:4173。

`npm run build` 输出静态资源到 `dist/`。`api/brief.js` 是 IGA Pages Function；它从服务端环境变量读取密钥，缓存 30 分钟并合并并发请求。浏览器只收到文章白名单字段，不收到密钥、账户资料或内部兴趣画像。

搜索、深度阅读、内容类型、日期切换、摘要弹窗、原文阅读、分享、收藏和已读状态均可用。收藏与已读状态保存在每个浏览器本地。

## IGA Pages 部署

1. `npx @iga-pages/cli@1.1.15 login`
2. `npx @iga-pages/cli@1.1.15 pages link --name morning-brief --scope overseas --yes`
3. 在项目环境变量中配置 `BESTBLOGS_API_KEY`。
4. 仅将 `web/`、`api/`、`lib/`、`scripts/build.mjs`、`package.json`、`package-lock.json`、`iga.json` 与链接信息放入干净的部署目录，再从该目录执行 `npx @iga-pages/cli@1.1.15 pages deploy --logs`。

注意：CLI 的直接上传模式不会遵守 `.gitignore`，不要从含有 `.env.local` 的原始工作目录直接上传。代码与静态资源中均不应包含密钥。

IGA 默认预览链接有 3 小时有效期，长期分享需要在控制台绑定自定义域名。IGA 版本作为预览保留；正式版使用上方固定 GitHub Pages 地址。可执行 `npx @iga-pages/cli@1.1.15 pages preview` 获取新的 IGA 预览链接。

IGA 实时版本在访问网站时同步当前早报；GitHub Pages 正式版由云端定时任务同步。两种模式在当天尚未出刊时均显示最近一期并提示。同步故障时可显示已保存内容，并标明日期。

`npm test` 检查共享响应脱敏、日期校验和并发缓存。内容版权归原作者及 BestBlogs 所有，网站保留来源与原文链接。
