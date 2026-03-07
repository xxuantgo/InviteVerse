# Day1 产品骨架记录（InviteVerse）

日期：2026-03-06  
当前阶段：Day1（产品骨架完成）

## 1. 产品形态确认（本次结论）

你已明确：InviteVerse 采用 **Web 形态优先**，不做小程序/原生 App。

统一入口形态：

- 通过网址打开（分享链接）
- 通过二维码扫描打开（线下海报/群内转发）
- 在手机/平板/电脑均需保证视觉质量与交互体验

这一路线非常适合 Hackathon：开发速度快、演示成本低、传播链路强。

## 2. Day1 已交付骨架（当前代码状态）

### 2.1 页面结构

- Creator 页：一句话输入 + 基本信息 + 风格选项 + 可选图片
- Guest 页：固定模板渲染（星河之夜）+ 分幕滚动 + RSVP + 日历/导航入口
- 入口页：`index.html` 自动跳转 Creator

### 2.2 交互与视觉

- 星空背景（Canvas）
- 玻璃拟态卡片
- 首屏错落入场动画
- 开场“按住点亮邀请”
- RSVP 假数据回执与提示

### 2.3 本次修正

- 已针对桌面端首屏做字号缩放优化（标题与正文层级整体下调）

## 3. 技术规划（Web 产品化路线）

### 3.1 总体架构

采用「静态前端 + 轻量 API + 模板引擎」三层：

1. 展示层（前端）  
Creator/Guest 页面、动画、跨端适配、交互反馈

2. 生成层（服务）  
把用户输入转换为 `InvitationSpec`（结构化蓝图）

3. 数据层（存储）  
邀请函配置、RSVP 状态、分享数据、模板库

> 核心原则：模型不直接输出整页代码，而是先输出结构化 Spec，再由模板渲染器落地页面。

### 3.2 前端技术策略（当前到 Day7）

- Day1-Day2：继续使用 HTML/CSS/原生 JS（开发快、可控）
- Day3 起：若复杂度上升，再考虑迁移到 React/Vue（非必须）
- 动效主线：CSS 动画 + Canvas 粒子；避免过度依赖重型 3D 引擎

跨端断点建议：

- 手机：<= 600px
- 平板：601px - 1024px
- 桌面：> 1024px

适配策略：

- 全局字号使用 `clamp()`，并限制桌面最大值
- 卡片宽度使用 `min(固定上限, 视口比例)`
- 动效强度按设备能力降级（低端机降低粒子数量）

### 3.3 分享链路与二维码方案

分享链接设计：

- `https://你的域名/i/{invite_id}`
- `invite_id` 使用短 ID（如 8~12 位）

二维码生成方案：

- 前端临时方案：`qrcode.js` 生成本地二维码
- 服务端方案：发布时由后端生成二维码图片并持久化

发布后动作：

1. 返回可分享链接
2. 返回二维码图
3. 返回微信分享封面图（可后续补）

### 3.4 数据结构设计（关键）

你给出的这版 `InvitationSpec` 已经可以作为 Day2 的正式输入格式，建议命名为：`InvitationSpec v1.0`。

它的定位：

- 不是页面代码
- 是“页面该如何渲染”的结构化蓝图
- 是 LLM 输出和前端渲染器之间的合同（contract）

#### 3.4.1 你提供的可用版（原始结构）

```json
{
  "version": "1.0",
  "event": {
    "title": "星河之夜",
    "subtitle": "年度盛典",
    "datetime": "2026-01-15T18:30:00",
    "checkinTime": "18:00",
    "venue": "星际大酒店·宇宙宴会厅",
    "address": "上海市浦东新区星河路88号",
    "dressCode": "正装 / 晚礼服（Black Tie Optional）"
  },
  "copy": {
    "heroTagline": "ANNUAL GALA 2026",
    "invitationTitle": "诚挚邀请",
    "body": [
      "星光不问赶路人，时光不负有心人。在过去的一年里，我们携手并肩，共同创造了璀璨的星河。",
      "值此辞旧迎新之际，我们诚挚地邀请您出席“星河之夜”年度盛典。让我们在星光下重聚，共赏繁星，同谱华章。"
    ],
    "ctaText": "确认出席"
  },
  "style": {
    "mood": ["梦幻", "优雅", "高级感", "电影感"],
    "keywords": ["星河", "午夜蓝", "香槟金", "玻璃拟态"]
  },
  "tokens": {
    "colors": {
      "bg1": "#0f172a",
      "bg2": "#1e1b4b",
      "gold": "#FCD34D",
      "text": "#F8FAFC"
    },
    "glass": {
      "opacity": 0.10,
      "blurPx": 22,
      "borderGlow": 0.35
    },
    "motion": {
      "pace": "slow",
      "fadeUpDistancePx": 16,
      "staggerMs": 120
    },
    "particles": {
      "density": 0.65,
      "speed": 0.35,
      "twinkle": 0.6
    }
  },
  "actions": {
    "rsvpEnabled": true,
    "calendarEnabled": true,
    "mapEnabled": true
  }
}
```

#### 3.4.2 注释版（JSONC，便于开发理解）

```jsonc
{
  "version": "1.0", // 协议版本，后续升级兼容用

  "event": {
    "title": "星河之夜", // 首屏主标题
    "subtitle": "年度盛典", // 首屏副标题
    "datetime": "2026-01-15T18:30:00", // 活动正式开始时间，建议后续统一为带时区 ISO
    "checkinTime": "18:00", // 签到时间（展示字段）
    "venue": "星际大酒店·宇宙宴会厅", // 场馆名称
    "address": "上海市浦东新区星河路88号", // 导航地址
    "dressCode": "正装 / 晚礼服（Black Tie Optional）" // 着装要求
  },

  "copy": {
    "heroTagline": "ANNUAL GALA 2026", // 英文眉标
    "invitationTitle": "诚挚邀请", // 邀请函文案区标题
    "body": [ // 正文段落数组（按顺序渲染）
      "第一段...",
      "第二段..."
    ],
    "ctaText": "确认出席" // 主按钮文案
  },

  "style": {
    "mood": ["梦幻", "优雅", "高级感", "电影感"], // 情绪标签，供风格匹配
    "keywords": ["星河", "午夜蓝", "香槟金", "玻璃拟态"] // 检索模板/动效关键词
  },

  "tokens": {
    "colors": {
      "bg1": "#0f172a", // 背景渐变起点
      "bg2": "#1e1b4b", // 背景渐变终点
      "gold": "#FCD34D", // 强调色
      "text": "#F8FAFC" // 主文字色
    },
    "glass": {
      "opacity": 0.10, // 玻璃层透明度（建议 0.06 ~ 0.24）
      "blurPx": 22, // 模糊半径（建议 8 ~ 30）
      "borderGlow": 0.35 // 边缘光晕强度（建议 0 ~ 1）
    },
    "motion": {
      "pace": "slow", // 动效节奏：slow|medium|fast
      "fadeUpDistancePx": 16, // 上浮位移（建议 8 ~ 28）
      "staggerMs": 120 // 错峰延时（建议 60 ~ 240）
    },
    "particles": {
      "density": 0.65, // 粒子密度（建议 0.2 ~ 1）
      "speed": 0.35, // 漂浮速度（建议 0.1 ~ 1）
      "twinkle": 0.6 // 闪烁强度（建议 0 ~ 1）
    }
  },

  "actions": {
    "rsvpEnabled": true, // 是否显示 RSVP
    "calendarEnabled": true, // 是否显示加入日历
    "mapEnabled": true // 是否显示地图导航
  }
}
```

#### 3.4.3 建议补充字段（v1.1 可选）

- `event.timezone`：例如 `Asia/Shanghai`，避免跨时区误差
- `event.contact`：主办方联系方式
- `copy.locale`：默认 `zh-CN`，便于多语言扩展
- `actions.shareEnabled`：控制是否展示分享按钮
- `media.bgmUrl`：后续接声音效果时直接可用
- `template.id`：如 `galaxy_v1`，保证渲染器可明确选模板

### 3.5 RSVP 记录结构（注释版）

```jsonc
{
  "inviteId": "inv_20260307_x8ka2", // 邀请函唯一 ID
  "guestId": "guest_zhangsan", // 来宾唯一标识（可匿名）
  "guestName": "张三", // 来宾展示名
  "status": "confirm", // confirm|pending|decline
  "message": "期待见面", // 留言，可选
  "device": "mobile", // mobile|tablet|desktop
  "submittedAt": "2026-03-07T20:30:00+08:00", // 提交时间
  "updatedAt": "2026-03-07T20:30:00+08:00" // 最后更新时间
}
```

字段作用：

- 用于统计出席率（confirm/pending/decline）
- 用于留言墙展示
- 用于后续提醒与运营分析（哪种设备参与更多）

### 3.6 下一步实现：LLM -> Spec（单次调用版）

目标：从“**一句话 + 表单可选信息**”生成稳定 JSON，不上多 Agent 也能稳。

#### 3.6.1 输入合并策略（先规则，后模型）

1. 明确字段（表单优先，最高优先级）

- 时间、签到时间、地点、地址、着装

2. 模糊字段（LLM 发挥）

- 氛围、修辞、文案润色、关键词补全

3. 冲突处理规则

- 若表单和一句话冲突：以表单为准
- 若必填缺失：先给默认值并打上 `warnings`

#### 3.6.2 处理流程（可直接实现）

1. 前端收集输入：`prompt + formData`
2. 后端组装 `inputPayload`
3. 调 LLM（单次）输出 JSON
4. `JSON.parse` 解析
5. 本地 schema 校验（字段/类型/范围）
6. 失败则走兜底默认 Spec
7. 返回前端渲染

#### 3.6.3 强约束 Prompt 模板（可直接用）

System / Developer Prompt：

```text
你是 InvitationSpec 生成器。你只能输出一个 JSON 对象，不要输出 Markdown，不要解释，不要代码块。
必须严格符合给定 schema。
若用户输入与表单冲突，优先采用表单值。
所有 tokens 数值必须落在范围内：
- glass.opacity: 0.06~0.24
- glass.blurPx: 8~30
- glass.borderGlow: 0~1
- motion.fadeUpDistancePx: 8~28
- motion.staggerMs: 60~240
- particles.density: 0.2~1
- particles.speed: 0.1~1
- particles.twinkle: 0~1
若缺失信息，请合理补全默认值，并在 warnings 数组写出补全项。
输出字段必须包含：version,event,copy,style,tokens,actions,warnings。
```

User Prompt（拼接输入）：

```text
用户一句话：{{prompt}}
表单字段：{{form_json}}
目标：生成可用于渲染邀请函的 InvitationSpec JSON。
```

建议 schema（精简）：

```json
{
  "version": "1.0",
  "event": {},
  "copy": {},
  "style": {},
  "tokens": {},
  "actions": {},
  "warnings": []
}
```

#### 3.6.4 失败兜底策略（必须做）

- 解析失败：重试 1 次（同 prompt + `repair` 指令）
- 仍失败：回落到本地默认 `galaxy_spec.json`
- 数值越界：在后端 clamp 后再返回
- 必填缺失：自动补默认 + warnings

#### 3.6.5 Day2 可交付最小目标

- 实现 `/api/spec/generate` 单接口
- 接入一次 LLM 调用
- 能返回合法 `InvitationSpec v1`
- Guest 页可读取该 Spec 渲染首屏+信息卡+邀请文案

## 4. 评分导向的实现重点

### 4.1 场景价值（20）

- 强调“通知 -> 仪式感表达”的价值跃迁
- 必须打通完整闭环：创建 -> 发布 -> 被邀请人交互 -> 回执

### 4.2 技术前瞻（20）

Day2/Day3 开始接入多 Agent：

- Planner：抽取字段并补齐缺失
- Copywriter：生成邀请文案
- Art Director：映射风格 token
- Motion Director：定义动效节奏
- Verifier：检查时间格式、可读性、移动端约束

### 4.3 工具整合（15）

MVP 必做：

- RSVP 状态收集
- ICS 日历导出
- 地图导航跳转
- 分享链接 + 二维码

### 4.4 用户体验（15）

- 强化首屏“点亮邀请”仪式动作
- 保持分幕叙事节奏
- 增加后续声音方案（BGM/轻提示音）

## 5. 声音效果规划（后续可加）

最小落地（优先）：

- 开场短音效（已有）
- 页面背景环境音（用户点击后启用，避免自动播放限制）

进阶方案：

- 根据风格自动匹配 BGM（梦幻/温馨/正式）
- 关键操作反馈音（RSVP 成功、点亮成功）

注意：移动端浏览器对自动播放限制较强，必须由用户手势触发。

## 6. Day2-Day7 实施计划（可执行）

Day2：Spec 驱动渲染

- 新增 `InvitationSpec` 解析器
- Guest 页面改为读取 Spec 渲染，不再写死文案

Day3：发布链路

- 生成 `invite_id`
- 生成分享 URL 与二维码

Day4：最小后端

- 增加 RSVP 写入接口
- 增加邀请函读取接口（按 `invite_id`）

Day5：AI 生成链路

- 接入 Planner + Copywriter 两个最小 Agent
- 补齐字段确认交互

Day6：质量与性能

- 真机测试（手机/平板/电脑）
- 限制资源大小、优化首屏加载

Day7：演示打磨

- 准备 2 套模板（星河 + 温馨）
- 完成 5 分钟 Demo 讲解脚本

## 7. 工程规范（当前约束）

- 页面文案统一简体中文
- 样式 token 统一在 CSS 顶部定义
- 动效参数集中管理，避免散落硬编码
- 交互逻辑放在 `app.js`，不写内联脚本
- 文档与代码同步更新（每个 Day 一个记录文件）

---

本文件为 Day1 版本，后续每推进一天补充“新增能力 + 风险 + 下一步”。


