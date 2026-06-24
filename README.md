# 🏟️ Multi-LLM Arena

多模型对话对比平台 — 同时与多个大语言模型对话，对比不同模型的回答。

## 功能

- 🔀 **并排对比** — 多个模型卡片并排显示，实时流式输出
- 📢 **统一发送** — 底部输入框一键发送给所有选中模型
- ✅ **选择性继续** — 勾选/取消单个模型，灵活控制发送目标
- 💬 **独立提问** — 每个模型窗口可单独追加提问
- ⚙️ **Web端配置** — 通过页面可视化增删改模型，无需改代码
- 🧪 **连接测试** — 一键测试模型 API 是否可用

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置 API Key
cp .env.example .env
# 编辑 .env，填入你的 API Key

# 3. 启动开发服务器
npm run dev
```

打开 http://localhost:3000

## 配置说明

### API Key（`.env`）

```env
QWEN_API_KEY=sk-xxx        # 通义千问
DEEPSEEK_API_KEY=sk-xxx     # DeepSeek
OPENAI_API_KEY=sk-xxx       # OpenAI
ZHIPU_API_KEY=xxx           # 智谱 GLM
MOONSHOT_API_KEY=sk-xxx     # Kimi
```

### 模型配置（`data/models.json`）

通过 Web 界面（⚙️ 模型配置）管理，也可手动编辑 JSON 文件。

每个模型配置：
```json
{
  "id": "qwen-max",          // 唯一标识
  "name": "通义千问 Max",      // 显示名称
  "modelId": "qwen-max",     // API 中的 model 参数
  "baseUrl": "https://...",  // OpenAI 兼容的 API 地址
  "apiKeyEnv": "QWEN_API_KEY", // .env 中对应的变量名
  "maxTokens": 4096,
  "temperature": 0.7,
  "enabled": true,
  "color": "#f97316",
  "icon": "🟠"
}
```

## 技术栈

- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS
- SSE (Server-Sent Events) 流式输出
- OpenAI 兼容 API 格式

## 项目结构

```
├── src/
│   ├── app/
│   │   ├── page.tsx           # 主对话页面
│   │   ├── settings/page.tsx  # 模型配置页面
│   │   └── api/
│   │       ├── chat/route.ts  # 对话 API（SSE流式）
│   │       └── models/route.ts # 模型 CRUD API
│   ├── components/
│   │   ├── ChatPanel.tsx      # 单模型对话面板
│   │   ├── Header.tsx         # 顶部导航
│   │   └── MessageBubble.tsx  # 消息气泡
│   └── lib/
│       ├── config.ts          # 配置读写
│       └── types.ts           # 类型定义
├── data/models.json           # 模型配置（持久化）
└── .env                       # API Key（不提交到 git）
```
