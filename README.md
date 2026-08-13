# 交通可信协同平台前端技术文档

本文档用于帮助新成员快速了解 `traffic-model-blockchain-web` 前端项目的技术栈、功能模块、接口流向和本地启动方式。

## 1. 项目概览

本项目是基于 Vue 2 的交通可信协同平台前端，主体能力来自 WeCross 管理端，并扩展了“跨链可信验证”业务模块。系统通过登录态访问 WeCross Router，同时通过独立代理访问本地可信验证后端。

核心技术栈：

| 类型 | 选型 |
| --- | --- |
| 前端框架 | Vue 2.6 |
| UI 组件 | Element UI 2.13 |
| 路由 | vue-router 3 |
| 状态管理 | Vuex 3 |
| HTTP | axios |
| 构建工具 | Vue CLI 4 |
| 代码检查 | ESLint |

主要命令：

```bash
npm run dev
npm run lint
npm run build:prod
npm run test:unit
```

## 2. 本地启动

常规启动方式：

```bash
npm install
npm run dev
```

默认开发端口为 `9528`，配置位于 `vue.config.js`。如果使用仓库内 PowerShell 脚本，可执行：

```powershell
.\start-frontend.ps1 -Port 9528 -VerificationTarget http://127.0.0.1:8088
```

停止指定端口的前端进程：

```powershell
.\stop-frontend.ps1 -Port 9528
```

注意：`start-frontend.ps1` 默认使用脚本内配置的 `NodeHome`，如果本机 Node.js 路径不同，需要通过 `-NodeHome` 指定有效目录。

## 3. 代理与运行环境

开发环境代理在 `vue.config.js` 中配置：

| 前缀 | 默认目标 | 用途 |
| --- | --- | --- |
| `/api/cross-verification` | `http://127.0.0.1:8088` | 新版跨链可信验证后端 |
| `/api/verification` | `http://127.0.0.1:8088` | 旧版验证后端兼容接口 |
| `/` | `http://175.178.222.73:8250` | WeCross Router |

`/api/cross-verification` 与 `/api/verification` 的目标可通过环境变量 `VUE_APP_VERIFICATION_TARGET` 覆盖。生产环境 `VUE_APP_BASE_API=/`，开发环境 `VUE_APP_BASE_API=''`。

## 4. 目录结构

| 路径 | 说明 |
| --- | --- |
| `src/main.js` | 应用入口，加载 Element UI、路由、Vuex、全局样式 |
| `src/permission.js` | 登录态、角色与动态路由拦截 |
| `src/router/index.js` | 菜单与页面路由定义 |
| `src/store/` | Vuex 状态，包含用户、权限、交易等模块 |
| `src/utils/request.js` | axios 实例、Authorization 注入、统一错误处理 |
| `src/api/` | 后端接口封装 |
| `src/views/` | 页面模块 |
| `src/components/` | 通用业务组件 |
| `src/styles/` | 全局样式与 Element UI 覆盖 |
| `mock/` | 本地 mock 服务 |
| `docs/` | 辅助文档与测试说明 |

## 5. 登录与权限

登录流程位于 `src/views/login/index.vue`、`src/store/modules/user.js` 和 `src/api/user.js`。

基本流程：

1. 登录页获取公钥、验证码等认证材料。
2. 用户名密码等参数经 RSA 加密后提交到 `/auth/login`。
3. 登录成功后保存 `credential` 到本地 token。
4. `src/permission.js` 根据 token 放行路由，并通过 `routerStatus()`、`listAccount()` 判断用户角色。
5. `src/store/modules/permission.js` 根据 `admin` 或 `user` 过滤动态菜单。

所有需要登录的请求都会在 `src/utils/request.js` 中自动注入：

```text
Authorization: 当前 credential
Accept: application/json
content-type: application/json;charset=UTF-8
```

## 6. 功能模块

### 6.1 平台首页

入口：`/home`

主要文件：

| 文件 | 作用 |
| --- | --- |
| `src/views/homepage/index.vue` | 平台首页和运行概览 |
| `src/api/status.js` | 系统状态、Router 状态、支持的 Stub 类型 |

### 6.2 身份凭证

入口：`/account/index`

主要能力：

- 查看链账户列表。
- 添加、删除链账户。
- 设置默认链账户。
- 修改密码。

主要文件：

| 文件 | 作用 |
| --- | --- |
| `src/views/account/index.vue` | 链账户管理 |
| `src/views/account/changePassword.vue` | 修改密码 |
| `src/api/ua.js` | 用户账户、链账户、访问控制 API |

### 6.3 数据资产

入口：`/resource/resourceList`

主要能力：

- 浏览 WeCross 资源树。
- 查看资源详情。
- 登记或部署 BCOS、Fabric 资源。
- 支持共享与资源操作相关页面跳转。

主要文件：

| 文件 | 作用 |
| --- | --- |
| `src/views/resource/resourceManager.vue` | 数据资产列表与资源管理 |
| `src/views/resource/resourceDeployment.vue` | 资源登记或部署 |
| `src/api/resource.js` | 资源列表、详情、部署、登记、链码操作接口 |
| `src/components/ResourceExplorer/` | 资源选择与浏览组件 |

### 6.4 共享审计

入口：`/transaction/transactionList`

主要能力：

- 查询资源交易列表。
- 查看交易详情。
- 发起资源调用或共享相关操作。

主要文件：

| 文件 | 作用 |
| --- | --- |
| `src/views/transaction/transactionManager.vue` | 共享审计列表 |
| `src/views/transaction/rawTransaction.vue` | 发起交易 |
| `src/api/transaction.js` | 合约调用、交易发送、交易列表与详情接口 |

### 6.5 跨域协同

入口：`/xaTransaction/xaTransactionList`

主要能力：

- 查询 XA 跨链事务。
- 创建协同任务。
- 执行开始、提交、回滚等 XA 操作。

主要文件：

| 文件 | 作用 |
| --- | --- |
| `src/views/transaction/xaTransactionList.vue` | 跨域协同列表 |
| `src/views/transaction/xaTransaction.vue` | 创建协同任务 |
| `src/api/transaction.js` | XA 事务接口封装 |

### 6.6 权限管理

入口：`/admin/index`

仅 `admin` 角色可见。主要用于查询和配置用户可访问的链路径。

主要文件：

| 文件 | 作用 |
| --- | --- |
| `src/views/access/index.vue` | 权限管理页面 |
| `src/api/ua.js` | 访问控制列表查询与提交 |

### 6.7 旧版跨链验证

入口：`/verification/index`

这是旧版验证工作台，对应接口位于 `src/api/verification.js`，包含：

- `GET /api/verification/health`
- `POST /api/verification/merkle`
- `POST /api/verification/groth16`
- `POST /api/verification/threshold-signature`
- `POST /api/verification/full`

该页面仍保留为兼容参考，不建议在新版模块稳定前删除。

## 7. 跨链可信验证模块

入口：`/cross-verification`

子页面：

| 路由 | 页面 | 文件 |
| --- | --- | --- |
| `/cross-verification/merkle` | Merkle验证 | `src/views/crossVerification/merkle.vue` |
| `/cross-verification/zkp` | ZKP验证 | `src/views/crossVerification/zkp.vue` |
| `/cross-verification/threshold-signature` | 门限阈值签名 | `src/views/crossVerification/thresholdSignature.vue` |
| `/cross-verification/records` | 验证记录 | `src/views/crossVerification/records.vue` |

### 7.1 接口封装

文件：`src/api/crossVerification.js`

| 方法 | 接口 |
| --- | --- |
| `getCrossVerificationHealth()` | `GET /api/cross-verification/health` |
| `verifyMerkle(data)` | `POST /api/cross-verification/merkle/verify` |
| `verifyZkp(data)` | `POST /api/cross-verification/zkp/verify` |
| `verifyThresholdSignature(data)` | `POST /api/cross-verification/threshold-signature/verify` |
| `listVerificationRecords(params)` | `GET /api/cross-verification/records` |
| `getVerificationRecord(recordId)` | `GET /api/cross-verification/records/{recordId}` |
| `updateVerificationRecordLedger(recordId, data)` | `PUT /api/cross-verification/records/{recordId}/ledger` |

### 7.2 Merkle验证

页面能力：

- 支持手动输入数据或上传文件。
- 文本文件按非空行拆分；二进制文件按 `64 KiB` 切块并转 Base64。
- 文件大小限制为 `10 MiB`。
- 支持业务标识、抽样索引、期望 Merkle Root。
- 调用 `verifyMerkle()` 完成后端验证。
- 验证通过后，前端会把记录写入 `bcos3` 可信账本，再通过 `fabric` 发起跨链查询并等待回调。
- 最终通过 `updateVerificationRecordLedger()` 回写账本与跨链状态。

请求体核心字段：

```json
{
  "businessId": "traffic-batch-001",
  "leafItems": ["record-1", "record-2"],
  "expectedRoot": "可选，64 位十六进制字符串",
  "sampleIndex": 0,
  "writeLedger": false
}
```

### 7.3 ZKP验证

页面能力：

- 支持业务标识、零知识证明规则、Groth16 证明值、公开条件值、公开条件 Hash。
- 证明值和公开条件支持粘贴 JSON、上传文件、填入示例。
- 调用 `verifyZkp()` 完成后端验证。
- 验证通过后复用 `syncCrossChainVerification()` 执行可信账本写入、Fabric 跨链验证和记录回写。

请求体核心字段：

```json
{
  "businessId": "traffic-proof-001",
  "circuitId": "traffic-speed-range-v1",
  "proof": {},
  "publicSignals": {},
  "publicInputHash": "可选，64 位十六进制字符串",
  "writeLedger": false,
  "ledgerTargets": []
}
```

### 7.4 门限阈值签名

页面能力：

- 支持业务标识、待签名业务内容、总节点数、签名阈值、参与节点编号、门限签名数据。
- 校验阈值不能超过总节点数，参与节点不能重复，参与节点数量不能小于阈值。
- 签名数据优先按 JSON 解析，解析失败时作为普通字符串提交。
- 调用 `verifyThresholdSignature()` 完成后端验证。
- 验证通过后同样复用 `syncCrossChainVerification()` 完成账本同步和跨链验证。

请求体核心字段：

```json
{
  "businessId": "traffic-signature-001",
  "message": "traffic speed range approved",
  "threshold": 3,
  "totalNodes": 5,
  "participantIds": [1, 2, 4],
  "signatureBundle": {},
  "writeLedger": false,
  "ledgerTargets": []
}
```

### 7.5 验证记录

页面能力：

- 从后端 `GET /api/cross-verification/records` 读取记录。
- 支持按验证方式、业务标识、验证状态筛选。
- 支持分页、刷新、查看详情、复制记录 ID、复制完整详情 JSON。
- 当前记录页只绑定服务端记录，不再合并浏览器本地历史。
- 分页响应兼容 `records`、`list`、`content`、`data.records`、`data.list`、`data.content`，总数字段兼容 `total`、`totalElements`、`totalCount`、`count`。

查询参数示例：

```json
{
  "page": 1,
  "size": 10,
  "verifyType": "MERKLE",
  "businessId": "traffic-batch-001",
  "status": "PASS"
}
```

### 7.6 可信账本与跨链调用

相关文件：

| 文件 | 作用 |
| --- | --- |
| `src/api/trafficVerifyChain.js` | WeCross 资源调用、账本写入、跨链查询、回调轮询 |
| `src/views/crossVerification/utils/crossChainVerification.js` | ZKP 与多方签名共用的跨链同步流程 |

固定资源路径：

```js
BCOS3_VERIFY_PATH = 'payment.bcos3.TrafficVerifyStore'
FABRIC_VERIFY_PATH = 'payment.fabric.traffic_verify_store'
```

统一流程：

1. 后端验证接口返回 `PASS`。
2. 前端构造链上记录。
3. 写入 `payment.bcos3.TrafficVerifyStore`。
4. 轮询确认 `bcos3` 记录可查。
5. 通过 `payment.fabric.traffic_verify_store` 发起跨链查询。
6. 轮询 Fabric 回调结果。
7. 将账本状态、交易哈希、跨链状态回写后端记录。

## 8. 重要状态约定

验证状态：

| 状态 | 含义 |
| --- | --- |
| `PASS` | 验证通过 |
| `FAIL` | 验证未通过 |
| `ERROR` | 验证异常 |

可信账本状态：

| 状态 | 含义 |
| --- | --- |
| `SUCCESS` / `LEDGER_SUCCESS` | 已同步可信账本 |
| `FAILED` / `LEDGER_FAILED` | 同步失败 |
| `PENDING` | 同步中或待确认 |
| `DISABLED` | 未启用同步 |

跨链状态：

| 状态 | 含义 |
| --- | --- |
| `SUCCESS` | 跨链成功 |
| `FAILED` | 跨链失败 |
| `PENDING` | 跨链中 |

## 9. 二次开发注意事项

- 新页面优先在 `src/router/index.js` 添加路由，并配置 `meta.roles`。
- 所有接口优先放在 `src/api/` 下，通过 `@/utils/request` 统一请求。
- 业务页面不要直接绕过 `src/utils/request.js`，否则会丢失登录凭证和统一错误处理。
- 开发跨链可信验证功能时，应区分“链下验证结果”“可信账本同步结果”“Fabric 跨链验证结果”，不要合并成单一状态。
- 记录页当前以服务端记录为准，若后端没有持久化记录，页面不会自动显示浏览器本地历史。
- 本项目使用 hash 路由，浏览器地址通常为 `/#/cross-verification/merkle` 这类形式。
- 如果出现 `401 Unauthorized` 或 `Login check failed`，优先检查 WeCross Router 登录态、凭证和链账户配置。

## 10. 推荐检查清单

提交或交接前建议执行：

```bash
npm run lint
npm run build:prod
```

跨链可信验证联调前建议确认：

1. 前端开发服务已启动，默认端口 `9528`。
2. 可信验证后端已启动，默认地址 `http://127.0.0.1:8088`。
3. `GET /api/cross-verification/health` 可访问。
4. WeCross Router 可访问且浏览器登录态有效。
5. `payment.bcos3.TrafficVerifyStore` 与 `payment.fabric.traffic_verify_store` 资源路径存在。
6. 当前用户链账户具备写入和跨链查询权限。
