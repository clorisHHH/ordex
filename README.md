# Ordex

Ordex 是一款免费开源、可离线使用的文件编排桌面工具。它把导入文件复制到用户选择的项目目录，通过最多五级编号、拖拽排序和回收站帮助整理文件；原文件不会被移动或修改。

Ordex is a free, open-source desktop file organizer that works offline. It copies imports into a project folder you choose, then helps you organize them with numbering, drag-and-drop ordering, and a recoverable trash. Your original files remain untouched.

[下载 Mac / Windows 首发版 · Download the initial Mac / Windows release](https://github.com/clorisHHH/ordex/releases/tag/v1.0.0)

## 特性

- 新建项目时由用户选择本地保存位置
- 导入文件时复制副本，不移动或修改原文件
- 最多五级数字编号与拖拽重排
- 文件和文件夹删除、恢复及单项永久删除
- 可随时开启或关闭去除原编号，并恢复完整原始文件名
- 中英文界面切换；Mac 使用原生 Quick Look，Windows 使用软件内空格预览
- 桌面版完全离线运行，不依赖云端服务
- macOS Apple Silicon 与 Windows x64 打包脚本

## 数据与隐私

仓库不包含任何用户数据、演示项目、视频、音频或安装包。

桌面版将项目索引保存在本机 Ordex 设置目录中，文件副本和 `.ordex` 编排数据保存在用户选择的项目文件夹。

新用户首次运行时看到的是空的“我的项目”页面。

## 本地开发

需要 Node.js 20+ 和 pnpm。

```bash
pnpm install
pnpm dev
```

## 测试与构建

```bash
pnpm test
pnpm build
```

构建产物生成在 `dist/`，不会提交到仓库。

## 运行桌面版

先生成前端构建，再用项目内的 Electron 启动：

```bash
pnpm build
pnpm exec electron desktop/main.cjs
```

## 打包

macOS Apple Silicon：

```bash
python3 desktop/package.py
```

Windows x64 打包脚本为 `desktop/package-windows.py`。打包产物、下载的 Electron 运行时和临时目录均被 Git 忽略。Windows 安装向导可选择安装目录及是否创建桌面快捷方式；默认安装在 `%LOCALAPPDATA%\Programs\Ordex`。可从开始菜单的 `Uninstall Ordex` 或 Windows“已安装的应用”卸载。

## 第三方组件

项目包含 Rare UI、Uiverse、MingCute 图标和离线文件预览组件。相应的 MIT / Apache 2.0 许可及说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)；桌面安装包附带许可证文本。

软件卸载不会自动删除项目目录或 Ordex 设置数据。

首发安装包未使用 Apple Developer ID 公证或 Windows 商业代码签名；从网络下载后，系统可能显示安全提示。发布说明附带 SHA-256 校验值。Windows 安装与运行已在实机验证；未签名的系统提示仍需下载者自行确认。

## 许可证

Ordex 采用 [MIT License](LICENSE) 开源。
