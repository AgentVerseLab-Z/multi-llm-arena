# 🏟️ Multi-LLM Arena

多模型对话对比平台 — 同时与多个大语言模型对话，对比不同模型的回答。

> 📱 **已适配手机端浏览器**，模型选择栏置顶、输入框置底、联网搜索开关可触达，在手机上可以直接使用。

---

## 功能

- 🔀 **并排对比** — 多个模型卡片并排显示，实时流式输出
- 📢 **统一发送** — 底部输入框一键发送给所有选中模型
- ✅ **选择性继续** — 勾选/取消单个模型，灵活控制发送目标
- 💬 **独立提问** — 每个模型窗口可单独追加提问
- 🌐 **联网搜索** — 支持联网搜索增强（需模型支持 Tool Calling）
- ⚙️ **Web端配置** — 通过页面可视化增删改模型，无需改代码
- 🧪 **连接测试** — 一键测试模型 API 是否可用

> 👥 **无注册功能**：本项目为个人/团队使用设计，不对外开放注册。新增用户需由管理员登录后在 👥 用户管理 界面创建。首次启动默认生成管理员 admin/admin123。

## 快速开始

> 🎯 **项目已预置 8 个模型配置**（Qwen 3.7 Max、DeepSeek V4 Pro、GLM 5.2、Kimi K2.6 等），基于阿里云百炼平台（DashScope），只需配置一个 `DASHSCOPE_API_KEY` 即可使用。
> 
> 🌐 **联网搜索**需要额外配置博查搜索 API Key（`BOCHA_API_KEY`），在 ⚙️ 模型配置 → API Key 管理中配置。

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入以下配置：

#### ⚠️ 数据库配置（必须）

本项目使用 **PostgreSQL**，服务启动和数据库初始化是分开的：

- `docker compose up -d` 只负责启动服务
- 首次部署或结构变更后，需要手动执行数据库初始化命令

```env
DATABASE_URL=postgresql://user:password@host:5432/multi_llm_arena?schema=public
```

初始化数据库表结构：

```bash
npm run db:init
```

初始化默认账号：

```bash
npm run db:seed-users   # 创建默认管理员 admin/admin123 和普通用户 user/user123
```

#### 🔑 密钥配置

以下两个密钥用于安全验证，可直接使用预设值，无需修改：

```env
JWT_SECRET=multi-llm-arena-jwt
CAPTCHA_SECRET=multi-llm-arena-captcha
```

#### 🤖 模型 API Key

启动后使用管理员账号登录后台，在 ⚙️ 模型配置 → API Key 管理 中直接添加即可，无需在启动时配置。

#### 🌐 联网搜索（可选）

开启后模型可获取实时网络信息。需要在 ⚙️ 模型配置 → API Key 管理中配置博查搜索 API Key。

### 3. 启动

```bash
npm run dev
```

打开 http://localhost:3000

## Docker 部署（推荐）

### 前置条件

已安装 PostgreSQL，并创建好数据库：

```sql
CREATE DATABASE multi_llm_arena;
```

### 首次部署

```bash
# 1. 克隆项目
git clone https://github.com/AgentVerseLab-Z/multi-llm-arena.git
cd multi-llm-arena

# 2. 创建 .env 文件
cat > .env << 'EOF'
# ── 数据库配置（改成你自己的） ──
DATABASE_URL=postgresql://user:password@host:5432/multi_llm_arena?schema=public
APP_PORT=8089                # 应用访问端口

# ── 安全密钥（有预设值，保持即可） ──
JWT_SECRET=multi-llm-arena-jwt
CAPTCHA_SECRET=multi-llm-arena-captcha
EOF

# 3. 启动服务（只启动容器，不自动改数据库）
docker compose up -d

# 4. 初始化数据库表结构
docker compose exec app npm run db:init

# 5. 初始化默认账号
docker compose exec app npm run db:seed-users
```

> 💡 API Key 在启动后登录 ⚙️ 模型配置 → API Key 管理 中配置即可。
>
> 💡 如果数据库在宿主机上，`DATABASE_URL` 里的 host 可填 `host.docker.internal`（Docker 已自动配置好网络）

启动后访问 http://your-server:8089

### 后续更新

```bash
# 拉取新代码后重新构建并重启服务
docker compose up -d --build

# 只有数据库结构有变化时，才手动执行
docker compose exec app npm run db:init

# 只有确认需要补默认账号时，才手动执行
docker compose exec app npm run db:seed-users
```

### 常用命令

```bash
docker compose up -d                 # 启动
docker compose up -d --build         # 更新代码后重建并启动
docker compose down                  # 停止
docker compose logs -f app           # 查看日志
docker compose restart app           # 重启应用
docker compose exec app npm run db:init        # 初始化/同步数据库表
docker compose exec app npm run db:seed-users  # 初始化默认账号
```


## 配置说明

### 模型配置（`data/models.json`）

通过 Web 界面（⚙️ 模型配置）管理，也可手动编辑 JSON 文件。

每个模型配置：

```json
{
  "id": "1",                          // 自动编号（1, 2, 3...）
  "name": "Qwen 3.7 Max",              // 显示名称
  "modelId": "qwen3.7-max",            // API 中的 model 参数
  "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",  // OpenAI 兼容 API 地址
  "apiKeyEnv": "DASHSCOPE_API_KEY",    // 对应的环境变量名
  "maxTokens": 8192,
  "temperature": 0.7,
  "enabled": true,
  "color": "#f97316",
  "icon": "🟠",
  "supportsSearch": true              // 是否支持联网搜索
}
```

### 支持的 API 格式

任何兼容 OpenAI Chat Completions API 格式的接口都可以接入，包括：

- 阿里云百炼（DashScope）
- DeepSeek 官方
- OpenAI / Azure OpenAI
- 智谱 GLM
- Moonshot (Kimi)
- 本地部署的 Ollama / vLLM / LiteLLM 等

## 技术栈

- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- SSE (Server-Sent Events) 流式输出
- OpenAI 兼容 API 格式

## 项目结构

```
├── src/
│   ├── app/
│   │   ├── page.tsx              # 主对话页面
│   │   ├── login/page.tsx        # 登录页面
│   │   ├── settings/page.tsx     # 模型配置页面
│   │   ├── password/page.tsx     # 修改密码页面
│   │   ├── admin/users/          # 用户管理
│   │   └── api/
│   │       ├── chat/route.ts     # 对话 API（SSE 流式）
│   │       ├── models/route.ts   # 模型 CRUD API
│   │       ├── auth/             # 认证相关 API
│   │       ├── sessions/         # 会话管理
│   │       └── messages/         # 消息存储
│   ├── components/
│   │   ├── ChatPanel.tsx         # 单模型对话面板
│   │   ├── Header.tsx            # 顶部导航
│   │   ├── Sidebar.tsx           # 侧边栏（会话列表）
│   │   ├── ModelSelector.tsx     # 模型选择栏
│   │   └── MessageBubble.tsx     # 消息气泡
│   └── lib/
│       ├── auth.ts               # JWT 认证
│       ├── db.ts                 # 数据库连接
│       ├── config.ts             # 模型配置读写
│       ├── web-search.ts         # 联网搜索
│       └── types.ts              # 类型定义
├── prisma/
│   ├── schema.prisma             # 数据库模型定义
│   └── seed.ts                   # 默认账号初始化脚本
├── scripts/
│   ├── init-db.sh                # 手动初始化/同步数据库表结构
│   ├── seed-users.sh             # 手动初始化默认账号
│   └── tunnel.sh                 # SSH 隧道脚本
├── data/models.json              # 模型配置（持久化，不提交 git）
├── .env                          # 环境变量（不提交 git）
└── .env.example                  # 环境变量模板
```
