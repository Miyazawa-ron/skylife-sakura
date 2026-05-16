# frontend-design Skill 使用说明

> Anthropic 官方出品的 Claude Code Skill，用于生成高质量、有独特美感的前端界面代码。

---

## 概述

`frontend-design` 是 Claude Code 的一个 Skill 插件，专为生成**生产级前端界面**而设计。它的核心目标是摆脱千篇一律的"AI 通用模板"风格，每次输出都具备明确的美学主张和独特的视觉个性。

---

## 安装方式

该 Skill 来自 Anthropic 官方插件市场（`anthropics/claude-plugins-official`），手动安装步骤如下：

```bash
# 将 skill 文件复制到 Claude Code 的 skills 目录
cp -r ~/.claude/plugins/marketplaces/claude-plugins-official/plugins/frontend-design/skills/frontend-design \
      ~/.claude/skills/frontend-design
```

安装完成后，重新启动 Claude Code 即可生效。

---

## 使用方式

### 触发方式

直接用自然语言描述你要做的界面即可，Claude 会自动判断并调用此 Skill：

- "帮我做一个用户登录页面"
- "设计一个产品展示卡片组件"
- "给我做一个数据看板"
- "做一个带动画的落地页"

也可以通过斜杠命令显式触发：

```
/frontend-design
```

### 支持的技术栈

- 纯 HTML / CSS / JavaScript
- React（推荐搭配 Motion 动画库）
- Vue

---

## 核心设计理念

### 设计前先思考

在动手写代码之前，Skill 会引导 Claude 从以下维度分析需求：

| 维度 | 说明 |
|------|------|
| **用途** | 这个界面解决什么问题？面向什么用户？ |
| **风格** | 确定一个鲜明的美学方向并彻底贯彻 |
| **约束** | 技术框架、性能、无障碍访问等要求 |
| **记忆点** | 这个界面最让人难忘的一个特征是什么？ |

### 美学风格参考

Skill 鼓励从以下风格中选择一个方向并极致化执行，而非折中：

- 极致简约（Brutally Minimal）
- 极繁主义混沌（Maximalist Chaos）
- 复古未来感（Retro-Futuristic）
- 有机自然风（Organic / Natural）
- 奢华精致（Luxury / Refined）
- 玩具感（Playful / Toy-like）
- 编辑排版风（Editorial / Magazine）
- 粗野主义（Brutalist / Raw）
- 装饰艺术几何感（Art Deco / Geometric）
- 柔和马卡龙（Soft / Pastel）
- 工业实用风（Industrial / Utilitarian）

---

## 各项设计要素规范

### 字体（Typography）
- 选择有个性的展示字体搭配精致的正文字体
- **禁止**使用 Arial、Inter、Roboto 等泛用字体

### 配色（Color & Theme）
- 用 CSS 变量保持全局一致性
- 主色调搭配锐利强调色，优于均匀分布的多色方案
- **禁止**使用紫色渐变叠白底等俗气配色

### 动效（Motion）
- HTML 项目优先用纯 CSS 动画；React 项目推荐使用 Motion 库
- 集中在高价值时机：页面加载时的错落出现（`animation-delay`）比分散的微交互更有冲击力
- 滚动触发动画与 hover 状态应带来惊喜感

### 空间构成（Spatial Composition）
- 鼓励：非对称、元素叠压、斜向流动、破格布局
- 大量留白 **或** 密集的受控排布，二选其一贯彻到底

### 背景与细节（Backgrounds & Visual Details）
- 渐变网格、噪点纹理、几何图案、分层半透明、戏剧性阴影
- 装饰性边框、自定义光标、颗粒叠加层等

---

## 禁止事项

以下是 Skill 明确要求避免的"AI 通用模板"特征：

- Inter、Roboto、Arial、系统默认字体
- 白底紫色渐变配色
- 可预测的布局和组件排布模式
- 缺乏场景特异性的千篇一律设计
- 不同次生成收敛到相同风格（如反复使用 Space Grotesk）

---

## 注意事项

- 复杂的极繁主义设计需要大量动画与特效代码，代码量会相应增多
- 精致的极简主义设计则需要对间距、字体、细节的精准把控
- 最终质量取决于美学方向的执行是否彻底，而非设计有多"复杂"

---

*Skill 来源：[anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)*
