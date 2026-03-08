# Day2 实现记录（产品骨架 -> Spec 驱动）

日期：2026-03-08  
阶段结论：Day2 已完成“可运行产品骨架 + Spec 渲染闭环 + API 预留与本地兜底”。

## 1. 现在做到哪一步了（进度总览）

1. `web/day1` 已冻结，可直接演示，不再改动。
2. `web/day2` 作为后续主线，已经可以从 Creator 跳转到 Guest 并渲染邀请函。
3. 数据驱动核心已建立：`InvitationSpec v1.1`。
4. `LLM -> Spec` 的接口调用路径已预留，但当前还未接真实后端（会自动走本地规则）。
5. 工具型闭环已有基础：RSVP（mock）、ICS、地图跳转、系统分享/复制链接。

## 2. 当前代码结构与职责

```text
web/
├── day1/                  # Day1 快照（冻结）
└── day2/                  # Day2 起主线开发目录
    ├── index.html
    ├── creator.html       # 发起人页面：4 项精简表单
    ├── guest.html         # 来宾页面：按 Spec 渲染
    ├── styles.css         # 视觉与动效样式
    ├── app.js             # 业务逻辑（生成/渲染/工具）
    └── spec/
        └── default-spec.json
```

运行地址：`http://localhost:5173/web/day2/`

## 3. Day2 已实现功能（可演示）

### 3.1 Creator 页面

1. 使用 4 个必填字段：活动名称、活动时间（北京时间）、活动地址（含场馆名）、主办方联系人。
2. 支持“一键填充示例数据”。
3. 提交后执行：
   1. 收集输入（`collectCreatorInput`）
   2. 尝试请求 `/api/spec/generate`
   3. 不可用则本地规则生成 Spec（`buildSpecLocally`）
   4. 统一规范化（`normalizeSpec`）
   5. 写入 `localStorage(inviteverse_day2_spec)`
   6. 跳转 Guest 页

### 3.2 Guest 页面

1. 读取并渲染 Spec（优先 localStorage，其次 `spec/default-spec.json`）。
2. 根据 `tokens.colors` 动态写入 CSS 变量（背景、金色、文本色）。
3. 渲染活动信息、邀请文案、CTA。
4. 保留沉浸式交互：
   1. 点按 1 秒“点亮邀请”开场
   2. 滚动分幕 reveal
   3. 星点粒子背景（含鼠标/设备姿态微偏移）

### 3.3 工具能力（MVP）

1. RSVP：确认/待定/婉拒（当前为本地 mock 存储）。
2. 日历：一键下载 `.ics`。
3. 地图：
   1. iOS 手机/平板 -> Apple Maps
   2. 电脑及其他设备 -> 高德地图
4. 分享：
   1. 优先 `navigator.share`
   2. 兜底复制当前链接

## 4. InvitationSpec v1.1（逐字段详细注释）

说明：下面是“注释版 JSON（JSONC）”，用于解释字段含义。真实 JSON 文件里不能包含注释。

```jsonc
{
  "version": "1.1", // Spec 协议版本。用于兼容升级（后续 v1.2/v2.0 可按版本做迁移）

  "template": {
    "id": "galaxy_v1" // 模板 ID。决定基础布局与风格骨架（当前实现的是星河主题模板）
  },

  "event": {
    "title": "星河之夜", // 主标题（来宾首屏大字）
    "subtitle": "年度盛典", // 副标题（首屏第二层标题）
    "datetime": "2026-01-15 18:30", // 活动时间，固定北京时间常用格式：YYYY-MM-DD HH:mm
    "timezone": "北京时间", // 时间展示标签（当前固定为北京时间）
    "checkinTime": "18:00", // 签到开始时间，格式 HH:mm
    "venue": "星际大酒店·宇宙宴会厅", // 场馆名称（导航前展示）
    "address": "上海市浦东新区星河路88号", // 详细地址（用于地图检索与文案展示）
    "dressCode": "正装 / 晚礼服（Black Tie Optional）", // 着装说明
    "contact": "星河之夜筹备组" // 主办方联系人/联系方式文案（来宾页展示）
  },

  "copy": {
    "locale": "zh-CN", // 文案语言。当前固定简体中文
    "heroTagline": "ANNUAL GALA 2026", // 首屏英文眉题（提升仪式感）
    "invitationTitle": "诚挚邀请", // 邀请正文区域标题
    "body": [
      "第一段文案...",
      "第二段文案..."
    ], // 邀请正文段落数组（建议 1~3 段）
    "ctaText": "确认出席" // 主要行动按钮文案
  },

  "style": {
    "mood": ["梦幻", "优雅", "高级感", "电影感"], // 风格语义标签（给 LLM 和运营看）
    "keywords": ["星河", "午夜蓝", "香槟金", "玻璃拟态"] // 检索/解释用关键词（可用于未来 RAG 匹配）
  },

  "tokens": {
    "colors": {
      "bg1": "#0f172a", // 背景渐变起始色
      "bg2": "#1e1b4b", // 背景渐变结束色
      "gold": "#FCD34D", // 强调色（标题线条/图标/按钮高亮）
      "text": "#F8FAFC" // 主要文本色
    },
    "glass": {
      "opacity": 0.10, // 玻璃层透明度（当前约束 0.06~0.24）
      "blurPx": 22, // 玻璃模糊半径（当前约束 8~30）
      "borderGlow": 0.35 // 边框光晕强度（当前约束 0~1）
    },
    "motion": {
      "pace": "slow", // 动效节奏：slow | medium | fast
      "fadeUpDistancePx": 16, // 上浮淡入的位移距离（像素）
      "staggerMs": 120 // 分段错落延迟（毫秒）
    },
    "particles": {
      "density": 0.65, // 粒子密度（当前约束 0.2~1）
      "speed": 0.35, // 粒子漂浮速度（当前约束 0.1~1）
      "twinkle": 0.6 // 闪烁强度（当前约束 0~1）
    }
  },

  "media": {
    "bgmUrl": null // 背景音乐 URL。null 表示当前不启用；后续可接入音频
  },

  "actions": {
    "rsvpEnabled": true, // 是否显示 RSVP 区域
    "calendarEnabled": true, // 是否显示“加入日历”
    "mapEnabled": true, // 是否显示“地图导航”
    "shareEnabled": true // 是否显示“分享邀请”（当前按要求固定 true）
  },

  "warnings": [] // 自动补全/纠错警告列表。用于给主办方提示“哪些字段是系统代填”
}
```

## 5. 你问的关键问题：现在是不是“直接用 LLM API 推理得到 Spec”？

结论：当前 Day2 不是“直接依赖真实 LLM API”。

1. 前端已经实现了 API 尝试链路：`POST /api/spec/generate`。
2. 但当前仓库里还没有接入真实后端服务。
3. 所以实际运行时通常会走本地规则 fallback。
4. 这就是“现在能跑通，但不依赖 Key”的原因。

## 6. 你问的第二个关键问题：`tokens` 这类细节字段，LLM 推理能否可靠？

结论：不能完全信任“纯自由生成”，必须“LLM + 规则”混合。

当前代码已做的可靠性控制：

1. 归一化：`normalizeSpec()` 对字段进行格式化和默认值回填。
2. 边界约束：对 `glass/motion/particles` 数值做 `clamp`。
3. 安全兜底：LLM 失败时自动回落本地预设模板。

建议作为 Day3 默认策略：

1. `event` 明确字段：以表单为主，LLM 只补空。
2. `copy/style`：允许 LLM 发挥（文案和语义标签）。
3. `tokens`：优先从模板预设映射，不让 LLM 完全自由给随机值。
4. 可选增强：允许 LLM 输出“风格偏移量”（如亮度 +5%），再由规则层计算最终 tokens。

这样能兼顾“个性化”与“稳定视觉质量”。

## 7. 已确认的产品规则（当前生效）

1. 时间展示使用北京时间常用格式（`YYYY-MM-DD HH:mm`）。
2. 联系人显示在来宾页面。
3. `actions.shareEnabled` 固定为 `true`。
4. 地图策略：iOS 手机/平板 Apple Maps，其它设备高德地图。
5. 模型主备策略已确定（`.env`）：
   1. 主模型：`ZhipuAI/GLM-4.7-Flash`
   2. 备选：`ZhipuAI/GLM-5, deepseek-ai/DeepSeek-V3.2, MiniMax/MiniMax-M2.5, meituan-longcat/LongCat-Flash-Lite`

## 8. Day3 下一步规划（按执行顺序）

1. 接入后端 `/api/spec/generate`（读取 `.env`，调用 ModelScope OpenAI 兼容接口）。
2. 落地“模型轮换 + 429 降级 + 超时重试”。
3. 增加 Spec Schema 校验模块（后端和前端各一层）。
4. 把 `tokens` 改为“模板预设优先 + LLM 微调”策略。
5. 补充 Creator 侧的“生成说明与警告展示”（把 `warnings` 展示给主办方）。
6. 新增第 2 套模板（`warm_v1`）验证模板系统可扩展性。

---

本文件目标：让任何人打开后，能在 5 分钟内看懂 Day2 的完成度、当前真实能力边界、以及 Day3 的实施路径。
