# Hermes Agent 操作说明 — skylife-sakura.com

## 项目基本信息

| 项目 | 内容 |
|------|------|
| 网站地址 | https://skylife-sakura.com |
| 本地路径 | /Users/hinodeimac/Desktop/skylife-sakura |
| 托管平台 | Cloudflare Pages |
| GitHub 仓库 | https://github.com/Miyazawa-ron/skylife-sakura |
| 部署命令 | `wrangler pages deploy . --project-name=skylife-sakura --commit-dirty=true` |

---

## Hermes 负责的工作范围

### 可以独立完成的任务

**内容更新**
- 修改 `index.html` 中的文案（标题、介绍、联系方式）
- 替换 `assets/` 目录下的图片文件
- 更新品牌色、字体、间距等 CSS 样式

**日常部署**
- 修改完成后执行部署命令
- 完成后通知 Claude Code 进行验证

**git 管理**
- `git add` / `git commit` / `git push`
- commit message 用中文简短描述即可

**Store 内容类修改**
- 修改 `store.html` 的 UI 文案、样式
- 更新价格文案、按钮文字等非逻辑内容

---

## 不要碰的文件（交给 Claude Code）

| 文件 | 原因 |
|------|------|
| `functions/api/*.js` | 后端逻辑，改错会导致 API 失效 |
| `store.js` 中的业务逻辑 | Credits 系统、轮询逻辑，牵一发动全身 |
| `wrangler.toml` | 部署配置，改错会导致无法部署 |
| `schema.sql` | 数据库结构，改动需要迁移 |
| `_headers` | 缓存策略，需要理解 CDN 机制 |

---

## 协同工作流程

```
Hermes 接到任务
      ↓
判断是否在「可独立完成」范围内？
      ↓ 是                    ↓ 否
  修改文件                告知用户
      ↓                  转交 Claude Code
  执行部署
      ↓
通知 Claude Code
「已完成 XX 修改，请验证」
      ↓
Claude Code 检查并反馈
```

---

## 常用操作速查

### 部署
```bash
cd /Users/hinodeimac/Desktop/skylife-sakura
wrangler pages deploy . --project-name=skylife-sakura --commit-dirty=true
```

### 提交代码
```bash
git add index.html assets/
git commit -m "更新首页文案"
git push
```

### 查看修改了哪些文件
```bash
git diff --name-only
```

---

## 品牌规范（修改时必须遵守）

| 项目 | 内容 |
|------|------|
| 公司名 | SKYライフ株式会社 |
| 品牌色 | `#E86020`（橙红色） |
| 邮箱 | skylife.sakura@gmail.com |
| 电话 | 080-5506-8724 |
| 地址 | 〒285-0014 千葉県佐倉市栄町10番地24－2F |

---

## 遇到问题时

- **页面显示异常、API 报错** → 停止操作，转交 Claude Code
- **部署失败** → 把错误信息完整转给 Claude Code
- **不确定能否修改某文件** → 先问，不要自行判断
