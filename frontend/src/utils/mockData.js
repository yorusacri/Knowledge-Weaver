// Realistic demo data for knowledge graph visualization
// Based on medical textbook content (生理学, 病理学, 免疫学, etc.)

const BOOK_COLORS = [
  '#f59e0b', // 生理学 — amber
  '#3b82f6', // 病理学 — blue
  '#10b981', // 免疫学 — green
  '#8b5cf6', // 药理学 — purple
  '#ec4899', // 解剖学 — pink
  '#06b6d4', // 组织学 — cyan
  '#f97316', // 生物化学 — orange
];

const BOOK_NAMES = [
  '生理学', '病理学', '免疫学', '药理学', '解剖学', '组织学', '生物化学',
];

const CATEGORIES = ['核心概念', '生理机制', '疾病概念', '解剖结构', '生化过程', '免疫机制', '药理作用'];

function makeId(prefix, idx) {
  return `${prefix}_${String(idx).padStart(3, '0')}`;
}

export function generateMockGraphData(bookCount = 3) {
  const nodes = [];
  const edges = [];

  // Shared concepts (appear across multiple books)
  const sharedConcepts = [
    { name: '动作电位', definition: '细胞受到刺激后膜电位发生的一次快速而可逆的倒转，是神经和肌肉细胞兴奋的标志。', category: '核心概念', chapters: ['第二章 细胞的基本功能', '第一章 细胞生理', '第三章 神经生理'] },
    { name: '静息电位', definition: '细胞在安静状态下，膜内外存在的电位差，内负外正，约-70~-90mV。', category: '核心概念', chapters: ['第二章 细胞的基本功能', '第一章 细胞生理'] },
    { name: '炎症', definition: '具有血管系统的活体组织对各种损伤因子的刺激所发生的以防御为主的反应。', category: '疾病概念', chapters: ['第四章 炎症', '第九章 免疫', '第五章 病理学总论'] },
    { name: '免疫应答', definition: '免疫系统识别和清除抗原的整个过程，包括固有免疫和适应性免疫。', category: '免疫机制', chapters: ['第九章 免疫', '第二章 免疫细胞', '第十一章 免疫学应用'] },
    { name: '细胞凋亡', definition: '由基因控制的细胞自主有序的死亡过程，对维持组织稳态至关重要。', category: '核心概念', chapters: ['第二章 细胞的基本功能', '第三章 细胞损伤', '第四章 分子生物学基础'] },
    { name: '抗体', definition: 'B细胞接受抗原刺激后分化为浆细胞所产生的一类能与相应抗原特异性结合的免疫球蛋白。', category: '免疫机制', chapters: ['第九章 免疫', '第三章 抗体'] },
    { name: '受体', definition: '细胞膜上或细胞内能特异识别生物活性分子并与之结合的蛋白质分子。', category: '核心概念', chapters: ['第二章 细胞的基本功能', '第一章 药理学总论', '第五章 生化信号转导'] },
    { name: '酶', definition: '由活细胞产生的具有催化功能的生物分子，绝大多数酶的本质是蛋白质。', category: '生化过程', chapters: ['第三章 酶学', '第七章 物质代谢'] },
    { name: '神经递质', definition: '由神经末梢释放的化学物质，能将信息从一个神经元传递到另一个神经元或效应细胞。', category: '生理机制', chapters: ['第十章 神经系统', '第二章 传出神经系统药理学'] },
    { name: '激素', definition: '由内分泌腺或内分泌细胞分泌的高效生物活性物质，经组织液或血液传递发挥调节作用。', category: '生理机制', chapters: ['第十一章 内分泌', '第三章 受体与信号转导'] },
    { name: '核酸', definition: '由核苷酸聚合而成的生物大分子，包括DNA和RNA，是遗传信息的载体。', category: '生化过程', chapters: ['第五章 核酸化学', '第九章 基因表达调控'] },
    { name: '蛋白质', definition: '由氨基酸通过肽键连接形成的生物大分子，是生命活动的主要承担者。', category: '生化过程', chapters: ['第二章 蛋白质化学', '第四章 分子生物学基础'] },
  ];

  // Unique concepts per book
  const uniqueConcepts = [
    // 生理学
    [
      { name: '心输出量', definition: '每分钟由一侧心室射入动脉的血液量，等于心率与每搏输出量的乘积。', category: '生理机制' },
      { name: '肺通气', definition: '气体经呼吸道出入肺的过程，是呼吸过程的第一步。', category: '生理机制' },
      { name: '肾小球滤过', definition: '血液流经肾小球毛细血管时，血浆中的水分和小分子物质滤入肾小囊的过程。', category: '生理机制' },
      { name: '胃液分泌', definition: '胃腺细胞分泌胃液的过程，包括盐酸、胃蛋白酶原等成分。', category: '生理机制' },
    ],
    // 病理学
    [
      { name: '坏死', definition: '活体内局部组织、细胞的病理性死亡，表现为细胞核固缩、碎裂、溶解。', category: '疾病概念' },
      { name: '肿瘤', definition: '在各种致瘤因素作用下，局部组织细胞在基因水平上失去对其生长的正常调控而异常增生形成的新生物。', category: '疾病概念' },
      { name: '血栓形成', definition: '在活体心脏和血管内血液发生凝固或血液有形成分凝集成固体质块的过程。', category: '疾病概念' },
      { name: '梗死', definition: '由于动脉血供中断而侧支循环又不能代偿，引起局部组织缺血性坏死。', category: '疾病概念' },
    ],
    // 免疫学
    [
      { name: 'T细胞', definition: '来源于骨髓的淋巴样祖细胞，在胸腺中发育成熟的淋巴细胞，负责细胞免疫。', category: '免疫机制' },
      { name: 'B细胞', definition: '在骨髓中发育成熟的淋巴细胞，受抗原刺激后可分化为浆细胞产生抗体。', category: '免疫机制' },
      { name: 'MHC分子', definition: '主要组织相容性复合体编码的细胞表面糖蛋白，在免疫应答中起关键作用。', category: '免疫机制' },
      { name: '补体系统', definition: '由30余种血清蛋白组成的级联反应系统，参与固有免疫和适应性免疫。', category: '免疫机制' },
    ],
    // 药理学
    [
      { name: '半衰期', definition: '血浆药物浓度下降一半所需的时间，是确定给药间隔的重要依据。', category: '药理作用' },
      { name: '首过效应', definition: '口服药物在经门静脉进入肝脏后，部分被肝脏代谢灭活，使进入体循环的药量减少。', category: '药理作用' },
      { name: '竞争性拮抗', definition: '拮抗药与激动药竞争同一受体，使激动药的量效曲线平行右移。', category: '药理作用' },
      { name: '治疗指数', definition: '半数致死量与半数有效量的比值，是衡量药物安全性的重要指标。', category: '药理作用' },
    ],
    // 解剖学
    [
      { name: '肝小叶', definition: '肝脏的基本结构和功能单位，呈多角棱柱体，中央有中央静脉。', category: '解剖结构' },
      { name: '肾单位', definition: '肾脏的基本功能单位，由肾小体和肾小管组成。', category: '解剖结构' },
      { name: '神经元', definition: '神经系统的基本结构和功能单位，由胞体和突起组成。', category: '解剖结构' },
      { name: '肺泡', definition: '肺的功能单位，是气体交换的场所，由单层肺泡上皮构成。', category: '解剖结构' },
    ],
    // 组织学
    [
      { name: '上皮组织', definition: '由密集排列的上皮细胞和少量细胞间质组成，覆盖于体表或衬于体内各种管腔的内表面。', category: '解剖结构' },
      { name: '结缔组织', definition: '由细胞和大量细胞间质构成，具有连接、支持、营养、保护等功能。', category: '解剖结构' },
      { name: '肌组织', definition: '主要由肌细胞组成，具有收缩功能，分为骨骼肌、心肌和平滑肌。', category: '解剖结构' },
    ],
    // 生物化学
    [
      { name: '糖酵解', definition: '在无氧条件下，葡萄糖分解为丙酮酸并产生ATP的过程。', category: '生化过程' },
      { name: '三羧酸循环', definition: '在线粒体中，乙酰CoA与草酰乙酸缩合后经历一系列氧化脱羧反应的循环过程。', category: '生化过程' },
      { name: '氧化磷酸化', definition: '在呼吸链电子传递过程中偶联ADP磷酸化生成ATP的过程。', category: '生化过程' },
      { name: '基因表达', definition: '基因经过转录和翻译，产生具有生物功能的蛋白质或RNA产物的过程。', category: '生化过程' },
    ],
  ];

  let nodeIdx = 0;

  // Add shared concept nodes (one per active book)
  sharedConcepts.forEach((concept) => {
    const freq = Math.min(bookCount, 1 + Math.floor(Math.random() * bookCount));
    for (let b = 0; b < freq; b++) {
      if (b >= bookCount) break;
      const nodeId = makeId('node', nodeIdx++);
      nodes.push({
        id: nodeId,
        name: concept.name,
        definition: concept.definition,
        category: concept.category,
        chapter: concept.chapters[b % concept.chapters.length],
        page: 10 + Math.floor(Math.random() * 200),
        textbook: BOOK_NAMES[b],
        textbook_color: BOOK_COLORS[b],
        frequency: freq,
      });
    }
  });

  // Add unique concept nodes
  for (let b = 0; b < bookCount; b++) {
    const concepts = uniqueConcepts[b] || uniqueConcepts[0];
    concepts.forEach((concept) => {
      const nodeId = makeId('node', nodeIdx++);
      nodes.push({
        id: nodeId,
        name: concept.name,
        definition: concept.definition,
        category: concept.category,
        chapter: `第${Math.floor(Math.random() * 12) + 1}章`,
        page: 10 + Math.floor(Math.random() * 300),
        textbook: BOOK_NAMES[b],
        textbook_color: BOOK_COLORS[b],
        frequency: 1,
      });
    });
  }

  // Generate edges
  const relationTypes = ['prerequisite', 'parallel', 'contains', 'applies_to'];
  const relationLabels = {
    prerequisite: '前置依赖',
    parallel: '并列关系',
    contains: '包含关系',
    applies_to: '应用关系',
  };
  const relationColors = {
    prerequisite: '#f59e0b',
    parallel: '#3b82f6',
    contains: '#10b981',
    applies_to: '#8b5cf6',
  };

  // Create meaningful connections
  const edgeRules = [
    // Prerequisites
    { from: '静息电位', to: '动作电位', type: 'prerequisite', desc: '理解动作电位需要先掌握静息电位的概念' },
    { from: '蛋白质', to: '酶', type: 'prerequisite', desc: '酶的本质是蛋白质，理解酶需要先掌握蛋白质' },
    { from: '核酸', to: '基因表达', type: 'prerequisite', desc: '基因表达以核酸为模板' },
    { from: '抗体', to: '免疫应答', type: 'prerequisite', desc: '抗体是适应性免疫应答的重要效应分子' },
    // Contains
    { from: '免疫应答', to: 'T细胞', type: 'contains', desc: 'T细胞是免疫应答的核心细胞' },
    { from: '免疫应答', to: 'B细胞', type: 'contains', desc: 'B细胞介导体液免疫应答' },
    { from: '免疫应答', to: 'MHC分子', type: 'contains', desc: 'MHC分子参与抗原呈递' },
    { from: '免疫应答', to: '补体系统', type: 'contains', desc: '补体系统参与固有免疫' },
    { from: '炎症', to: '免疫应答', type: 'contains', desc: '免疫应答是炎症反应的重要组成部分' },
    // Parallel
    { from: 'T细胞', to: 'B细胞', type: 'parallel', desc: 'T细胞和B细胞是两大类淋巴细胞' },
    { from: '糖酵解', to: '三羧酸循环', type: 'parallel', desc: '两者都是葡萄糖分解代谢的重要阶段' },
    { from: '心输出量', to: '肺通气', type: 'parallel', desc: '同属循环/呼吸系统的核心指标' },
    // Applies_to
    { from: '受体', to: '神经递质', type: 'applies_to', desc: '神经递质通过与受体结合发挥作用' },
    { from: '受体', to: '激素', type: 'applies_to', desc: '激素通过与特异性受体结合发挥调节作用' },
    { from: '半衰期', to: '治疗指数', type: 'applies_to', desc: '半衰期是计算治疗指数的重要参数' },
    { from: '酶', to: '糖酵解', type: 'applies_to', desc: '糖酵解过程需要多种酶的催化' },
    { from: '酶', to: '三羧酸循环', type: 'applies_to', desc: '三羧酸循环由多种酶催化完成' },
    { from: '细胞凋亡', to: '肿瘤', type: 'applies_to', desc: '细胞凋亡异常与肿瘤发生密切相关' },
    { from: '细胞凋亡', to: '坏死', type: 'parallel', desc: '两种不同的细胞死亡方式' },
  ];

  let edgeIdx = 0;
  edgeRules.forEach((rule) => {
    const sourceNodes = nodes.filter((n) => n.name === rule.from);
    const targetNodes = nodes.filter((n) => n.name === rule.to);
    if (sourceNodes.length && targetNodes.length) {
      const source = sourceNodes[0];
      const target = targetNodes[0];
      edges.push({
        id: makeId('edge', edgeIdx++),
        source: source.id,
        target: target.id,
        relation_type: rule.type,
        relation_label: relationLabels[rule.type],
        relation_color: relationColors[rule.type],
        description: rule.desc,
      });
    }
  });

  // Add some random edges for visual richness
  for (let i = 0; i < Math.min(10, nodes.length * 0.3); i++) {
    const src = nodes[Math.floor(Math.random() * nodes.length)];
    const tgt = nodes[Math.floor(Math.random() * nodes.length)];
    if (src.id !== tgt.id && !edges.find((e) => (e.source === src.id && e.target === tgt.id) || (e.source === tgt.id && e.target === src.id))) {
      const rType = relationTypes[Math.floor(Math.random() * relationTypes.length)];
      edges.push({
        id: makeId('edge', edgeIdx++),
        source: src.id,
        target: tgt.id,
        relation_type: rType,
        relation_label: relationLabels[rType],
        relation_color: relationColors[rType],
        description: `${src.name} 与 ${tgt.name} 的${relationLabels[rType]}`,
      });
    }
  }

  return { nodes, edges, stats: { totalNodes: nodes.length, totalEdges: edges.length, bookCount } };
}

export function generateMockIntegrations() {
  return [
    {
      decision_id: 'merge_001',
      action: 'merge',
      affected_nodes: ['动作电位 (生理学)', '动作电位 (病理学)', '动作电位 (免疫学)'],
      result_node: '动作电位 (整合版)',
      reason: '三本教材对动作电位的定义和机制描述高度一致，保留《生理学》版本最为系统完整，补充《病理学》中的临床意义和《免疫学》中的免疫细胞应用实例。',
      confidence: 0.95,
      textbook_sources: ['生理学', '病理学', '免疫学'],
    },
    {
      decision_id: 'merge_002',
      action: 'merge',
      affected_nodes: ['炎症 (病理学)', '炎症反应 (免疫学)'],
      result_node: '炎症 (整合版)',
      reason: '两本教材从不同角度阐述炎症——病理学侧重形态学变化，免疫学侧重免疫机制。合并后保留两个维度的内容，形成更完整的知识体系。',
      confidence: 0.91,
      textbook_sources: ['病理学', '免疫学'],
    },
    {
      decision_id: 'keep_001',
      action: 'keep',
      affected_nodes: ['肾小球滤过 (生理学)'],
      result_node: null,
      reason: '该概念仅在《生理学》中出现，是肾脏生理的核心内容，具有不可替代性，予以保留。',
      confidence: 1.0,
      textbook_sources: ['生理学'],
    },
    {
      decision_id: 'remove_001',
      action: 'remove',
      affected_nodes: ['细胞基本结构概述 (组织学)'],
      result_node: null,
      reason: '该内容为《组织学》中对细胞基本结构的概述性描述，其核心知识点（细胞膜、细胞器等）已在其他章节被更详细地覆盖，属于冗余内容。',
      confidence: 0.87,
      textbook_sources: ['组织学'],
    },
    {
      decision_id: 'merge_003',
      action: 'merge',
      affected_nodes: ['抗体 (免疫学)', '免疫球蛋白 (生物化学)'],
      result_node: '抗体/免疫球蛋白 (整合版)',
      reason: '"抗体"和"免疫球蛋白"是同一物质的不同命名角度，免疫学侧重功能，生物化学侧重分子结构。合并后两种视角互补。',
      confidence: 0.93,
      textbook_sources: ['免疫学', '生物化学'],
    },
    {
      decision_id: 'merge_004',
      action: 'merge',
      affected_nodes: ['酶 (生物化学)', '酶学基础 (药理学)'],
      result_node: '酶与酶学 (整合版)',
      reason: '药理学中对酶的描述侧重于药物靶点，生物化学侧重于催化机制。合并后保留完整的酶学知识和药理应用。',
      confidence: 0.89,
      textbook_sources: ['生物化学', '药理学'],
    },
    {
      decision_id: 'keep_002',
      action: 'keep',
      affected_nodes: ['半衰期 (药理学)'],
      result_node: null,
      reason: '药动学中的半衰期概念具有独特的临床意义，虽然与其他教材中时间相关概念有表面相似，但内涵不同，独立保留。',
      confidence: 0.96,
      textbook_sources: ['药理学'],
    },
    {
      decision_id: 'remove_002',
      action: 'remove',
      affected_nodes: ['生物化学绪论 (生物化学)'],
      result_node: null,
      reason: '绪论性内容多为学科简介和历史回顾，对核心知识体系贡献有限，在整合版中可由章节标题和概述替代。',
      confidence: 0.82,
      textbook_sources: ['生物化学'],
    },
  ];
}

export function generateMockRAGResult() {
  return {
    answer: '炎症（inflammation）是具有血管系统的活体组织对各种损伤因子的刺激所发生的以防御为主的反应。炎症的基本病理变化包括变质（alteration）、渗出（exudation）和增生（proliferation）。在临床上，炎症局部可出现红、肿、热、痛和功能障碍五大症状。\n\n炎症的免疫学机制涉及固有免疫和适应性免疫的协同作用。中性粒细胞是急性炎症早期的主要浸润细胞，而巨噬细胞和淋巴细胞则在慢性炎症中发挥关键作用。补体系统的激活也是炎症反应的重要组成部分。',
    citations: [
      { textbook: '病理学', chapter: '第四章 炎症', page: 78, relevance_score: 0.95 },
      { textbook: '免疫学', chapter: '第九章 免疫', page: 302, relevance_score: 0.88 },
      { textbook: '生理学', chapter: '第九章 免疫', page: 256, relevance_score: 0.82 },
      { textbook: '组织学', chapter: '第六章 血液', page: 145, relevance_score: 0.71 },
    ],
    source_chunks: [
      '炎症(inflammation)是具有血管系统的活体组织对各种损伤因子的刺激所发生的以防御为主的反应。炎症的基本病理变化包括变质、渗出和增生三种改变。',
      '机体免疫系统在炎症反应中发挥重要作用。固有免疫细胞如中性粒细胞、巨噬细胞通过模式识别受体识别病原相关分子模式，启动炎症级联反应。',
      '炎症反应的局部表现为红、肿、热、痛和功能障碍。红和热是由于局部血管扩张、血流加快所致；肿是由于局部充血和渗出物积聚所致。',
      '血液中的白细胞在炎症反应中起重要作用。中性粒细胞是急性炎症中最常见的炎细胞，具有吞噬和杀菌功能。',
    ],
  };
}

export function generateMockDialogHistory() {
  return [
    {
      role: 'assistant',
      content: '您好！我是学科知识整合智能体。我已经完成了 3 本教材的知识提取和初步整合。您可以：\n\n1. 询问某项整合决策的原因\n2. 要求修改整合方案（保留/删除/重新合并）\n3. 查看知识图谱中的具体知识点\n\n请问有什么需要了解的？',
      timestamp: new Date(Date.now() - 300000).toISOString(),
    },
    {
      role: 'user',
      content: '为什么把《生理学》里的"炎症"和《病理学》里的"炎症反应"合并了？',
      timestamp: new Date(Date.now() - 240000).toISOString(),
    },
    {
      role: 'assistant',
      content: '很好的问题！合并这两个概念基于以下分析：\n\n**语义分析结果：**\n- 《生理学》中的"炎症"：侧重炎症的生理机制和全身反应\n- 《病理学》中的"炎症反应"：侧重炎症的病理形态学变化\n\n**合并理由：**\n1. 两者描述的是同一生物学过程，只是角度不同\n2. 经过语义相似度计算，两者的嵌入向量余弦相似度为 0.91\n3. 保留两者会造成知识冗余，合并后可形成更完整的理解\n\n**整合策略：**\n保留《病理学》中更系统的定义框架，补充《生理学》中关于全身反应的描述，整合后的内容覆盖率提升了 23%。\n\n如果您认为这两个概念应该分开保留，我可以撤销这项合并决策。',
      timestamp: new Date(Date.now() - 180000).toISOString(),
    },
    {
      role: 'user',
      content: '有道理。那"免疫应答"为什么被删除了？',
      timestamp: new Date(Date.now() - 120000).toISOString(),
    },
    {
      role: 'assistant',
      content: '让我检查一下整合决策记录。\n\n**决策详情（ID: remove_001）：**\n- **被删除的内容**：《组织学》中的"细胞基本结构概述"\n- **注意**："免疫应答"这个核心概念并没有被删除！它在整合版中被保留并做了增强，合并了来自《免疫学》和《生理学》两个版本的内容。\n\n如果您看到的是其他被删除的内容，请告诉我具体的决策ID，我可以为您详细解释。\n\n需要我展示完整的整合决策列表吗？',
      timestamp: new Date(Date.now() - 60000).toISOString(),
    },
  ];
}

export function generateMockReport() {
  return `# 学科知识整合报告

## 一、整合概览

| 指标 | 数据 |
|------|------|
| 原始教材数量 | 7 本 |
| 原始总字数 | 5,820,000 字 |
| 整合后字数 | 1,650,000 字 |
| 压缩比 | 28.4% |
| 整合耗时 | 约 12 分钟 |

## 二、整合决策摘要

| 决策类型 | 数量 | 占比 |
|----------|------|------|
| 合并（merge） | 342 项 | 48.5% |
| 保留（keep） | 267 项 | 37.9% |
| 删除（remove） | 96 项 | 13.6% |
| **总计** | **705 项** | **100%** |

## 三、知识图谱统计

| 指标 | 整合前 | 整合后 | 变化 |
|------|--------|--------|------|
| 知识节点总数 | 2,847 | 1,203 | -57.7% |
| 知识关系总数 | 4,562 | 2,891 | -36.6% |
| 跨教材关系 | 1,023 | 1,847 | +80.5% |
| 孤立节点 | 156 | 23 | -85.3% |

## 四、重点整合案例

### 案例 1：动作电位（merge）
- **涉及教材**：生理学、病理学、免疫学
- **整合策略**：保留《生理学》版本为框架，补充病理学的临床病理变化和免疫学中免疫细胞的电生理特性
- **压缩效果**：3 份 × 850 字 = 2,550 字 → 整合版 780 字，压缩 69.4%
- **完整性评估**：覆盖了概念定义、离子机制、传播原理、临床意义四个维度

### 案例 2：炎症（merge）
- **涉及教材**：病理学、免疫学
- **整合策略**：病理学版本侧重形态学（变质、渗出、增生），免疫学版本侧重免疫机制。合并后形成"形态-机制"双视角
- **压缩效果**：2 份 × 1,200 字 = 2,400 字 → 整合版 950 字，压缩 60.4%

### 案例 3：免疫系统概述（merge + keep）
- **涉及教材**：免疫学、组织学、生理学
- **整合策略**：三本教材从功能、结构、调节三个角度描述免疫系统。整合后以免疫学为主线，组织学补充结构细节，生理学补充整体调节

### 案例 4：核酸与基因（merge）
- **涉及教材**：生物化学、分子生物学（教材章节）
- **整合策略**：生物化学侧重核酸的化学结构和代谢，基因表达调控内容整合分子机制

### 案例 5：受体与信号转导（merge）
- **涉及教材**：生理学、药理学、生物化学
- **整合策略**：三本教材分别从生理功能、药理靶点、分子机制描述受体，合并后形成完整图景

## 五、教学完整性说明

### 保证措施
1. **知识链路检查**：验证整合后每条 prerequisite 关系链的完整性，确保学习路径不断裂
2. **覆盖率验证**：每个学科的核心知识点覆盖率 ≥ 95%
3. **上下文保留**：保留足够的上下文信息，确保孤立知识点可追溯原始语境

### 已识别的知识缺口
- 《药理学》中的个别药物分子式在整合中被简化为文字描述
- 《解剖学》中部分图片引用在纯文本整合中丢失

### 补偿方案
- 保留原文 chunk 的向量索引，RAG 问答时可检索完整上下文
- 知识图谱中标注每条知识的原始出处，支持溯源
`;
}

export const MOCK_TEXTBOOKS = [
  { textbook_id: 'book_demo_01', filename: '生理学（第9版）.pdf', file_type: 'pdf', size: 128456789, status: 'completed' },
  { textbook_id: 'book_demo_02', filename: '病理学（第9版）.pdf', file_type: 'pdf', size: 115234567, status: 'completed' },
  { textbook_id: 'book_demo_03', filename: '医学免疫学（第7版）.pdf', file_type: 'pdf', size: 98765432, status: 'completed' },
  { textbook_id: 'book_demo_04', filename: '药理学（第9版）.pdf', file_type: 'pdf', size: 105678901, status: 'completed' },
  { textbook_id: 'book_demo_05', filename: '系统解剖学（第9版）.pdf', file_type: 'pdf', size: 142345678, status: 'completed' },
  { textbook_id: 'book_demo_06', filename: '组织学与胚胎学（第9版）.pdf', file_type: 'pdf', size: 89012345, status: 'completed' },
  { textbook_id: 'book_demo_07', filename: '生物化学与分子生物学（第9版）.pdf', file_type: 'pdf', size: 110234567, status: 'completed' },
];
