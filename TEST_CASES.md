# Beervid CLI 测试用例

## 1. 文档说明

- 本测试用例基于当前仓库实现、README 中的功能说明、示例请求文件，以及 CLI 已落地的接口路径与参数规则整理。
- 范围覆盖：安装与启动、配置与鉴权、账户/标签/模板查询、视频创建与上传、任务查询与轮询、视频库与发布、发布策略、原始接口调用、补全脚本。
- 用例类型覆盖：正常流程、参数校验、兼容性、异常处理、边界值、幂等性、纯逻辑 helper 校验。
- 若后续“之前提供的接口文档”存在比当前代码更新的字段约束，应以最新接口文档补充或修订本清单。

## 2. 测试环境与通用前置条件

### 2.1 环境要求

- Node.js 18 及以上。
- 可访问 Beervid Open API 服务。
- 具备有效 API Key、测试用 TikTok 账号、模板、策略、视频、商品数据。
- 当前本地环境需要注意：PATH 中的 `node` 可能是 Docker 包装脚本。若发现命令落到其他项目目录，应改用真实 Node 可执行文件，例如 `/opt/homebrew/bin/node`。
- 当前仓库已新增纯逻辑 helper 测试，建议优先执行：
  - `/opt/homebrew/bin/node --test test/helpers.test.js`
  - `/opt/homebrew/bin/node bin/beervid.js --help`
- 准备本地测试素材：
  - 合法 JPG/JPEG/PNG 图片各 1 份
  - 合法 MP4/MOV 视频各 1 份
  - 合法 MP3/WAV 音频各 1 份
  - 超尺寸图片/视频/音频各 1 份
  - 不合法扩展名文件各 1 份

### 2.2 建议测试数据

- 有效 API Key / 无效 API Key / 空 API Key
- 有效 `template_id`
- 有效 `task_id`
- 有效 `videoId`
- 有效 `publish_task_id`
- 有效 `strategy_id`
- 有效 `businessId`
- 有效 `creatorUserOpenId`
- 有效 `accountId`

### 2.3 结果校验通用项

- 文本模式输出内容是否符合命令语义。
- `--json` 输出是否为合法 JSON，且包含 `ok`、`command`、`data`。
- 失败时退出码是否符合实现约定：
  - `1`: 参数错误/本地校验失败
  - `2`: 缺少 API Key
  - `3`: 401 鉴权失败
  - `4`: 请求失败/上传失败/远程下载失败
  - `5`: 业务结果缺失或任务/资源未找到
  - `6`: 轮询超时

## 3. 功能清单

- `auth`: `set-key` / `status` / `test` / `check` / `profile` / `clear`
- `accounts`: `list` / `shoppable`
- `labels`: `list`
- `templates`: `list` / `get`
- `video`: `create` / `upload` / `tasks list|get|watch` / `list` / `publish` / `data get` / `run`
- `publish`: `products` / `strategy list|get|create|enable|disable|delete` / `records` / `run`
- `raw`: `get|post|put|patch|delete`
- `completion`: `zsh|bash|fish`
- helper tests: `parseArgs` / payload normalize / status normalize / deep-field lookup
- transport tests: HTTP 200 + 业务失败信封应返回失败，而不是伪成功

## 4. 测试用例

### 4.1 安装、启动与基础帮助

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-BOOT-001 | 安装 | `npm install -g beervid-cli` 安装成功 | Node 环境正常 | 执行全局安装 | 安装成功，无依赖缺失报错 |
| TC-BOOT-002 | 安装 | `npm link` 本地链接成功 | 仓库代码完整 | 执行 `npm link` | 可生成 `beervid` 可执行命令 |
| TC-BOOT-002A | 安装 | 发布包暴露双 bin 名称 | 已全局安装或通过 npx 调用 | 执行 `beervid --help`、`beervid-cli --help`、`npx beervid-cli --help` | 三种调用方式均可启动 CLI |
| TC-BOOT-003 | 启动 | `beervid --help` 显示总帮助 | 已安装 CLI | 执行命令 | 输出主命令列表与全局参数 |
| TC-BOOT-004 | 启动 | `beervid` 无参数 | 已安装 CLI | 执行命令 | 输出总帮助，不报错 |
| TC-BOOT-005 | 启动 | 未知一级命令 | 已安装 CLI | 执行 `beervid unknown` | 提示 `Unknown command`，退出码为 1 |
| TC-BOOT-006 | 启动 | 一级命令帮助 | 已安装 CLI | 分别执行 `beervid auth --help`、`beervid video --help` 等 | 输出对应子命令帮助 |
| TC-BOOT-007 | 启动 | 未知子命令 | 已安装 CLI | 执行如 `beervid auth unknown` | 输出对应模块帮助 |
| TC-BOOT-008 | 启动 | `--json` 全局输出 | 已安装 CLI | 对任意成功命令追加 `--json` | 输出合法 JSON |
| TC-BOOT-009 | 启动 | `--config-path` 使用自定义配置文件 | 指定路径可写 | 使用自定义路径执行 `auth set-key` 与 `auth status` | 配置写入并从自定义路径读取 |
| TC-BOOT-010 | 兼容性 | bin 入口脚本可直接运行 | 仓库存在 `bin/beervid.js` | 执行 `node /绝对路径/bin/beervid.js --help` | CLI 正常启动 |
| TC-BOOT-011 | 兼容性 | 真实 Node 可直接运行当前仓库 | 本地 `node` 可能为包装脚本 | 执行 `/opt/homebrew/bin/node bin/beervid.js --help` | CLI 正常启动且显示当前仓库帮助 |
| TC-BOOT-012 | 兼容性 | 未知命令退出码正确 | 已安装 CLI | 执行 `/opt/homebrew/bin/node bin/beervid.js unknown` | 输出 `Unknown command`，退出码为 1 |
| TC-BOOT-013 | completion | `completion zsh` 输出补全脚本 | 已安装 CLI | 执行 `/opt/homebrew/bin/node bin/beervid.js completion zsh` | 输出 zsh 补全内容 |

### 4.1.1 纯逻辑 helper 测试

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-HELPER-001 | helper | `parseArgs` 解析 positionals 与 flags | Node 环境正常 | 执行 `/opt/homebrew/bin/node --test test/helpers.test.js` | `parseArgs` 用例通过 |
| TC-HELPER-002 | helper | `normalizeVideoCreatePayload` 解包 `formData/request` | 同上 | 执行 helper tests | 对应测试通过 |
| TC-HELPER-003 | helper | `normalizeVideoPublishPayload` 兼容 `accountId -> businessId` | 同上 | 执行 helper tests | 对应测试通过 |
| TC-HELPER-004 | helper | `normalizeStrategyPayload` 解包 `strategyCreateDTO` | 同上 | 执行 helper tests | 对应测试通过 |
| TC-HELPER-005 | helper | `normalizeTaskStatus` 兼容数值状态 | 同上 | 执行 helper tests | 对应测试通过 |
| TC-HELPER-006 | helper | `findEnabledState` 兼容布尔/数字/字符串 | 同上 | 执行 helper tests | 对应测试通过 |
| TC-HELPER-007 | helper | `findTaskId` 深层提取 task id | 同上 | 执行 helper tests | 对应测试通过 |
| TC-HELPER-008 | helper | `findDeepValue` 递归读取嵌套字段 | 同上 | 执行 helper tests | 对应测试通过 |
| TC-HELPER-009 | helper | `getEnvelopeFailure` 忽略成功信封 | 同上 | 执行 HTTP/helper tests | 对应测试通过 |
| TC-HELPER-010 | helper | `getEnvelopeFailure` 识别业务失败信封 | 同上 | 执行 HTTP/helper tests | 对应测试通过 |

### 4.2 配置与鉴权 `auth`

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-AUTH-001 | auth | 保存 API Key | 无 | 执行 `auth set-key <valid_key>` | 返回保存成功，展示配置路径 |
| TC-AUTH-002 | auth | 保存 API Key 后查询状态 | 已保存有效 Key | 执行 `auth status` | 显示已配置、`base_url`、脱敏后的 `api_key` |
| TC-AUTH-003 | auth | 未配置 API Key 时查询状态 | 无配置 | 执行 `auth status` | 显示未配置与配置文件路径 |
| TC-AUTH-004 | auth | 清除 API Key | 已保存 Key | 执行 `auth clear` | 返回删除成功 |
| TC-AUTH-005 | auth | 清除后再次查询状态 | 已执行 clear | 执行 `auth status` | 显示未配置 |
| TC-AUTH-006 | auth | `auth check` 正常 | 有效 Key | 执行 `auth check` | 返回鉴权状态、用户名 |
| TC-AUTH-007 | auth | `auth profile` 正常 | 有效 Key | 执行 `auth profile` | 返回用户资料字段 |
| TC-AUTH-008 | auth | `auth test` 正常 | 有效 Key | 执行 `auth test` | 同时验证 `/check` 与 `/profile`，返回通过 |
| TC-AUTH-009 | auth | 缺少 API Key 执行受保护命令 | 未配置 Key | 执行 `accounts list` 等任一需要鉴权命令 | 提示缺少 Key，退出码 2 |
| TC-AUTH-010 | auth | 无效 API Key | 配置无效 Key | 执行 `auth check` | 返回 401 类错误，退出码 3 |
| TC-AUTH-011 | auth | `--api-key` 优先覆盖配置文件 | 配置文件中存在旧 Key | 执行 `auth check --api-key <new_key>` | 实际使用命令行 Key |
| TC-AUTH-012 | auth | `BEERVID_API_KEY` 生效 | 设置环境变量 | 不传 `--api-key` 执行 `auth check` | 使用环境变量鉴权 |
| TC-AUTH-013 | auth | `--base-url` 覆盖默认地址 | 有测试环境地址 | 执行 `auth status --base-url <url>` | 输出指定 baseUrl |
| TC-AUTH-014 | auth | 请求超时 | 配置极短 timeout 或模拟超时 | 执行任一请求命令 | 返回 `Request failed`，退出码 4 |

### 4.3 账户查询 `accounts`

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-ACC-001 | accounts | 查询全部账户 | 有效 Key | 执行 `accounts list` | 返回账户列表 |
| TC-ACC-002 | accounts | 按 `--shoppable-type ALL` 查询 | 有效 Key | 执行 `accounts list --shoppable-type ALL` | 返回全部可见账户 |
| TC-ACC-003 | accounts | 按 `--shoppable-type TT` 查询 | 有效 Key | 执行对应命令 | 请求参数正确，结果符合筛选 |
| TC-ACC-004 | accounts | 按 `--shoppable-type TTS` 查询 | 有效 Key | 执行对应命令 | 请求参数正确，结果符合筛选 |
| TC-ACC-005 | accounts | 关键词查询 | 有效 Key | 执行 `accounts list --keyword xxx` | 返回匹配账户 |
| TC-ACC-006 | accounts | 分页查询 | 有效 Key | 执行 `accounts list --current 2 --size 5` | 请求分页参数正确 |
| TC-ACC-007 | accounts | `accounts shoppable` 正常 | 有效 Key | 执行 `accounts shoppable` | 内部按 `shoppableType=TTS` 查询 |
| TC-ACC-008 | accounts | `accounts shoppable` 带分页和关键词 | 有效 Key | 执行带 `--keyword --current --size` 命令 | 参数传递正确 |
| TC-ACC-009 | accounts | 空结果集 | 查询条件无匹配 | 执行关键词过滤 | 输出 `0 accounts found` |
| TC-ACC-010 | accounts | 结果字段兼容显示 | 接口返回 `businessId/id/accountId` 不同组合 | 执行 `accounts list` | 文本输出能容错展示 ID、名称、`creator_user_open_id` |

### 4.4 标签查询 `labels`

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-LABEL-001 | labels | 查询标签列表 | 有效 Key | 执行 `labels list` | 返回标签列表 |
| TC-LABEL-002 | labels | 空结果集 | 接口无数据 | 执行 `labels list` | 输出 `0 labels found` |
| TC-LABEL-003 | labels | 字段兼容显示 | 返回 `id/labelId`、`name/labelName` 混合 | 执行命令 | 文本输出正确兼容 |
| TC-LABEL-004 | labels | 非法子命令 | 有效 Key | 执行 `labels get` | 输出 `labels` 帮助 |

### 4.5 模板查询 `templates`

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-TPL-001 | templates | 查询模板列表 | 有效 Key | 执行 `templates list` | 返回模板列表 |
| TC-TPL-002 | templates | 模板列表字段兼容 | 接口返回 `value/id/templateId`、`label/name/templateName` | 执行命令 | 输出兼容字段 |
| TC-TPL-003 | templates | 查询模板详情成功 | 有效 `template_id` | 执行 `templates get --id xxx` | 返回模板详情 |
| TC-TPL-004 | templates | 未传 `--id` | 有效 Key | 执行 `templates get` | 提示用法，退出码 1 |
| TC-TPL-005 | templates | 模板不存在 | 无效 `template_id` | 执行查询 | 返回接口错误或资源不存在 |
| TC-TPL-006 | templates | 详情字段兼容 | 接口嵌套在 `data.data` 或平铺 | 执行查询 | 可正确读取 `name/label`、`techType`、`videoScale` |

### 4.6 视频上传 `video upload`

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-UPL-001 | video.upload | 上传 JPG 图片成功 | 有效图片 | 执行 `video upload --path a.jpg --type image` | 上传成功，返回 `file_url` |
| TC-UPL-002 | video.upload | 上传 PNG 图片成功 | 有效图片 | 执行对应命令 | 上传成功 |
| TC-UPL-003 | video.upload | 上传 MP4 视频成功 | 有效视频 | 执行对应命令 | 上传成功 |
| TC-UPL-004 | video.upload | 上传 MOV 视频成功 | 有效视频 | 执行对应命令 | 上传成功 |
| TC-UPL-005 | video.upload | 上传 MP3 音频成功 | 有效音频 | 执行对应命令 | 上传成功 |
| TC-UPL-006 | video.upload | 上传 WAV 音频成功 | 有效音频 | 执行对应命令 | 上传成功 |
| TC-UPL-007 | video.upload | 缺少 `--path` | 有效 Key | 仅传 `--type` 执行 | 提示用法，退出码 1 |
| TC-UPL-008 | video.upload | 缺少 `--type` | 有效 Key | 仅传 `--path` 执行 | 提示用法，退出码 1 |
| TC-UPL-009 | video.upload | `--type` 非法 | 有效文件 | 执行 `--type doc` | 提示仅支持 `image|video|audio` |
| TC-UPL-010 | video.upload | 文件不存在 | 无 | 指定不存在路径 | 提示文件不存在，退出码 1 |
| TC-UPL-011 | video.upload | 图片扩展名非法 | 准备 gif/webp 等文件 | 上传为 image | 报不支持扩展名 |
| TC-UPL-012 | video.upload | 视频扩展名非法 | 准备 avi 文件 | 上传为 video | 报不支持扩展名 |
| TC-UPL-013 | video.upload | 音频扩展名非法 | 准备 aac 文件 | 上传为 audio | 报不支持扩展名 |
| TC-UPL-014 | video.upload | 图片超过 7MB | 超限图片 | 上传为 image | 报大小超限 |
| TC-UPL-015 | video.upload | 视频超过 10MB | 超限视频 | 上传为 video | 报大小超限 |
| TC-UPL-016 | video.upload | 音频超过 5MB | 超限音频 | 上传为 audio | 报大小超限 |
| TC-UPL-017 | video.upload | 接口返回 `error=true` | 模拟上传失败响应 | 执行上传 | CLI 判定失败，退出码 4 |
| TC-UPL-018 | video.upload | 接口返回 `success=false` | 模拟失败响应 | 执行上传 | CLI 判定失败，退出码 4 |
| TC-UPL-019 | video.upload | 接口返回 `code!=0` | 模拟失败响应 | 执行上传 | CLI 判定失败，退出码 4 |
| TC-UPL-020 | video.upload | 成功但无 `fileUrl` | 模拟异常成功响应 | 执行上传 | 识别为异常结果，退出码 5 |

### 4.7 视频创建 `video create`

#### 4.7.1 正常流程与兼容输入

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-VC-001 | video.create | 使用 README 示例创建 VEO 视频 | 有效 Key | 执行 `video create --file examples/video-create.json` | 创建成功并返回 `task_id` |
| TC-VC-002 | video.create | 支持原始 open API body | 准备原始请求 JSON | 执行创建 | 请求体原样发送 |
| TC-VC-003 | video.create | 支持旧版 `formData` 包装 | 准备 `{ "formData": {...} }` | 执行创建 | 自动解包并成功提交 |
| TC-VC-004 | video.create | 支持旧版 `request` 包装 | 准备 `{ "request": {...} }` | 执行创建 | 自动解包并成功提交 |
| TC-VC-005 | video.create | 支持 `--stdin` 输入 | 有效 JSON | `cat payload.json \| beervid video create --stdin` | 成功读取 stdin |
| TC-VC-006 | video.create | 返回消息中无显式字段、仅 message 含 taskId | 模拟接口返回 message 中带 taskId | 执行创建 | 可从 message 提取 `task_id` |
| TC-VC-007 | video.create | 文本模式输出 Next 提示 | 有效 Key | 执行创建 | 输出后续 `video tasks get` 建议命令 |
| TC-VC-008 | video.create | JSON 模式输出 | 有效 Key | 追加 `--json` | 输出 JSON 且包含完整接口数据 |
| TC-VC-009 | video.create | `fragmentList[].videoContent` 原文直传 | 准备包含中文、Markdown、占位符、首尾空白的请求 JSON | 执行创建前本地 normalize/helper tests，或对请求发送体做断言 | CLI 不改写、不翻译、不 trim、不总结用户视频描述 |
| TC-VC-010 | video.run | 首次查询前延迟等待 | 有效 Key 与有效请求 | 执行 `video run --file payload.json --initial-wait 300` | 提交成功后先等待 300 秒，再开始首次状态查询，避免立即高频轮询 |
| TC-VC-011 | video.create | `techType` 与系统风格映射一致 | 准备 `techType=veo` 与 `techType=sora` 的请求 JSON | 执行创建前检查帮助文档、示例和发送体 | 项目说明明确 `veo=电影风格`、`sora 系列=写实风格`，提交和对外说明不得混淆 |
| TC-VC-012 | video.create | `videoScale=16:9` 时仅允许 `veo` | 有效 Key | 提交 `videoScale=16:9` 且 `techType=sora*` 的 payload | 按最新接口文档应本地拦截或由服务端返回明确错误 |
| TC-VC-013 | video.create | `dialogueLanguage` 必填且需匹配 `techType` | 有效 Key | 分别提交缺失语言、以及 `veo/sora` 不支持的语言组合 | 按文档返回明确校验错误 |
| TC-VC-014 | video.create | `showTitle/showSubtitle/noBgmMusic/hdEnhancement` 必填布尔字段 | 有效 Key | 提交缺失或 `null` 的布尔字段 | 按文档返回明确校验错误 |
| TC-VC-015 | video.create | `showTitle/showSubtitle=true` 仅支持英语语种 | 有效 Key | 提交 `dialogueLanguage=Mandarin` 且标题/字幕开关为 `true` | 按文档返回明确校验错误 |
| TC-VC-016 | video.create | `hdEnhancement=true` 仅支持 `sora` 系列 | 有效 Key | 提交 `techType=veo` 且 `hdEnhancement=true` | 按文档返回明确校验错误 |
| TC-VC-017 | video.create | `labelIds` 需为当前用户可用的合法 UUID | 有效 Key | 提交非法格式或不属于当前用户的 `labelIds` | 按文档返回标签校验错误 |

#### 4.7.2 VEO 参数校验

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-VC-101 | video.create | `techType=veo`、`segmentCount=1` 合法 | 有效 Key | 提交合法 payload | 校验通过 |
| TC-VC-102 | video.create | `techType=veo`、`segmentCount=4` 合法 | 有效 Key | 提交合法 payload | 校验通过 |
| TC-VC-103 | video.create | `segmentCount=0` 非法 | 有效 Key | 提交 payload | 提示 1-4 才合法 |
| TC-VC-104 | video.create | `segmentCount=5` 非法 | 有效 Key | 提交 payload | 提示 1-4 才合法 |
| TC-VC-105 | video.create | `segmentCount` 非整数 | 有效 Key | 提交浮点或字符串 | 提示必须为整数 |
| TC-VC-105A | video.create | `veo` 单片段 `segmentCount=2` 需显式确认 | 有效 Key | 执行 `video create --file payload.json`，其中 payload 为单片段 `veo` 16s | 本地拦截，并提示需用 `--confirm-veo-two-8s` 确认“16 秒其实是两个 8 秒片段” |
| TC-VC-105B | video.create | 已确认的 `veo` 单片段 `segmentCount=2` 可提交 | 有效 Key | 执行 `video create --file payload.json --confirm-veo-two-8s` | 校验通过 |
| TC-VC-106 | video.create | `spliceMethod=SPLICE` 合法 | 有效 Key | 提交 payload | 校验通过 |
| TC-VC-107 | video.create | `segmentCount=1` 且 `LONG_TAKE` 非法 | 有效 Key | 提交 payload | 本地拦截 |
| TC-VC-108 | video.create | `productReferenceImages` 0 张 | 有效 Key | 提交 payload | 合法 |
| TC-VC-109 | video.create | `productReferenceImages` 3 张 | 有效 Key | 提交 payload | 合法 |
| TC-VC-110 | video.create | `productReferenceImages` 4 张 | 有效 Key | 提交 payload | 提示 VEO 最多 3 张 |
| TC-VC-111 | video.create | `portraitImages` 0 张 | 有效 Key | 提交 payload | 合法 |
| TC-VC-112 | video.create | `portraitImages` 1 张 | 有效 Key | 提交 payload | 合法 |
| TC-VC-113 | video.create | `portraitImages` 2 张 | 有效 Key | 提交 payload | 提示 VEO 最多 1 张 |
| TC-VC-114 | video.create | `videoScale=9:16` 且有 `portraitImages`、`useCoverFrame=true` | 有效 Key | 提交 payload | 合法 |
| TC-VC-115 | video.create | `videoScale=9:16` 且有 `portraitImages`、`useCoverFrame=false` | 有效 Key | 提交 payload | 本地拦截 |
| TC-VC-116 | video.create | `videoScale=16:9` 且有 `portraitImages` | 有效 Key | 提交 payload | 不触发该额外限制 |

#### 4.7.3 SORA 系列参数校验

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-VC-201 | video.create | `techType=sora` 合法单片段 | 有效 Key | 提交合法 payload | 校验通过 |
| TC-VC-202 | video.create | `techType=sora_azure` 合法 | 有效 Key | 提交合法 payload | 校验通过 |
| TC-VC-203 | video.create | `techType=sora_h_pro` 合法 | 有效 Key | 提交合法 payload | 校验通过 |
| TC-VC-204 | video.create | `techType=sora_aio` 合法 | 有效 Key | 提交合法 payload | 校验通过 |
| TC-VC-205 | video.create | SORA `segmentCount=1` 合法 | 有效 Key | 提交 payload | 校验通过 |
| TC-VC-206 | video.create | SORA `segmentCount=2` 非法 | 有效 Key | 提交 payload | 本地拦截 |
| TC-VC-206A | video.create | SORA 多片段非法 | 有效 Key | 提交 `fragmentList.length > 1` 的 payload | 本地拦截，并提示 SORA 系列当前只支持单片段 15 秒 |
| TC-VC-207 | video.create | SORA `useCoverFrame=false` 合法 | 有效 Key | 提交 payload | 校验通过 |
| TC-VC-208 | video.create | SORA `useCoverFrame=true` 非法 | 有效 Key | 提交 payload | 本地拦截 |
| TC-VC-209 | video.create | SORA `portraitImages` 非空非法 | 有效 Key | 提交 payload | 本地拦截 |
| TC-VC-210 | video.create | SORA `productReferenceImages` 1 张合法 | 有效 Key | 提交 payload | 校验通过 |
| TC-VC-211 | video.create | SORA `productReferenceImages` 2 张非法 | 有效 Key | 提交 payload | 本地拦截 |
| TC-VC-212 | video.create | SORA `nineGridImages` 9 张合法 | 有效 Key | 提交 payload | 校验通过 |
| TC-VC-213 | video.create | SORA `nineGridImages` 10 张非法 | 有效 Key | 提交 payload | 本地拦截 |
| TC-VC-214 | video.create | 仅传 `nineGridImages` 不传 `productReferenceImages` | 有效 Key | 提交 payload | 本地拦截 |
| TC-VC-215 | video.create | 仅传 `productReferenceImages` 不传 `nineGridImages` | 有效 Key | 提交 payload | 本地拦截 |
| TC-VC-216 | video.create | SORA `spliceMethod=LONG_TAKE` 非法 | 有效 Key | 提交 payload | 本地拦截 |

#### 4.7.4 通用参数校验与异常

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-VC-301 | video.create | payload 非对象 | 有效 Key | 传数组/字符串 JSON | 提示必须是 JSON 对象 |
| TC-VC-302 | video.create | 缺少输入文件和 stdin | 有效 Key | 不传 `--file/--stdin` | 提示缺少 JSON 输入 |
| TC-VC-303 | video.create | JSON 文件格式非法 | 有效 Key | 提供坏 JSON 文件 | 命令失败 |
| TC-VC-304 | video.create | `techType` 非法 | 有效 Key | 传未支持值 | 本地拦截 |
| TC-VC-305 | video.create | 缺少 `fragmentList` | 有效 Key | 提交 payload | 本地拦截 |
| TC-VC-306 | video.create | `fragmentList=[]` | 有效 Key | 提交 payload | 本地拦截 |
| TC-VC-307 | video.create | 片段项非对象 | 有效 Key | 提交 payload | 本地拦截 |
| TC-VC-308 | video.create | `videoContent` 为空字符串 | 有效 Key | 提交 payload | 本地拦截 |
| TC-VC-309 | video.create | `useCoverFrame` 不是布尔值 | 有效 Key | 传字符串/数值 | 本地拦截 |
| TC-VC-310 | video.create | `spliceMethod` 非法值 | 有效 Key | 传其他枚举 | 本地拦截 |
| TC-VC-311 | video.create | 接口返回业务错误 | 模拟 4xx/5xx | 提交创建 | 输出错误，退出码 4 或 3 |
| TC-VC-312 | video.create | HTTP 200 但业务失败时不应输出伪成功 | 余额不足或模拟 `error=true/success=false/code!=0` 响应 | 执行 `video create` | CLI 输出业务错误并以退出码 4 失败 |

#### 4.7.5 自动上传能力

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-VC-401 | video.create | `productReferenceImages` 本地路径自动上传 | 准备本地图片 | 提交 payload | 提交前自动上传并替换为 `fileUrl` |
| TC-VC-402 | video.create | `productReferenceImages` 远程 URL 自动上传 | 远程图片可访问 | 提交 payload | 自动下载上传并替换 |
| TC-VC-403 | video.create | `nineGridImages` 本地路径自动上传 | 准备本地图片 | 提交 payload | 自动上传替换 |
| TC-VC-404 | video.create | `portraitImages` 本地路径自动上传 | 准备本地图片 | 提交 payload | 自动上传替换 |
| TC-VC-405 | video.create | `bgmList` 本地路径自动上传 | 准备音频 | 提交 payload | 自动上传替换 |
| TC-VC-406 | video.create | `headVideo` 本地路径自动上传 | 准备视频 | 提交 payload | 自动上传替换 |
| TC-VC-407 | video.create | `endVideo` 本地路径自动上传 | 准备视频 | 提交 payload | 自动上传替换 |
| TC-VC-408 | video.create | 本地路径不存在时不自动上传 | 传普通字符串 | 提交 payload | 保持原值，不误判为本地文件 |
| TC-VC-409 | video.create | 远程 URL 下载失败 | 远程地址 404 或不可达 | 提交 payload | 返回远程下载失败，退出码 4 |
| TC-VC-410 | video.create | 远程文件类型不合法 | 远程返回非支持扩展/类型 | 提交 payload | 本地校验失败 |
| TC-VC-411 | video.create | 自动上传日志显示 | 非 quiet 模式 | 提交包含本地/远程素材的 payload | stderr 输出 `Uploading ...` |
| TC-VC-412 | video.create | `--quiet` 抑制自动上传日志 | 追加 `--quiet` | 提交 payload | 不输出上传过程日志 |

### 4.8 任务查询与轮询 `video tasks`

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-TASK-001 | video.tasks | 列出全部任务 | 有效 Key | 执行 `video tasks list` | 返回任务列表 |
| TC-TASK-002 | video.tasks | 按状态过滤任务 | 有效 Key | 执行 `video tasks list --status 2` | 请求带状态参数 |
| TC-TASK-003 | video.tasks | 任务分页 | 有效 Key | 执行 `--current --size` | 参数传递正确 |
| TC-TASK-004 | video.tasks | 按 task_id 获取任务成功 | 已知有效任务 | 执行 `video tasks get --task-id xxx` | 输出任务状态 |
| TC-TASK-005 | video.tasks | 未传 `--task-id` | 有效 Key | 执行 `video tasks get` | 提示用法 |
| TC-TASK-006 | video.tasks | 任务不存在 | 无效 task_id | 执行获取 | 提示 `Task not found`，退出码 5 |
| TC-TASK-007 | video.tasks | 轮询成功结束 | 任务最终成功 | 执行 `video tasks watch --task-id xxx` | 输出 `Task completed` |
| TC-TASK-008 | video.tasks | 轮询失败结束 | 任务最终失败 | 执行 watch | 输出 `Task failed`，退出码 5 |
| TC-TASK-009 | video.tasks | 轮询状态为数值 0/1/2 | 接口返回数值状态 | 执行 get/watch | 正确映射为 failed/completed/processing |
| TC-TASK-010 | video.tasks | 轮询状态为文本 | 接口返回 success/pending/running 等 | 执行 get/watch | 正确格式化状态 |
| TC-TASK-011 | video.tasks | `--interval` 生效 | 有效 Key | 指定较小轮询间隔执行 watch | 实际按指定间隔轮询 |
| TC-TASK-012 | video.tasks | `--max-attempts` 生效并超时 | 有效 Key | 指定小次数 watch 长任务 | 达到次数后退出码 6 |
| TC-TASK-013 | video.tasks | 非 quiet 模式输出轮询日志 | 有效 Key | 执行 watch | stderr 输出 watching 信息 |
| TC-TASK-014 | video.tasks | `--quiet` 抑制轮询日志 | 有效 Key | watch 加 `--quiet` | 不输出 watching 日志 |

### 4.9 视频库与发布

#### 4.9.1 视频库查询 `video list`

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-VLIST-001 | video.list | 默认列表查询 | 有效 Key | 执行 `video list` | 返回视频列表 |
| TC-VLIST-002 | video.list | 使用 `examples/video-list.json` 查询 | 有效 Key | 执行 `video list --file examples/video-list.json` | 正确读取 body |
| TC-VLIST-003 | video.list | `--stdin` 查询 | 有效 Key | 通过 stdin 传入 JSON | 成功读取 |
| TC-VLIST-004 | video.list | 按 `--name` 过滤 | 有效 Key | 执行命令 | 请求体包含 `name` |
| TC-VLIST-005 | video.list | 按 `--source-type` 过滤 | 有效 Key | 执行命令 | 请求体包含 `sourceType` |
| TC-VLIST-006 | video.list | 按 `--task-ids` CSV 过滤 | 有效 Key | 传 `a,b,c` | 转为数组 |
| TC-VLIST-007 | video.list | 按 `--strategy-ids` CSV 过滤 | 有效 Key | 执行命令 | 转为数组 |
| TC-VLIST-008 | video.list | 按 `--business-ids` CSV 过滤 | 有效 Key | 执行命令 | 转为数组 |
| TC-VLIST-009 | video.list | 按 `--audit-status` CSV 过滤 | 有效 Key | 传 `1,2` | 转为数字数组 |
| TC-VLIST-010 | video.list | 按 `--label-ids` CSV 过滤 | 有效 Key | 执行命令 | 转为数组 |
| TC-VLIST-011 | video.list | 按 `--date-range` CSV 过滤 | 有效 Key | 执行命令 | 转为数组 |
| TC-VLIST-012 | video.list | 空结果集 | 查询无匹配 | 执行命令 | 输出 `0 videos found` |

#### 4.9.2 视频发布 `video publish`

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-VPUB-001 | video.publish | 用 `businessId` 发布成功 | 有效 videoId、businessId | 执行 `video publish --file examples/video-publish.json` | 发布提交成功；若接口未返回 `publishTaskId`，CLI 应允许显示为 `unknown` |
| TC-VPUB-001A | video.publish | 示例文件占位值需先替换 | 使用仓库示例文件 | 检查 `examples/video-publish.json` | `videoId/businessId` 为 `__REPLACE_WITH_...__` 占位符，避免误以为可直接发布 |
| TC-VPUB-002 | video.publish | 兼容旧字段 `accountId` | 构造仅含 `accountId` 的 JSON | 执行发布 | 自动映射为 `businessId` |
| TC-VPUB-003 | video.publish | 缺少输入文件 | 有效 Key | 不传 `--file/--stdin` | 提示缺少 JSON 输入 |
| TC-VPUB-004 | video.publish | 视频不存在 | 无效 videoId | 执行发布 | 返回接口错误 |
| TC-VPUB-005 | video.publish | 账号不存在 | 无效 businessId/accountId | 执行发布 | 返回接口错误 |
| TC-VPUB-006 | video.publish | JSON 模式输出 | 有效参数 | 追加 `--json` | 输出完整响应 |

#### 4.9.3 发布结果查询 `video data get`

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-VDATA-001 | video.data | 查询发布数据成功 | 有效 TikTok `videoId` | 执行 `video data get --id xxx` | 返回播放/点赞/评论/分享等数据 |
| TC-VDATA-002 | video.data | 未传 `--id` | 有效 Key | 执行命令 | 提示用法 |
| TC-VDATA-003 | video.data | 兼容 `data.data` 嵌套 | 接口数据嵌套 | 执行查询 | 正确读取字段 |
| TC-VDATA-004 | video.data | 部分统计字段缺失 | 接口缺某些字段 | 执行查询 | 仅输出存在字段，不报错 |

#### 4.9.4 一键工作流 `video run`

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-VRUN-001 | video.run | 创建成功并轮询成功 | 有效视频创建 payload | 执行 `video run --file payload.json` | 顺序完成 create -> watch -> library list |
| TC-VRUN-002 | video.run | 创建响应无 taskId | 模拟异常创建结果 | 执行命令 | 返回退出码 5 |
| TC-VRUN-003 | video.run | 轮询失败 | 创建成功但任务失败 | 执行命令 | 最终失败并返回异常状态 |
| TC-VRUN-004 | video.run | 自动上传字段在 run 中同样生效 | payload 含本地/远程素材 | 执行命令 | 先上传再创建 |
| TC-VRUN-005 | video.run | 最终视频库为空 | 创建完成但库中暂无视频 | 执行命令 | `latest_video_id` 为 `unknown` |

### 4.10 商品与发布策略 `publish`

#### 4.10.1 商品查询 `publish products`

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-PROD-001 | publish.products | 使用 `creator-user-open-id` 查询商品 | 有效 open id | 执行命令 | 返回商品列表 |
| TC-PROD-002 | publish.products | 使用 `account-id` 自动解析 open id | 有效 accountId | 执行命令 | 先查账户再自动带入 `creatorUserOpenId` |
| TC-PROD-003 | publish.products | 同时不传 `creator-user-open-id` 与 `account-id` | 有效 Key | 执行命令 | 提示用法 |
| TC-PROD-004 | publish.products | `account-id` 解析失败 | 无效 accountId | 执行命令 | 返回退出码 5 |
| TC-PROD-005 | publish.products | 传 `--file` 自定义 body | 有效 Key | 执行 `--file examples/publish-products.json` | 原样发送 body |
| TC-PROD-005A | publish.products | 示例文件使用显式占位符 | 使用仓库示例文件 | 检查 `examples/publish-products.json` | `creatorUserOpenId` 为 `__REPLACE_WITH_...__`，提示先填真实值 |
| TC-PROD-006 | publish.products | 传 `--stdin` 自定义 body | 有效 Key | stdin 传 JSON | 原样发送 body |
| TC-PROD-007 | publish.products | 空结果集 | 无商品数据 | 执行命令 | 输出 `0 products found` |

#### 4.10.2 策略列表/详情 `publish strategy list|get`

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-STR-001 | publish.strategy | 查询策略列表默认分页 | 有效 Key | 执行 `publish strategy list` | 返回策略列表 |
| TC-STR-002 | publish.strategy | 按 `--name` 查询 | 有效 Key | 执行命令 | 请求体含 `name` |
| TC-STR-003 | publish.strategy | 按 `--status` 查询 | 有效 Key | 执行命令 | `status` 转数字 |
| TC-STR-004 | publish.strategy | 按 `--business-id` 查询 | 有效 Key | 执行命令 | 请求体含 `businessId` |
| TC-STR-005 | publish.strategy | 按 `--date-range` CSV 查询 | 有效 Key | 执行命令 | 转为数组 |
| TC-STR-006 | publish.strategy | 排序参数传递 | 有效 Key | 传 `--sort --order` | 请求体正确 |
| TC-STR-007 | publish.strategy | 列表状态兼容显示 | 接口返回布尔/数值/字符串状态 | 执行命令 | 输出 `enabled/disabled` |
| TC-STR-008 | publish.strategy | 查询策略详情成功 | 有效 `strategy_id` | 执行 `publish strategy get --id xxx` | 返回详情 |
| TC-STR-009 | publish.strategy | 未传 `--id` 查详情 | 有效 Key | 执行命令 | 提示用法 |
| TC-STR-010 | publish.strategy | 策略不存在 | 无效 `strategy_id` | 执行命令 | 返回接口错误 |

#### 4.10.3 策略创建/启停/删除

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-STR-101 | publish.strategy | 使用原始 body 创建策略 | 有效模板、账号 | 执行 `publish strategy create --file examples/publish-strategy-template.json` | 返回 `strategy_id` |
| TC-STR-101A | publish.strategy | 示例模板占位值需先替换 | 使用仓库示例文件 | 检查 `examples/publish-strategy-template.json` | `businessId/template` 使用 `__REPLACE_WITH_...__` 占位符，`date` 保持合法日期以通过本地校验 |
| TC-STR-102 | publish.strategy | 兼容旧版 `strategyCreateDTO` 包装 | 准备包装 JSON | 执行创建 | 自动解包 |
| TC-STR-103 | publish.strategy | 缺少输入文件 | 有效 Key | 不传 `--file/--stdin` | 提示缺少 JSON 输入 |
| TC-STR-103A | publish.strategy | `productAnchorStatus=true` 时 `pushConfig.productLinkInfo` 必填 | 有效 Key | 构造开启挂车但缺少 `productLinkInfo` 的请求 | 按文档返回明确校验错误 |
| TC-STR-103B | publish.strategy | 策略挂车信息需包含 `title`，`productAnchorTitle` 为可选 | 有效 Key | 构造缺少 `title` 或超长 `productAnchorTitle` 的请求 | 按文档返回明确校验错误 |
| TC-STR-104 | publish.strategy | 启用策略成功 | 有效 `strategy_id` | 执行 `publish strategy enable --id xxx` | 调用 toggle 接口并返回启用状态 |
| TC-STR-105 | publish.strategy | 禁用策略成功 | 有效 `strategy_id` | 执行 `publish strategy disable --id xxx` | 调用 toggle 接口并返回禁用状态 |
| TC-STR-106 | publish.strategy | 启用已启用策略幂等 | 策略已启用 | 重复执行 enable | 仍安全返回 |
| TC-STR-107 | publish.strategy | 禁用已禁用策略幂等 | 策略已禁用 | 重复执行 disable | 仍安全返回 |
| TC-STR-108 | publish.strategy | 启用缺少 `--id` | 有效 Key | 执行 enable | 提示用法 |
| TC-STR-109 | publish.strategy | 禁用缺少 `--id` | 有效 Key | 执行 disable | 提示用法 |
| TC-STR-110 | publish.strategy | 删除策略成功 | 有效 `strategy_id` | 执行 delete | 删除成功 |
| TC-STR-111 | publish.strategy | 删除缺少 `--id` | 有效 Key | 执行 delete | 提示用法 |
| TC-STR-112 | publish.strategy | 删除不存在策略 | 无效 `strategy_id` | 执行 delete | 返回接口错误 |

#### 4.10.4 发布记录与一键运行

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-REC-001 | publish.records | 默认查询发布记录 | 有效 Key | 执行 `publish records` | 返回记录列表 |
| TC-REC-002 | publish.records | 使用 `examples/publish-records.json` 查询 | 有效 Key | 执行 `--file` | 按文件体查询 |
| TC-REC-003 | publish.records | 传 `strategy-id` 过滤 | 有效 Key | 执行命令 | 请求体含 `strategyId` |
| TC-REC-004 | publish.records | 传 `business-id` 过滤 | 有效 Key | 执行命令 | 请求体含 `businessId` |
| TC-REC-005 | publish.records | 传 `status` 过滤 | 有效 Key | 执行命令 | `status` 转数字 |
| TC-REC-006 | publish.records | 传 `work-type` CSV | 有效 Key | 传 `A,B` | 转数组 |
| TC-REC-007 | publish.records | 传 `start-time/end-time` | 有效 Key | 执行命令 | 请求体正确 |
| TC-REC-008 | publish.records | 空结果集 | 无数据 | 执行命令 | 输出 `0 publish records found` |
| TC-RUN-001 | publish.run | 创建策略并启用成功 | 有效策略 body | 执行 `publish run --file xxx.json` | 顺序完成 create -> enable |
| TC-RUN-002 | publish.run | 创建成功但无 strategyId | 模拟异常响应 | 执行命令 | 返回退出码 5 |
| TC-RUN-003 | publish.run | 启用返回状态识别 | 接口返回 bool/num/string 状态 | 执行命令 | 正确格式化启用状态 |

### 4.11 原始接口调用 `raw`

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-RAW-001 | raw | GET 调用成功 | 有效 Key | 执行 `raw get /check` | 返回 JSON 响应 |
| TC-RAW-002 | raw | POST 调用成功 | 有效 Key | 执行 `raw post /xxx --file payload.json` | 成功返回 JSON |
| TC-RAW-003 | raw | PUT 调用成功 | 有效 Key | 执行 `raw put /xxx --file payload.json` | 成功返回 JSON |
| TC-RAW-004 | raw | PATCH 调用成功 | 有效 Key | 执行 `raw patch /xxx --file payload.json` | 成功返回 JSON |
| TC-RAW-005 | raw | DELETE 调用成功 | 有效 Key | 执行 `raw delete /xxx` | 成功返回 JSON |
| TC-RAW-006 | raw | path 不带 `/` 自动补齐 | 有效 Key | 执行 `raw get check` | 实际请求 `/check` |
| TC-RAW-007 | raw | GET 不读取 body | 有效 Key | `raw get /check --file payload.json` | 不应发送 body |
| TC-RAW-008 | raw | 非 GET 且未提供 body | 有效 Key | 执行 `raw post /xxx` | 允许空 body 请求 |
| TC-RAW-009 | raw | 缺少 path | 有效 Key | 执行 `raw get` | 提示用法 |
| TC-RAW-010 | raw | method 非法 | 有效 Key | 执行 `raw options /check` | 提示用法 |
| TC-RAW-011 | raw | 输出强制为 JSON | 有效 Key | 不追加 `--json` 执行 raw | 仍返回 JSON 结构 |

### 4.12 Shell 补全 `completion`

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-COMP-001 | completion | 生成 zsh 补全 | 无 | 执行 `completion zsh` | 输出 zsh 脚本 |
| TC-COMP-002 | completion | 生成 bash 补全 | 无 | 执行 `completion bash` | 输出 bash 脚本 |
| TC-COMP-003 | completion | 生成 fish 补全 | 无 | 执行 `completion fish` | 输出 fish 脚本 |
| TC-COMP-004 | completion | 未知 shell | 无 | 执行 `completion powershell` | 输出帮助 |

### 4.13 输出、日志与通用异常

| 编号 | 模块 | 场景 | 前置条件 | 操作步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| TC-GEN-001 | 通用 | `--json` 模式成功输出结构一致 | 有效 Key | 对多个命令分别追加 `--json` | 均含 `ok/command/data` |
| TC-GEN-002 | 通用 | 文本模式输出可读性 | 有效 Key | 执行多个列表/详情命令 | 输出无异常字段拼接 |
| TC-GEN-003 | 通用 | 接口返回非 JSON 文本 | 模拟非 JSON 响应 | 执行请求命令 | 失败时能读取原始文本并报错 |
| TC-GEN-004 | 通用 | 服务端 500 | 模拟服务端异常 | 执行命令 | 返回退出码 4 |
| TC-GEN-005 | 通用 | 网络不可达 | 断网或错误域名 | 执行命令 | 返回 `Request failed`，退出码 4 |
| TC-GEN-006 | 通用 | `--quiet` 对普通成功输出无副作用 | 有效 Key | 执行命令 | 正常输出结果，仅压制过程日志 |
| TC-GEN-007 | 通用 | 中文/长文本 prompt 提交 | 有效 Key | 创建视频时使用长中文 prompt | 本地不应截断或乱码 |
| TC-GEN-008 | 通用 | 多层嵌套响应字段解析 | 接口嵌套对象返回 | 执行详情或状态查询 | `findDeepValue` 可正确取值 |

## 5. 建议优先级

### P0 必测

- 安装与启动可用
- `auth set-key/status/check/profile/test`
- `video upload`
- `video create` 正常流程
- `video create` 关键本地校验
- `video tasks get/watch`
- `video list`
- `video publish`
- `publish strategy create/enable/disable/delete`
- `publish products`
- `raw get/post`

### P1 高优先

- 自动上传本地/远程素材
- `video run` / `publish run`
- 字段兼容：`formData`、`request`、`strategyCreateDTO`、`accountId -> businessId`
- 分页、过滤、CSV 参数转换
- 状态值兼容：布尔/数字/字符串

### P2 补充覆盖

- 空结果集
- `--quiet`
- `completion`
- 极限边界值与异常网络场景

## 6. 建议的执行分层

### 6.1 冒烟测试

- CLI 启动
- 配置 Key
- 鉴权检查
- 上传一张图片
- 创建一个视频任务
- 查询任务结果
- 查询视频库
- 创建并启用一个策略

### 6.2 集成测试

- 自动上传本地/远程素材后的视频创建
- 视频发布全链路
- 商品查询与账号映射
- 策略创建、启停、删除、记录查询

### 6.3 回归测试

- 所有参数校验
- 所有兼容字段映射
- 所有输出格式
- 错误码与异常处理

## 7. 后续补充建议

- 建议把上述用例进一步拆成“接口层”和“CLI 交互层”两份。
- 建议为 `video create`、`publish strategy create`、`raw` 增加自动化回归脚本。
- 建议增加一份“测试数据矩阵”，统一维护可复用的账号、模板、商品、视频与策略 ID。

## 8. 本轮实测记录

### 8.1 实测范围

- 按用户要求，本轮已实测非策略、非视频发布功能。
- 策略相关命令与 `video publish`、`video data get`、`publish products`、`publish records`、`publish run` 未纳入本轮实际执行。

### 8.2 实测环境

- 工作目录：`/Users/ducky/Projects/BeervidCli`
- 实际使用 Node：`/opt/homebrew/bin/node v25.8.1`
- API 地址：`https://open.beervid.ai`
- 执行日期：2026-03-25

### 8.3 已实测通过

| 编号 | 命令 | 结果摘要 |
| --- | --- | --- |
| R-001 | `auth status` | 成功，正确显示已配置状态与脱敏 API Key |
| R-002 | `auth check` | 成功，返回 `authenticated` 与用户名 |
| R-003 | `auth profile` | 成功，返回用户资料与会员信息 |
| R-004 | `auth test` | 成功，同时验证 `/check` 与 `/profile` |
| R-005 | `completion zsh` | 成功，输出 zsh completion 脚本 |
| R-006 | `accounts list --size 3` | 成功，返回账户列表 |
| R-007 | `accounts shoppable --size 3` | 成功，返回 1 个可售账号 |
| R-008 | `labels list` | 成功，返回 2 个标签 |
| R-009 | `templates list` | 成功，返回 114 个模板 |
| R-010 | `templates get --id 019d1f51-57e0-7557-bb93-12e4c51f39cd` | 成功，返回模板详情 |
| R-011 | `raw get /check` | 成功，返回 JSON 响应 |
| R-012 | `video tasks list --size 5 --json` | 成功，返回任务列表 |
| R-013 | `video tasks get --task-id 019d2286-bc05-73b2-85fd-89985acb9e60` | 成功，状态为 `1 (completed)` |
| R-014 | `video tasks watch --task-id 019d2286-bc05-73b2-85fd-89985acb9e60 --max-attempts 1` | 成功，立即识别为完成态 |
| R-015 | `video list --size 3` | 成功，返回视频库列表 |
| R-016 | `video upload --path /tmp/beervid-test-1x1.png --type image` | 成功，上传并返回 `file_url` |
| R-017 | `video create --file ./examples/video-create.json` | 成功，返回可识别的 `task_id` |
| R-018 | `video create --file /tmp/beervid-invalid-video.json` | 成功拦截非法参数，报 `LONG_TAKE` 校验错误 |
| R-019 | `labels list --config-path /tmp/beervid-empty-config.json` | 成功验证缺少 API Key 时退出码为 2 |

### 8.4 本轮修复并复测通过

| 编号 | 问题 | 修复结果 |
| --- | --- | --- |
| F-001 | `video create` 成功后文本输出中 `task_id: unknown` | 已修复，现可从字符串型响应中提取任务 ID |
| F-002 | `video upload` 文本输出中 `file_url: [object Object]` | 已修复，现正确输出真实 `file_url` |
