# 📋 Handoff: Guestbook Backend (Claude Code 担当)

> 本文件描述 journal 留言板功能所需的后端 API 规格。前端（`journal.html`）已由 Hermes 完成，Claude Code 请按此规格实现后端。

## 1. 数据模型 — `messages` 表（D1）

```sql
CREATE TABLE IF NOT EXISTS messages (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    NOT NULL,          -- 投稿者名（最大50文字）
  message   TEXT    NOT NULL,          -- 本文（最大200文字）
  ip_hash   TEXT,                      -- IP 哈希（可选，防滥用）
  is_active INTEGER DEFAULT 1,        -- 软删除标志
  created_at TEXT DEFAULT (datetime('now', '+9 hours'))  -- JST
);
```

> **注意**：当前 `schema.sql` 仅有 `users` 和 `generations` 表，请在 `schema.sql` 追加上述建表语句，并在 D1 上执行 `wrangler d1 execute skylife --file=schema.sql`。

## 2. API 端点

### 2.1 GET `/api/journal/messages`

公开接口，无需认证。返回所有公开留言。

**响应格式**（200 OK）：

```json
{
  "messages": [
    {
      "id": 1,
      "name": "旅行者",
      "message": "素敵な宿ですね",
      "created_at": "2026-05-18 14:30:00"
    }
  ]
}
```

**排序**：按 `created_at DESC`（最新在前）。

**分页**：初期无需分页（上限 50 条），未来可加 `?limit=20&offset=0`。

**安全**：必须过滤 `is_active = 1` 的记录。`ip_hash` 字段不返回给前端。

### 2.2 POST `/api/journal/messages`

公开接口，无需认证。创建新留言。

**请求格式**（`Content-Type: application/json`）：

```json
{
  "name": "旅行者",
  "message": "素敵な宿ですね"
}
```

**校验规则**：
| 字段 | 必需 | 最大长度 | 说明 |
|------|------|---------|------|
| `name` | ✅ | 50 字符 | strip whitespace |
| `message` | ✅ | 200 字符 | strip whitespace |

**成功响应**（201 Created）：

```json
{
  "id": 1,
  "name": "旅行者",
  "message": "素敵な宿ですね",
  "created_at": "2026-05-17 17:30:00"
}
```

**错误响应**（400 Bad Request）：

```json
{
  "error": "name is required"
}
```

**防滥用**：
- 可选：记录 `ip_hash`（对 `request.headers.get('CF-Connecting-IP')` 做 SHA-256 哈希，不存原始 IP）
- 可选：同一 IP 每分钟限 3 条（用 D1 查询最近 60 秒的记录数）
- 可选：配置 `ADMIN_EMAIL` 环境变量来接收新留言通知邮件

## 3. 文件位置

```
functions/api/journal/messages.js
```

Junction: 响应 GET 和 POST 到 `/api/journal/messages`。

按照项目现有模式（参考 `functions/api/auth/login.js`），使用 `export async function onRequestGet({ request, env })` 和 `export async function onRequestPost({ request, env })`。

## 4. 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `DB` | ✅ | D1 数据库绑定（已在 `wrangler.toml` 中绑定为 `DB`） |

无需 JWT 认证（留言板是公开功能）。

## 5. 前端现状（`journal.html`）

- 已实现完整的 HTML/CSS/JS
- 页面加载时自动 GET `/api/journal/messages` 渲染留言列表
- 提交表单时 POST `/api/journal/messages`
- 如果 API 未就绪，用户会看到 "could not load messages" 及 "could not reach the server" 提示
- 邮件表单使用 mailto: skylife.sakura@gmail.com 作为 fallback（无需后端）

## 6. 部署后验证

1. 打开 `journal.html` — 留言区显示 "no messages yet"
2. POST 一条留言 — 成功提示后自动刷新列表
3. POST 空 name/message — 返回 400 错误
4. POST 超长 message（>200） — 返回 400 错误
5. 留言显示正确的 name 和 datetime

## 7. 开发备忘

- 无需 JWT 认证（留言板匿名公开）
- 建议用 Cloudflare D1 Console 或 `wrangler d1 execute` 直接操作数据
- 部署命令：`wrangler pages deploy . --project-name=skylife-sakura --commit-dirty=true`
