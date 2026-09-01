# Palimpsest

一个基于 [Tauri 2](https://v2.tauri.app/) 构建的跨平台工作事项记录应用。采用 Markdown 进行自由编辑，支持项目管理、事项跟踪、归档等核心功能。

## 功能特性

### 项目管理

- **创建项目**：选择本地路径，一键创建新项目
- **打开项目**：支持打开已存在的项目目录
- **切换项目**：快速在多个项目之间切换
- **最近项目**：自动记录最近打开的项目，方便快速访问

### 事项管理

- **创建事项**：为每条事项设置标题和标签
- **Markdown 编辑**：完全兼容 Markdown 语法，支持分屏实时预览
- **自动保存**：编辑内容自动保存（500ms 防抖），也支持 `Ctrl+S` / `Cmd+S` 手动保存
- **完成归档**：勾选完成后自动移入归档，主界面保持整洁
- **反归档**：从归档中恢复事项到进行中状态
- **删除**：彻底删除不需要的事项

### 数据存储

- **文件系统存储**：所有数据以普通文件形式存储，用户可直接查看和编辑
- **项目结构清晰**：每个项目目录下包含 `project.json`、`items/`、`archive/`
- **Git 友好**：项目目录可直接用 Git 进行版本控制
- **本地配置**：全局配置存储在系统标准路径

## 截图

> TODO: 添加应用截图

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | Tauri | 2.x |
| 前端 | React | 19.x |
| 类型 | TypeScript | 6.x |
| 构建 | Vite | 8.x |
| UI 库 | Ant Design | 6.x |
| Markdown 编辑 | @uiw/react-md-editor | 4.x |
| 状态管理 | Zustand | 5.x |
| 后端 | Rust | 2021 Edition |
| 日期处理 | Day.js | 1.x |

## 项目结构

```
Palimpsest/
├── .github/workflows/          # GitHub Actions 工作流
│   ├── ci.yml                   # CI 检查（PR/推送时触发）
│   └── release.yml              # 发布构建（打 tag 时触发）
│
├── src-tauri/                   # Rust 后端
│   ├── Cargo.toml               # Rust 依赖配置
│   ├── tauri.conf.json          # Tauri 配置
│   ├── capabilities/            # 权限声明
│   │   └── default.json
│   └── src/
│       ├── main.rs              # 入口
│       ├── lib.rs               # 注册 Commands
│       ├── models/              # 数据模型
│       │   ├── project.rs       # Project
│       │   └── item.rs          # ItemMeta
│       └── commands/            # Tauri 命令（IPC 接口）
│           ├── project.rs       # 项目 CRUD
│           ├── item.rs          # 事项 CRUD + 归档
│           └── config.rs        # 全局配置
│
├── src/                         # React 前端
│   ├── main.tsx                 # 入口
│   ├── App.tsx                  # 路由 + 全局配置
│   ├── types/index.ts           # TypeScript 类型定义
│   ├── stores/                  # Zustand 状态管理
│   │   ├── projectStore.ts
│   │   └── itemStore.ts
│   ├── pages/                   # 页面组件
│   │   ├── ProjectList.tsx      # 项目选择页
│   │   ├── Dashboard.tsx        # 事项列表页
│   │   ├── ItemEditor.tsx       # Markdown 编辑页
│   │   └── Archive.tsx          # 归档页
│   └── styles/global.css        # 全局样式
│
├── pnpm-lock.yaml               # pnpm 锁文件
├── package.json                 # npm 依赖
├── vite.config.ts               # Vite 配置
└── tsconfig.json                # TypeScript 配置
```

## 数据存储结构

每个项目在用户指定的路径下生成以下结构：

```
/path/to/your-project/
├── project.json              # 项目元信息
├── items/                    # 进行中的事项
│   ├── 修复登录Bug/
│   │   ├── meta.json         # 事项元数据（标题、标签、状态）
│   │   └── content.md        # Markdown 内容
│   └── 新增导出功能/
│       ├── meta.json
│       └── content.md
└── archive/                  # 已归档的事项
    └── 上周会议记录/
        ├── meta.json
        └── content.md
```

### 数据格式示例

**project.json**

```json
{
  "id": "a1b2c3d4",
  "name": "我的项目",
  "description": "项目描述",
  "createdAt": "2026-08-31T10:00:00Z",
  "updatedAt": "2026-08-31T10:00:00Z"
}
```

**meta.json**

```json
{
  "id": "e5f6g7h8",
  "title": "修复登录Bug",
  "completed": false,
  "archived": false,
  "tags": ["bug", "urgent"],
  "createdAt": "2026-08-31T10:00:00Z",
  "updatedAt": "2026-08-31T14:30:00Z"
}
```

**content.md**

```markdown
## 问题描述

登录页面在 Safari 下无响应。

## 排查过程

1. 检查控制台 → 无报错
2. 检查事件绑定 → 发现 `pointer-events: none` 被错误应用

## 进度

- [x] 定位问题
- [x] 修复代码
- [ ] 等待测试
```

## 环境要求

- **Node.js** >= 18
- **pnpm** >= 9（[安装 pnpm](https://pnpm.io/installation)）：`corepack enable && corepack prepare pnpm@latest --activate`
- **Rust** >= 1.77（[安装 Rust](https://www.rust-lang.org/tools/install)）
- **系统依赖**（仅 Linux）：
  - `libwebkit2gtk-4.1-dev`
  - `libappindicator3-dev`
  - `librsvg2-dev`
  - `patchelf`
  - `libgtk-3-dev`
  - `libsoup-3.0-dev`
  - `libjavascriptcoregtk-4.1-dev`

### 一键安装 Linux 依赖

```bash
sudo apt-get update && sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  libgtk-3-dev \
  libsoup-3.0-dev \
  libjavascriptcoregtk-4.1-dev
```

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/palimpsest.git
cd palimpsest
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 启动开发模式

```bash
pnpm tauri:dev
```

首次启动会下载 Rust 依赖并编译，耗时较长（约 2-5 分钟），后续启动秒开。

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 仅启动前端开发服务器 |
| `pnpm tauri:dev` | 启动 Tauri 开发模式（推荐） |
| `pnpm build` | 构建前端资源 |
| `pnpm tauri:build` | 构建 Tauri 安装包 |
| `pnpm lint` | 运行代码检查 |

## 发布与构建

### 本地构建

```bash
# macOS
pnpm tauri:build

# 输出目录
# src-tauri/target/release/bundle/macos/
```

### GitHub Actions 自动构建

**方式一：打 tag 自动触发**

```bash
git tag v1.0.0
git push origin v1.0.0
```

**方式二：手动触发**

GitHub → Actions → Release → Run workflow → 输入版本号（如 `v1.0.0`）

### 生成的产物

| 平台 | 产物格式 |
|------|----------|
| macOS (ARM64) | `.dmg` + `.app.tar.gz` |
| macOS (Intel) | `.dmg` + `.app.tar.gz` |
| Linux (x64) | `.deb` + `.AppImage` |
| Windows (x64) | `.msi` + `.exe` (NSIS) |

所有产物上传到 GitHub Draft Release，审核后即可发布。

### 可选 Secrets 配置

在 GitHub repo Settings → Secrets and variables → Actions 中配置：

| Secret | 说明 |
|--------|------|
| `TAURI_SIGNING_PRIVATE_KEY` | Tauri 更新签名密钥（用于自动更新） |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 签名密钥密码 |

## CI 检查

每次 push 到 `main` 分支或创建 PR 时，自动在三平台运行：

- TypeScript 类型检查
- Rust 编译检查

## 后端接口

### 项目相关

```rust
create_project(name, path, description) -> Result<Project, String>
open_project(path) -> Result<Project, String>
```

### 事项相关

```rust
create_item(project_path, title, tags) -> Result<ItemMeta, String>
list_items(project_path, show_archived) -> Result<Vec<ItemMeta>, String>
get_item_content(project_path, item_id) -> Result<String, String>
save_item_content(project_path, item_id, content) -> Result<(), String>
update_item_meta(project_path, item_id, title, tags) -> Result<(), String>
complete_item(project_path, item_id) -> Result<(), String>
uncomplete_item(project_path, item_id) -> Result<(), String>
delete_item(project_path, item_id) -> Result<(), String>
```

### 配置相关

```rust
get_config() -> Result<AppConfig, String>
save_config(config) -> Result<(), String>
save_recent_project(name, path) -> Result<AppConfig, String>
```

## 配置文件路径

| 系统 | 路径 |
|------|------|
| macOS | `~/Library/Application Support/com.palimpsest.app/config.json` |
| Windows | `%APPDATA%/palimpsest/config.json` |
| Linux | `~/.config/palimpsest/config.json` |

## 开发指南

### 添加新的 Tauri Command

1. 在 `src-tauri/src/commands/` 中定义函数并添加 `#[tauri::command]`
2. 在 `src-tauri/src/lib.rs` 的 `generate_handler!` 中注册
3. 在前端通过 `invoke('command_name', { params })` 调用

### 添加新的页面

1. 在 `src/pages/` 中创建页面组件
2. 在 `src/App.tsx` 的 `Routes` 中添加路由
3. 如需全局状态，在 `src/stores/` 中创建 Zustand store

## License

MIT
