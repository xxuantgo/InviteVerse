# InviteVerse

InviteVerse 是一个面向 Hackathon 的「仪式感生成器」项目（Web 形态优先）。

## 当前阶段

- `web/day1`：Day1 冻结快照（可直接演示）
- `web/day2`：Day2 起持续迭代工作区（Day3 在此继续开发）

## 项目结构

```text
InviteVerse/
├── docs/
│   ├── day1_产品骨架记录.md
│   └── day2_实现记录.md
├── web/
│   ├── day1/
│   │   ├── index.html
│   │   ├── creator.html
│   │   ├── guest.html
│   │   ├── styles.css
│   │   └── app.js
│   └── day2/
│       ├── index.html
│       ├── creator.html
│       ├── guest.html
│       ├── styles.css
│       ├── app.js
│       └── spec/
│           └── default-spec.json
├── .gitignore
└── README.md
```

## 本地运行

不需要 Anaconda。当前是纯前端静态页面（HTML/CSS/原生 JavaScript）。

### 运行 Day1

```powershell
cd E:\InviteVerse
python -m http.server 5173
```

打开：`http://localhost:5173/web/day1/`

### 运行 Day2

同一个服务即可，直接访问：

`http://localhost:5173/web/day2/`

停止服务：终端按 `Ctrl + C`

## 开发约定

- Day1 保持冻结，禁止改动
- Day2 为持续迭代主线（已支持 Spec 驱动渲染）
- 数据结构与 `LLM -> Spec` 规范请查看：`docs/day2_实现记录.md`
