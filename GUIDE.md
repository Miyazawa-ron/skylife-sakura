# SKYライフ株式会社 — 网站维护指南

## 基本信息

| 项目 | 内容 |
|------|------|
| 网站地址 | https://skylife-sakura.com |
| 备用地址 | https://a57fb511.skylife-sakura.pages.dev |
| GitHub 仓库 | https://github.com/Miyazawa-ron/skylife-sakura |
| Cloudflare Pages | Workers & Pages → skylife-sakura |
| D1 数据库 | skylife（ID: c3d64aff-151f-4687-a86b-7782e0d41b5a） |
| 设计工具 | https://claude.ai/design → 项目名：SKYLife |

---

## 日常内容更新流程

### 修改文字 / 更换图片 / 调整版面

1. 打开 **https://claude.ai/design**，进入 SKYLife 项目
2. 在聊天框描述要修改的内容，例如：
   - "把 hero 区域的标题改为 ○○"
   - "替换 guesthouse 板块的第一张图片"
   - "在 products 页面增加一个新卡片"
3. 修改满意后，点右上角 **Export → Save as standalone HTML**
4. 打开 VS Code 终端，进入项目目录：
```bash
   cd ~/Desktop/skylife-sakura
```
5. 部署：
```bash
   wrangler pages deploy . --project-name=skylife-sakura --commit-dirty=true
```
6. 约 30 秒后刷新网站即可看到更新

---

## 增加新页面

1. 在 Claude Design 里描述新页面内容
2. 确保新页面在导航栏有对应链接
3. 按上述流程部署

---

## 页面跳转设置

在 Claude Design 里直接说明：
- "点击 ○○ 卡片跳转到 /○○ 页面"
- "导航栏 journal 链接到 journal.html"

---

## Store 页面修改

### 视觉 / 文字修改（在 Claude Design 里做）
- 修改标题、描述文字
- 调整登录表单样式
- 修改 credits 定价说明

### 后端功能修改（直接编辑代码）

本地文件位置：`~/Desktop/skylife-sakura/functions/`

| 文件 | 功能 |
|------|------|
| `api/auth/login.js` | 用户登录逻辑 |
| `api/auth/register.js` | 用户注册 + 初始 credits |
| `api/generate.js` | 生图调用（OpenAI / Seedance） |
| `api/credits.js` | 余额查询 |
| `api/history.js` | 历史记录 |

修改后重新部署：
```bash
wrangler pages deploy . --project-name=skylife-sakura --commit-dirty=true
```

### 修改用户注册赠送的 credits 数量
编辑 `functions/api/auth/register.js`，找到 `credits` 的初始值修改即可。

### 更新 API Key
```bash
wrangler pages secret put OPENAI_API_KEY
wrangler pages secret put SEEDANCE_API_KEY
wrangler pages secret put JWT_SECRET
```

---

## 管理员操作

### 查询用户列表
```bash
wrangler d1 execute skylife --remote --command="SELECT * FROM users;"
```

### 手动给用户充值 credits
```bash
wrangler d1 execute skylife --remote --command="UPDATE users SET balance=200 WHERE email='user@example.com';"
```

---

## 紧急回滚

如果新版本有问题，在 Cloudflare 控制台：
**Workers & Pages → skylife-sakura → Deployments → 选择上一个版本 → Rollback**

