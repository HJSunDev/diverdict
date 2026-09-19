# 发布与维护

## 当前交付

本地仓库可构建、测试、打包并接入 Codex。未假设已拥有任何 GitHub organization、远程仓库或 npm 名称，也没有伪造相应 badge、链接或下载量。

## 首次公开托管

1. 在实际归属的账号或组织下创建名为 `diverdict` 的独立仓库。
2. 在 `package.json` 填写真实 `repository.url`、`homepage`、`bugs.url`；如当前 npm 名称不可用，选择实际拥有的包名并同步锁文件和安装包验证脚本。
3. 配置分支保护、合并前评审和私密漏洞报告，并限制标签操作权限。
4. 确认 MIT 版权归属表述符合实际贡献关系；README 的安装方式与实际发布状态一致。
5. 运行 `npm ci`、`npm run check`、`npm run package:check`、`npm audit --omit=dev`。

维护者归属尚未确定，故不预填 CODEOWNERS 或 SECURITY 联系邮箱。

## 版本与制品

采用 SemVer，更新 CHANGELOG。标签 `v0.1.0` 必须与 package version 匹配。

```sh
npm pack
```

tarball 白名单只包含运行代码、角色源文档、许可、README、变更记录、用户文档和示例。源码交接历史不进入 npm 包。发布前查看 `npm pack --dry-run`，确认没有个人目录、对话或凭证。

## npm 发布

手动本地发布由维护者执行：确认包名权限、登录状态、tag、版本、许可和全部检查后运行 `npm publish --access public`。公共发布是独立维护操作，本地构建成功不代表已经发布。

## 更新与回滚

依赖更新需通过构建、测试及独立安装包验证。角色改动必须显式评审。出现坏版本时优先发布修复版本或弃用坏版本；不要重用已发布版本号。用户可以重新安装已知良好的 tarball，并把 Codex MCP 入口切回它。
