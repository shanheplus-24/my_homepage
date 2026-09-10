/* global CMS, createClass, h */
(() => {
  let database = null;
  const dataReady = fetch('./publication-data.json', { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error('无法读取自动数据'); return r.json(); }).then((data) => { database = data; return data; });
  dataReady.catch(() => {}); // Editors mounted later provide the visible error state.
  const editorId = () => decodeURIComponent(location.hash.split('/entries/')[1]?.split('?')[0] ?? '');
  const panelStyle = { padding: '16px', background: '#f0f5fb', borderRadius: '8px', fontSize: '13px', lineHeight: 1.7, overflowWrap: 'anywhere' };
  const safeLink = (url) => /^https:\/\//.test(url ?? '') ? url : '#';
  const basePath = location.pathname.replace(/\/admin\/?$/, '');
  // Decap's stock controls display repository-root media URLs. Adapt the DOM only:
  // saved values must remain independent of the deployment's /my_homepage prefix.
  if (basePath) {
    const adaptImages = (node) => {
      if (!(node instanceof Element)) return;
      const images = node.matches('img') ? [node] : node.querySelectorAll('img');
      for (const img of images) {
        const src = img.getAttribute('src');
        if (src?.startsWith('/assets/')) img.setAttribute('src', basePath + src);
      }
    };
    const observer = new MutationObserver((changes) => {
      for (const change of changes) {
        if (change.type === 'attributes') adaptImages(change.target);
        else change.addedNodes.forEach(adaptImages);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
    adaptImages(document.body);
  }
  const Assistant = createClass({
    getInitialState() { return { loaded: Boolean(database), error: '' }; },
    componentDidMount() { this.active = true; dataReady.then(() => { if (this.active) this.setState({ loaded: true }); }).catch(() => { if (this.active) this.setState({ error: '自动信息暂时无法读取；已有人工字段仍可编辑。' }); }); },
    componentWillUnmount() { this.active = false; },
    render() {
      const record = database?.automatic?.[editorId()];
      if (!record) return h('div', { style: panelStyle }, this.state.error || '尚无自动信息。已有论文的作者、图片和分类已保留为手动值。');
      return h('div', { style: panelStyle },
        h('strong', {}, '最近同步的自动信息'),
        h('p', {}, record.metadata.title),
        h('p', {}, `${record.metadata.venue} · ${record.metadata.year}`),
        h('p', {}, record.metadata.authorDetails.map((a) => a.name + (a.coFirst ? '†' : '')).join(', ')),
        h('p', {}, `建议分类：${[...record.classification.domains, ...record.classification.methods].join(' / ') || '待分类'}`),
        h('p', {}, `分类依据：${record.classification.reasons.join('；')}`),
        h('p', {}, `共同一作：${record.authorship.status === 'confirmed' ? '已识别贡献声明' : '未取得明确声明，需要核对'}`),
        ...record.authorship.evidence.map((item, i) => h('p', { key: i }, item.quote, ' ', h('a', { href: safeLink(item.source), target: '_blank', rel: 'noopener noreferrer' }, '查看来源'))),
        h('p', {}, `身份核验：${record.identity.verified ? '通过' : '待核对'} · ${record.identity.reason}`),
        record.reviewReasons.length ? h('p', {}, record.reviewReasons.join('；')) : null,
        h('a', { href: './publications/', target: '_blank', rel: 'noopener' }, '打开论文维护总览'),
        h('p', {}, '修改字段后请选择「手动」以锁定；选择「自动」会使用上方同步值。'));
    },
  });
  CMS.registerWidget('publication-assistant', Assistant);
  const Review = createClass({
    getInitialState() { return { loaded: Boolean(database), error: '' }; },
    componentDidMount() { this.active = true; dataReady.then(() => { if (this.active) this.setState({ loaded: true }); }).catch(() => { if (this.active) this.setState({ error: '无法读取当前版本，请刷新后重试。' }); }); },
    componentWillUnmount() { this.active = false; },
    render() {
      const entry = database?.entries?.find((item) => item.id === editorId());
      const revision = entry?.confirmation?.revision;
      const confirmed = Boolean(revision && this.props.value === revision);
      return h('div', { style: panelStyle },
        h('strong', {}, confirmed ? '本次自动更新已人工确认' : '本次自动更新待人工确认'),
        h('p', {}, this.state.error || '请先核对作者、题名、期刊、分类和图片，再确认本次更新。保存后网页标记消失；实质内容再次更新时重新提示，重复同步不影响确认。'),
        h('button', { type: 'button', disabled: !revision || entry?.review?.identity, onClick: () => this.props.onChange(confirmed ? '' : revision), style: { padding: '9px 14px', cursor: 'pointer' } }, confirmed ? '撤销本次确认' : '我已核对，确认本次更新'),
        entry?.review?.identity ? h('p', {}, '此论文身份尚未通过，请先在 DOI 导入入口核实作者身份。') : null);
    },
  });
  CMS.registerWidget('publication-review', Review);
  CMS.registerPreviewTemplate('publications', createClass({
    getInitialState() { return { loaded: Boolean(database) }; },
    componentDidMount() { this.active = true; dataReady.then(() => { if (this.active) this.setState({ loaded: true }); }).catch(() => {}); },
    componentWillUnmount() { this.active = false; },
    render() {
      const data = this.props.entry.getIn(['data']).toJS();
      const auto = database?.automatic?.[data.id];
      const legacy = database?.legacy?.[data.id] ?? {};
      const base = { ...legacy, ...auto?.metadata };
      const meta = data.metadataMode === 'manual' ? data : base;
      const authors = data.authorsMode === 'manual' ? data.authorDetails : (base.authorDetails ?? data.authorDetails);
      const tags = data.taxonomyMode === 'manual' ? [...(data.domains ?? []), ...(data.methods ?? [])] : [...(auto?.classification.domains ?? []), ...(auto?.classification.methods ?? [])];
      const image = data.imageMode === 'manual' ? data.image : base.image;
      let src = image?.src ? String(this.props.getAsset(image.src)) : '';
      if (src.startsWith('/assets/')) src = location.pathname.replace(/\/admin\/?$/, '') + src;
      return h('article', { style: { fontFamily: 'Arial, sans-serif', padding: '28px', color: '#18324d', lineHeight: 1.7 } },
        database?.entries?.find((item) => item.id === data.id)?.confirmation?.revision !== data.reviewedAutomaticRevision ? h('p', { style: { color: '#754600', background: '#fff4d6', padding: '8px' } }, 'Pending review · 待人工确认') : null,
        h('p', {}, '论文卡片预览 · ' + (data.visibility === 'excluded' || data.visibility === 'hidden' ? '当前隐藏' : '保存后生效')),
        h('div', { style: { height: '220px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '16px', background: '#edf2f8' } }, src ? h('img', { src, alt: image.alt ?? '', style: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', background: '#fff' } }) : '待添加摘要图'),
        h('p', {}, tags.join(' · ')), h('h2', {}, meta.title),
        h('p', {}, (authors ?? []).map((a) => a.name + (a.coFirst ? '†' : '') + (a.corresponding ? '*' : '')).join(', ')),
        h('strong', {}, `${meta.venue ?? ''} | ${meta.year ?? ''}`));
    },
  }));
})();
