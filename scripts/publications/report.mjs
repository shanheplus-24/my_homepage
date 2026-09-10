import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { loadStore, loadPublicationEntries, readJson, ROOT } from './store.mjs';
import { normalizeDoi } from './model.mjs';

const store = await loadStore();
const reviewed = await readJson(resolve(ROOT, 'src/data/publication-verified.json'), {});
const all = (await loadPublicationEntries(ROOT, true)).sort((a,b) => b.year-a.year || (a.sortOrder??999)-(b.sortOrder??999) || a.title.localeCompare(b.title));
const visible = all.filter(p => p.visible);
const pending = all.filter(p => !p.visible);
const escape = (v='') => String(v).replaceAll('|','\\|').replace(/[\r\n]+/g,' ');
const line = (...cells) => `| ${cells.map(escape).join(' | ')} |`;
const link = doi => `[${doi}](https://doi.org/${doi})`;
const content = [
  '# 论文身份复核与补全清单', '',
  `复核对象：He Shan，ORCID [0000-0002-9105-3006](https://orcid.org/0000-0002-9105-3006)。生成时间：${new Date().toISOString()}。`, '',
  `原网页 38 篇全部重查；当前公开 ${visible.length} 篇，待身份确认 ${pending.length} 篇。原记录之外新增公开 ${visible.filter(p => !store.legacy[p.id]).length} 篇；其中 ${visible.filter(p => p.confirmation.pending).length} 篇自动新增待本人确认。`, '',
  '2026-09-10 初始复核的 38 篇题名、DOI 和完整作者顺序均与当时新获取的 Crossref 元数据匹配。身份依据分为：27 篇出现在本人 ORCID，另外 5 篇出现在本人旧个人主页，5 篇经出版社作者单位人工核对，1 篇尚待确认。单位与合作作者核对属于人工判断，不等同于出版社提供了个人 ORCID。', '',
  '此前 OpenAlex 混合作者档案导致检索误匹配。12 条同名记录及 1 条更正通知已移出论文管理列表；其他误匹配检索结果也已移出用户清单，原始记录仅保存在 Validation/results/identity-reaudit/before-cleanup.json 供技术复查。没有把它们认定为本人论文。', '',
  '自动发现只使用本人公开 ORCID 或手动 DOI 输入；OpenAlex 仅按已确定 DOI 和相同题名补充摘要、分类建议，不再沿作者档案寻找论文，也不能证明身份。原网页收录、相同姓名、合作作者重合均不能单独通过身份校验。', '',
  '## 通过身份复核的论文', '',
  line('序号','论文','期刊 / 年份','DOI','身份依据','人工确认','补全数据'), line('---','---','---','---','---','---','---'),
  ...visible.map((p,i) => {
    const a=store.automatic.papers[p.id]; const r=reviewed[a.metadata.doi];
    return line(i+1,p.title,`${p.venue}, ${p.year}`,link(normalizeDoi(p.links.doi)), `${r?.reason ?? a.identity.reason}；[来源](${a.identity.source})`, p.confirmation.pending ? '待人工确认' : (p.confirmation.origin === 'automatic' ? '已人工确认' : '原有／手动论文，无需确认'), `作者全名 ${a.metadata.authorDetails.length} 人；${a.metadata.abstract?'已取得摘要':'未取得摘要'}；分类建议 ${[...a.classification.domains,...a.classification.methods].join(' / ')}`);
  }), '',
  '## 单独待确认，暂停公开', '',
  ...(pending.length ? pending.map(p => `- **${p.title}** — ${p.venue}, ${p.year}；${link(normalizeDoi(p.links.doi))}。${store.automatic.papers[p.id].reviewReasons.join('；')}。原文档、作者、摘要图和排序均保留，可在管理窗口处理。`) : ['无。']), '',
  '## 本人 ORCID 中按收录范围排除的记录', '',
  '这部分只有本人 ORCID 中存在的记录：3 篇用户明确排除的《化工学报》增刊、1 条 SSRN 预印本、1 条更正通知。会议论文及数据库／数据存储记录也由同步规则统一排除，不进入论文清单。', '',
  line('记录','DOI','原因'), line('---','---','---'),
  ...Object.values(store.automatic.excluded??{}).map(p => line(p.title,link(p.doi),p.reason)), '',
  '## 补全说明', '',
  '- 冷凝综述的正式 DOI 已核对为 10.1016/j.xcrp.2026.103351，但身份待确认，不计入通过名单。',
  '- Dehumidification with solid hygroscopic sorbents for low-carbon air conditioning 的期刊由原有的 Nature Communications 修正为 Joule。',
  '- 2021 年汽车热管理论文的 Crossref 作者缩写，按相同 DOI、作者顺序、姓氏及首字母匹配原人工全名；保留来源说明。',
  '- 原有共同一作、通讯作者、图片和手动分类保留。自动共同一作识别仅接受明确贡献声明，分类及摘要图可在管理窗口继续手动修改。', '',
];
await mkdir(resolve(ROOT, 'Output'), {recursive: true});
await writeFile(resolve(ROOT,'Output/publication-enrichment-list.zh-CN.md'),content.join('\n'));
console.log(JSON.stringify({visible:visible.length,pending:pending.length,total:all.length,report:'Output/publication-enrichment-list.zh-CN.md'}));
