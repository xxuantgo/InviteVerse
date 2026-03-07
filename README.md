# InviteVerse

InviteVerse 是一个面向 Hackathon 的「仪式感生成器」项目。

## Day 1 目标

完成产品骨架：

- Creator 页：一句话输入 + 基本信息 + 风格选择
- Guest 页：固定星河模板展示 + 分幕滚动 + RSVP（假数据）

## 项目结构

```text
InviteVerse/
├── docs/
│   └── day1_inviteverse_产品骨架记录.md
├── web/
│   └── day1/
│       ├── index.html
│       ├── creator.html
│       ├── guest.html
│       ├── styles.css
│       └── app.js
├── .gitignore
└── README.md
```

## 本地运行

不需要 Anaconda，也不需要深度学习环境。这个 Day1 原型是纯前端静态页面（HTML/CSS/原生 JavaScript）。

### 方式 A：直接打开（最简单）

1. 在资源管理器双击 `web/day1/creator.html`
2. 页面可浏览和交互

说明：大多数功能可用，但推荐使用本地静态服务器获得更稳定体验。

### 方式 B：Python 本地静态服务器（推荐）

1. 打开 PowerShell
2. 执行：

```powershell
cd E:\InviteVerse
python --version
python -m http.server 5173 # 启动本地静态服务器, 监听端口 5173
```

3. 浏览器打开：

```text
http://localhost:5173/web/day1/
```

4. 结束服务：在 PowerShell 按 `Ctrl + C`

如果 `python` 命令不可用，可尝试：

```powershell
py -m http.server 5173
```

### 方式 C：Node 静态服务（可选）

仅在你本机已有 Node.js 时使用：

```powershell
cd E:\InviteVerse
npx serve .
```

然后打开命令行输出的本地地址。

## Day 2 开发方向

1. 定义 InvitationSpec JSON 协议
2. 将 Guest 页改为配置驱动渲染
3. 接入最小 Planner Agent（字段抽取与缺失补全）
4. 新增第 2 套模板验证泛化能力
