// ============================================================================
// 第一届微度杯 · 赛事数据配置文件
// 说明：只需修改此文件中的 mode、姓名、积分、净胜球和各轮比分，保存后刷新网页即可生效！
// ============================================================================

const weiduCupData = {
  // 1. 页面显示模式（三选一）：
  //    "pyramid"     -> 新版：左侧「个人积分表」+ 右侧「8人从下到上晋级对阵图」
  //    "bracket"     -> 原版：16队/8队「左右双半区向中间汇聚对阵图」
  //    "coming-soon" -> 预告：「第一届微度杯 is coming soon」流光页
  mode: "pyramid",

  // 2. 默认外观主题（用户点击右上角按钮切换后也会记住选择）：
  //    "dark"  -> 深色外观
  //    "light" -> 浅色外观
  defaultTheme: "dark",

  // 3. 赛事标题与默认阶段（"preliminary" -> 预备赛，"official" -> 正式赛）
  eyebrow: "WEIDU CUP · TOURNAMENT",
  title: "第一届微度杯",
  defaultStage: "preliminary",

  // 4. 右上角「规则」按钮弹窗内容
  rules: {
    eyebrow: "SCORING & RANKING RULES",
    title: "本局记分与排名规则",
    items: [
      {
        label: "单局制计分",
        detail: "当只有一局比赛时，胜者双方个人积分各 +2，负者不加分（+0）；净胜球按照本局实际分差为每位成员填写（胜方为正、负方为负）。"
      },
      {
        label: "三局两胜制计分",
        detail: "当采用三局两胜制时，先赢两局者获胜，胜者双方个人积分各 +2，负者不加分（+0）；净胜球按照所打各局的分差累积为每位成员填写。"
      },
      {
        label: "榜单排序规则",
        detail: "个人积分榜按照个人积分从高到低排列；当个人积分相同时，按照累计净胜球从高到低排列。"
      }
    ]
  },

  // 5. 顶部「光影回忆」相册配置
  //    支持两种方式添加照片：
  //    方式 A（网页直接上传）：打开页面点击顶部「光影回忆」->「上传照片」，自动保存在当前浏览器中；
  //    方式 B（全员公开部署）：把照片放入 dist/memories/ 文件夹，并在下方 items 数组中添加路径与寄语。
  memories: {
    buttonLabel: "光影回忆",
    eyebrow: "CHERISHED MEMORIES · 第一届微度杯",
    title: "那些挥拍与欢笑的瞬间",
    subtitle: "比分会翻篇，但并肩流汗、击掌大笑的每一刻都值得永久珍藏。",
    items: [
      // 示例（取消注释并放入对应图片即可全员可见）：
      // { src: "memories/photo-1.jpg", caption: "第一届微度杯全员大合照", date: "2026.11.26" }
    ]
  },

  // ==========================================================================
  // 【预备赛数据】（当顶部切换为「预备赛」且 mode: "pyramid" 时显示）
  // ==========================================================================
  pyramidStage: {
    eyebrow: "WEIDU CUP · PRELIMINARY STAGE",
    // 是否按「个人积分从高到低 → 净胜球从高到低」自动排序积分榜（设为 false 则按你写的顺序显示）
    autoSortStandings: true,

    // 左侧个人积分表（包含：姓名 name、个人积分 points、净胜球 goalDiff）
    standings: [
      { name: "鲁建宇", points: 8, goalDiff: 27 },
      { name: "刘烨昊", points: 6, goalDiff: 22 },
      { name: "李建翔", points: 6, goalDiff: 19 },
      { name: "夏赣民", points: 6, goalDiff: 13 },
      { name: "勾陆昊", points: 6, goalDiff: 8 },
      { name: "张晨光", points: 6, goalDiff: 3 },
      { name: "朱玥玖", points: 4, goalDiff: 11 },
      { name: "王宇", points: 4, goalDiff: 1 },
      { name: "伍智帅", points: 4, goalDiff: -6 },
      { name: "王哲", points: 4, goalDiff: -12 },
      { name: "郭锐", points: 2, goalDiff: -5 },
      { name: "韩智敏", points: 2, goalDiff: -8 },
      { name: "段志刚", points: 2, goalDiff: -11 },
      { name: "何梦洁", points: 2, goalDiff: -11 },
      { name: "任雨晴", points: 2, goalDiff: -13 },
      { name: "孙子琛", points: 2, goalDiff: -15 },
      { name: "柳冠豪", points: 2, goalDiff: -18 },
      { name: "薛伟钊", points: 0, goalDiff: 0 },
      { name: "王玮", points: 0, goalDiff: 0 },
      { name: "范向阳", points: 0, goalDiff: -5 }
    ],

    // 右侧从下到上晋级图的 8 位参赛姓名（仅需名字，无需图标）
    // 配对规则：最底层首轮共 4 组，按顺序两两配对（第1对第2、第3对第4、第5对第6、第7对第8）
    players: [
      "林知远", "江逾白",
      "陆景行", "沈清晏",
      "陈星河", "许嘉树",
      "周予安", "顾言深"
    ],

    // 从下往上各轮比分：[上方选手得分, 下方选手得分]
    // 分数高者自动向上晋级下一轮！尚未开打的比赛填 null
    scores: {
      // 最底层：八强首轮（8进4，共 4 场，从左到右对应上面 4 组配对）
      quarter: [
        [4, 1], // 林知远 vs 江逾白
        [2, 4], // 陆景行 vs 沈清晏
        [4, 2], // 陈星河 vs 许嘉树
        [4, 3]  // 周予安 vs 顾言深
      ],
      // 中间层：半决赛（4进2，共 2 场，从左到右）
      semi: [
        [4, 2], // 第1场胜者 vs 第2场胜者
        [3, 4]  // 第3场胜者 vs 第4场胜者
      ],
      // 次顶层：总决赛（共 1 场）：[左半边胜者得分, 右半边胜者得分]
      // 若尚未完赛填 null，最顶层奖杯会自动显示「冠军虚位以待」
      final: [4, 2]
    },

    // 右下方：双打比赛记录表（包含：比赛时间、比赛人员、比赛胜负、净胜球）
    // 填写说明：
    // - time：比赛时间（如 "2026.11.26"）
    // - teamA / teamB：对阵双方的双打搭档姓名（填 ["选手1", "选手2"]）
    // - score：单局填 [A组得分, B组得分]；三局两胜填 [[第1局A, 第1局B], [第2局A, 第2局B], ...]
    //          系统会自动按局数判定「比赛胜负」并累加计算双方「净胜球」；未开赛填 null
    // - 如需手动指定文字，也可额外加 result: "自定义胜负" 或 goalDiff: "+5"
    matchRecords: [
      {
        time: "2026.11.26",
        teamA: ["勾陆昊", "郭锐"],
        teamB: ["鲁建宇", "伍智帅"],
        score: [6, 11]
      },
      {
        time: "2026.11.26",
        teamA: ["朱玥玖", "王哲"],
        teamB: ["韩智敏", "何梦洁"],
        score: [11, 9]
      },
      {
        time: "2026.11.26",
        teamA: ["孙子琛", "柳冠豪"],
        teamB: ["王宇", "张晨光"],
        score: [4, 11]
      },
      {
        time: "2026.11.26",
        teamA: ["李建翔", "任雨晴"],
        teamB: ["刘烨昊", "夏赣民"],
        score: [4, 11]
      },
      {
        time: "2026.11.26",
        teamA: ["勾陆昊", "段志刚"],
        teamB: ["朱玥玖", "郭锐"],
        score: [14, 12]
      },
      {
        time: "2026.11.26",
        teamA: ["勾陆昊", "李建翔"],
        teamB: ["伍智帅", "王宇"],
        score: [11, 4]
      },
      {
        time: "2026.11.26",
        teamA: ["何梦洁", "夏赣民"],
        teamB: ["韩智敏", "王哲"],
        score: [11, 4]
      },
      {
        time: "2026.11.26",
        teamA: ["张晨光", "孙子琛"],
        teamB: ["刘烨昊", "柳冠豪"],
        score: [11, 7]
      },
      {
        time: "2026.11.26",
        teamA: ["李建翔", "王宇"],
        teamB: ["何梦洁", "张晨光"],
        score: [[11, 7], [11, 3]]
      },
      {
        time: "2026.11.26",
        teamA: ["段志刚", "郭锐"],
        teamB: ["任雨晴", "鲁建宇"],
        score: [9, 11]
      },
      {
        time: "2026.11.26",
        teamA: ["柳冠豪", "夏赣民"],
        teamB: ["李建翔", "伍智帅"],
        score: [[7, 11], [4, 11]]
      },
      {
        time: "2026.11.26",
        teamA: ["刘烨昊", "王哲"],
        teamB: ["孙子琛", "任雨晴"],
        score: [[14, 12], [11, 5]]
      },
      {
        time: "2026.11.26",
        teamA: ["鲁建宇", "韩智敏"],
        teamB: ["夏赣民", "范向阳"],
        score: [[11, 9], [11, 8]]
      },
      {
        time: "2026.11.26",
        teamA: ["段志刚", "王宇"],
        teamB: ["刘烨昊", "朱玥玖"],
        score: [[8, 11], [3, 11]]
      },
      {
        time: "2026.11.26",
        teamA: ["郭锐", "张晨光"],
        teamB: ["何梦洁", "孙子琛"],
        score: [[12, 10], [12, 10]]
      },
      {
        time: "2026.11.26",
        teamA: ["伍智帅", "王哲"],
        teamB: ["鲁建宇", "夏赣民"],
        score: [[4, 11], [3, 11]]
      },
      {
        time: "2026.11.26",
        teamA: ["柳冠豪", "勾陆昊"],
        teamB: ["韩智敏", "李建翔"],
        score: [[11, 8], [10, 12], [11, 8]]
      }
    ]
  },

  // ==========================================================================
  // 【正式赛数据】（当顶部切换为「正式赛」时显示，结构与预备赛完全一致，数据已清空）
  // ==========================================================================
  officialStage: {
    eyebrow: "WEIDU CUP · OFFICIAL TOURNAMENT",
    autoSortStandings: true,

    // 左侧个人积分表（初始全员 0 积分、0 净胜球）
    standings: [
      { name: "郭锐", points: 0, goalDiff: 0 },
      { name: "柳冠豪", points: 0, goalDiff: 0 },
      { name: "薛伟钊", points: 0, goalDiff: 0 },
      { name: "李建翔", points: 0, goalDiff: 0 },
      { name: "鲁建宇", points: 0, goalDiff: 0 },
      { name: "张晨光", points: 0, goalDiff: 0 },
      { name: "段志刚", points: 0, goalDiff: 0 },
      { name: "韩智敏", points: 0, goalDiff: 0 },
      { name: "刘烨昊", points: 0, goalDiff: 0 },
      { name: "何梦洁", points: 0, goalDiff: 0 },
      { name: "王哲", points: 0, goalDiff: 0 },
      { name: "任雨晴", points: 0, goalDiff: 0 },
      { name: "朱玥玖", points: 0, goalDiff: 0 },
      { name: "伍智帅", points: 0, goalDiff: 0 },
      { name: "勾陆昊", points: 0, goalDiff: 0 },
      { name: "孙子琛", points: 0, goalDiff: 0 },
      { name: "夏赣民", points: 0, goalDiff: 0 },
      { name: "王玮", points: 0, goalDiff: 0 },
      { name: "范向阳", points: 0, goalDiff: 0 },
      { name: "王宇", points: 0, goalDiff: 0 }
    ],

    // 右侧八强淘汰晋级图参赛名单（留空时自动显示「待定」）
    players: [],

    // 右侧八强各轮比分（未开赛填 null）
    scores: {
      quarter: [null, null, null, null],
      semi: [null, null],
      final: null
    },

    // 右下方双打比赛赛程与战报（正式赛开打后按预备赛相同格式添加即可）
    matchRecords: []
  },

  // ==========================================================================
  // 【当 mode: "bracket" 时生效】原版 16队/8队 左右双半区对称汇聚对阵图
  // ==========================================================================
  teamCount: 16,
  leftZoneName: "上半区",
  rightZoneName: "下半区",

  leftTeams: [
    "星辰战队", "极光先锋",
    "深蓝矩阵", "零度空间",
    "云端漫步", "量子脉冲",
    "破晓之光", "微度引力"
  ],

  rightTeams: [
    "苍穹之翼", "山海远征",
    "幻影旅团", "白昼流星",
    "风暴核心", "棱镜计划",
    "银河信使", "天际线队"
  ],

  scores: {
    left: {
      round16: [
        [4, 2],
        [3, 4],
        [4, 1],
        [2, 4]
      ],
      quarter: [
        [4, 3],
        [3, 4]
      ],
      semi: [2, 4]
    },
    right: {
      round16: [
        [4, 1],
        [4, 2],
        [1, 4],
        [4, 3]
      ],
      quarter: [
        [4, 2],
        [4, 1]
      ],
      semi: [3, 4]
    },
    final: [4, 2]
  }
};
