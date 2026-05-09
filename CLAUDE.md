# SKYライフ株式会社 — 网站项目说明

## 项目概要

SKYライフ株式会社（Sky Life Co., Ltd.）官方网站开发与维护项目。
公司前身为日の出株式会社（现已休眠），业务包括平面设计服务和千叶县民宿运营。

---

## 基本信息

| 项目 | 内容 |
|------|------|
| 主域名 | https://skylife-sakura.com |
| 备用地址 | https://a57fb511.skylife-sakura.pages.dev |
| 托管平台 | Cloudflare Pages |
| GitHub 仓库 | https://github.com/Miyazawa-ron/skylife-sakura |
| D1 数据库 | skylife（ID: c3d64aff-151f-4687-a86b-7782e0d41b5a） |
| 本地项目路径 | /Users/hinodeimac/Desktop/skylife-sakura |

---

## 部署命令

```bash
wrangler pages deploy . --project-name=skylife-sakura --commit-dirty=true
```

修改完成后直接在项目根目录执行此命令即可部署到 Cloudflare Pages。

---

## 品牌规范

- **公司名**：SKYライフ株式会社 / スカイライフ
- **品牌色**：`#E86020`（橙红色）
- **Logo**：SVG 矢量格式，已内嵌于 index.html
- **邮箱**：skylife.sakura@gmail.com
- **电话**：080-5506-8724
- **地址**：〒285-0014 千葉県佐倉市栄町10番地24－2F

---

## 网站架构

```
skylife-sakura.com/         → 公司展示主站（index.html）
skylife-sakura.com/store/   → AI 生图 / 生视频工具（Store 板块）
```

---

## 主站（index.html）

### 技术特点
- **单文件 HTML**，所有图片以 Base64 内嵌，无外部依赖，文件约 2.6MB
- 设计区和民宿区均使用 CSS 关键帧动画 + JS DOM 克隆实现无缝横向滚动轮播
- 鼠标悬停时轮播暂停，两侧有渐变遮罩效果

### 内容板块
| 板块 | 内容 |
|------|------|
| Hero | 手绘日式建筑插画 + 公司介绍文案 |
| 設計（Design） | 4 张书籍装帧作品轮播 |
| 民宿（Guesthouse） | 8 张民宿照片轮播 |
| Contact | 邮箱 / 电话 / 地址 |

### 修改注意事项
- 修改图片需替换对应的 Base64 字符串
- 轮播逻辑在 `<script>` 标签末尾，DOM 克隆函数勿轻易改动
- 文件较大，搜索内容时建议使用关键字定位

---

## Store 板块

### 技术架构
- **前端**：`store.js`（Cloudflare Pages 静态资源）
- **后端**：Cloudflare Functions（`functions/api/` 目录）
- 功能：用户注册/登录、Credits 余额系统、AI 生图、AI 生视频

### 关键文件

| 文件 | 功能 |
|------|------|
| `functions/api/generate.js` | 生图 / 生视频调用逻辑 |
| `functions/api/status.js` | Seedance 视频任务状态轮询 |
| `functions/api/auth/login.js` | 用户登录 |
| `functions/api/auth/register.js` | 用户注册 + 初始 credits 发放 |
| `functions/api/credits.js` | 余额查询 |
| `store.js` | 前端页面逻辑 |

### 第三方服务
| 服务 | 用途 |
|------|------|
| OpenAI API | 图片生成 |
| 火山引擎 Volcengine Seedance API | 视频生成（异步任务，需轮询） |
| Cloudflare D1 | 用户数据 + credits 存储 |

### 已知技术要点
- Cloudflare Functions 有 **30 秒超时限制**，视频生成须拆分为「提交任务」+「轮询状态」两步
- `store.js` 的 `generate()` 函数需检查返回数据中的 `data.polling` 标志，为 `true` 时触发轮询循环
- 轮询通过 `functions/api/status.js` 查询 Seedance 任务状态

---

## 沟通与协作规范

- **全程使用中文**进行沟通
- 修改主站时直接读写 `index.html`，完成后执行部署命令
- 修改 Store 后端时直接读写 `functions/api/` 下对应文件
- 涉及品牌色、公司名称、联系方式时以本文件为准，不要自行推测
