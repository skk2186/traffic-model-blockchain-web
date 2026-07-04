# 跨链可信验证模块交接说明

本文档用于交接当前前端项目中的“跨链可信验证”模块，仅保留当前模块的实现现状、代码入口、接口约定、已完成范围、待完成事项和后续推进建议。

## 1. 当前结论

跨链可信验证模块目前已经完成最基础的前端界面、菜单路由、REST 接口封装、公共结果展示组件和静态构建验证。当前代码适合作为下一阶段联调和功能补全的起点，但还不能视为完整上线版本。

目前已经形成四个子模块：

1. 数据完整性验证
2. 隐私证明验证
3. 多方签名验证
4. 验证记录

其中“数据完整性验证”完成度最高，已经包含本地验证、结果展示、写入 `bcos3` 可信账本、通过 `fabric` 发起跨链查询和等待回调结果的完整前端流程。“隐私证明验证”和“多方签名验证”已经完成基础表单、参数校验、接口调用和结果展示，但可信账本同步目前主要依赖后端按 `writeLedger` 与 `ledgerTargets` 参数处理，前端没有像 Merkle 一样自行补齐链上写入和跨链回调流程。

## 2. 模块入口

### 2.1 新版入口

新版模块入口为：

```text
/cross-verification
```

四个子页面如下：

```text
/cross-verification/merkle
/cross-verification/zkp
/cross-verification/threshold-signature
/cross-verification/records
```

对应业务名称：

| 路由 | 页面名称 | 说明 |
| --- | --- | --- |
| `/cross-verification/merkle` | 数据完整性验证 | 基于 Merkle Root 验证交通数据批次、文件或记录集合是否一致 |
| `/cross-verification/zkp` | 隐私证明验证 | 验证零知识证明或隐私证明是否满足指定约束 |
| `/cross-verification/threshold-signature` | 多方签名验证 | 验证多参与方签名是否满足阈值要求 |
| `/cross-verification/records` | 验证记录 | 查询验证结果、账本同步状态和详情 JSON |

### 2.2 旧版入口

旧版验证工作台仍保留：

```text
/verification/index
```

菜单标题已调整为：

```text
旧版跨链验证
```

保留旧版入口的原因是避免新旧接口迁移期间直接破坏原有验证工作台。后续如果新版模块完全稳定，再决定是否隐藏或移除旧版页面。

## 3. 代码文件清单

### 3.1 路由与代理

| 文件 | 当前作用 |
| --- | --- |
| `src/router/index.js` | 新增“跨链可信验证”一级菜单和四个子路由；同时保留旧版验证入口 |
| `vue.config.js` | 为 `/api/cross-verification` 增加开发代理，默认指向 `http://127.0.0.1:8088` |

`vue.config.js` 中与当前模块相关的代理目标：

```js
'/api/cross-verification' -> 'http://127.0.0.1:8088'
'/api/verification'       -> process.env.VUE_APP_VERIFICATION_TARGET || 'http://127.0.0.1:8088'
'/'                       -> process.env.VUE_APP_ROUTER_TARGET || 'http://175.178.222.73:8250'
```

含义：

- `/api/cross-verification`：新版跨链可信验证服务。
- `/api/verification`：旧版链下验证或兼容验证服务。
- `/`：原 WeCross Router 代理，默认指向远程 `8250`。

### 3.2 API 封装

| 文件 | 当前作用 |
| --- | --- |
| `src/api/crossVerification.js` | 新版验证服务 REST 接口封装 |
| `src/api/trafficVerifyChain.js` | WeCross 资源调用、交易发送、账本记录写入、跨链查询、回调轮询 |

`src/api/crossVerification.js` 当前封装的接口：

| 方法 | HTTP 接口 | 用途 |
| --- | --- | --- |
| `getCrossVerificationHealth()` | `GET /api/cross-verification/health` | 检查新版验证服务是否可用 |
| `verifyMerkle(data)` | `POST /api/cross-verification/merkle/verify` | 执行数据完整性验证 |
| `verifyZkp(data)` | `POST /api/cross-verification/zkp/verify` | 执行隐私证明验证 |
| `verifyThresholdSignature(data)` | `POST /api/cross-verification/threshold-signature/verify` | 执行多方签名验证 |
| `listVerificationRecords(params)` | `GET /api/cross-verification/records` | 查询验证记录列表 |
| `getVerificationRecord(recordId)` | `GET /api/cross-verification/records/{recordId}` | 查询单条验证记录详情 |

`src/api/trafficVerifyChain.js` 当前使用的验证合约资源路径：

```js
BCOS3_VERIFY_PATH = 'payment.bcos3.TrafficVerifyStore'
FABRIC_VERIFY_PATH = 'payment.fabric.traffic_verify_store'
```

当前支持的验证类型：

```js
MERKLE
ZKP
THRESHOLD_SIGNATURE
```

该文件中较关键的方法：

| 方法 | 用途 |
| --- | --- |
| `buildRecordKey(businessId, verifyType)` | 生成链上记录 key，格式为 `业务标识:验证类型` |
| `writeVerifyRecord(chain, businessId, verifyType, record)` | 将验证记录写入指定链上的验证合约 |
| `getVerifyRecord(chain, businessId, verifyType)` | 从指定链上查询验证记录 |
| `interchainQueryRecord(fromChain, targetChain, businessId, verifyType)` | 从一条链发起跨链查询另一条链上的验证记录 |
| `getLastCallbackResult(chain)` | 查询指定链上的最近跨链回调结果 |
| `waitLastCallbackResult(chain, options)` | 轮询等待跨链回调结果 |

### 3.3 页面文件

| 文件 | 子模块 | 当前完成度 |
| --- | --- | --- |
| `src/views/crossVerification/merkle.vue` | 数据完整性验证 | 较完整 |
| `src/views/crossVerification/zkp.vue` | 隐私证明验证 | 基础完成，需继续联调 |
| `src/views/crossVerification/thresholdSignature.vue` | 多方签名验证 | 基础完成，需继续联调 |
| `src/views/crossVerification/records.vue` | 验证记录 | 基础完成，依赖后端记录接口 |

### 3.4 公共组件

| 文件 | 当前作用 |
| --- | --- |
| `src/views/crossVerification/components/VerificationResultPanel.vue` | 通用验证结果展示面板，用于 ZKP 和多方签名，也兼容 Merkle、阈值签名的部分字段 |
| `src/views/crossVerification/components/LedgerTargetSelector.vue` | 可信账本同步目标选择器，支持选择协同网络和验证合约资源 |
| `src/views/crossVerification/components/JsonResultDialog.vue` | 完整 JSON 结果弹窗，支持复制全部 |

### 3.5 工具文件

| 文件 | 当前作用 |
| --- | --- |
| `src/views/crossVerification/utils/fileChunkUtils.js` | 文件大小限制、文本按行切块、二进制按 64 KiB 切块、Base64 编码、文件读取 |
| `src/views/crossVerification/utils/verificationUtils.js` | 64 位十六进制校验、状态格式化、复制文本、最近记录 localStorage 缓存 |
| `src/views/crossVerification/styles/common.scss` | 跨链可信验证模块公共样式 |

## 4. 子模块完成情况

### 4.1 数据完整性验证

页面文件：

```text
src/views/crossVerification/merkle.vue
```

当前已完成：

- 支持手动输入交通数据记录。
- 支持上传文件。
- 文本文件按非空行切分为 Merkle 叶子。
- 非文本文件按 `64 KiB` 分块并进行 Base64 编码。
- 限制文件最大 `10 MiB`。
- 支持展示文件名、文件大小、叶子数量、解析方式。
- 支持业务标识输入和自动生成。
- 支持抽样索引输入，并校验抽样索引必须小于叶子数量。
- 支持期望 Merkle Root 输入，并校验必须是 64 位十六进制字符串。
- 调用 `verifyMerkle(payload)` 执行后端验证。
- 对后端结果进行字段归一化，兼容 `merkleRoot`、`rootHash`、`resultHash` 等字段。
- 支持展示验证状态、记录 ID、算法、业务标识、可信账本资源、Merkle Root、输入摘要、证明哈希、结果哈希、抽样叶子、交易哈希等信息。
- 验证结果支持完整 JSON 查看。
- 验证结果支持复制关键哈希值。
- 验证通过后，前端会构造链上记录并写入 `bcos3`。
- 写入 `bcos3` 后，会等待链上记录可查询。
- 之后通过 `fabric` 发起跨链查询。
- 最后轮询 `fabric` 回调结果，确认是否查询到 `bcos3` 上的验证记录。
- 成功、失败、等待、异常状态均有页面提示。
- 每次验证结果会通过 `saveRecentRecord(buildLocalRecord(result))` 写入 localStorage 最近记录。

当前 Merkle 请求体大致结构：

```json
{
  "businessId": "traffic-batch-001",
  "leafItems": ["record-1", "record-2"],
  "expectedRoot": "可选，64位十六进制字符串",
  "sampleIndex": 0,
  "writeLedger": false
}
```

注意：

- `writeLedger` 当前传给后端为 `false`，因为 Merkle 页面在后端验证通过后由前端自行执行可信账本同步。
- 当前默认同步目标固定为 `bcos3`，验证发起链固定为 `fabric`。
- 当前资源路径固定在 `trafficVerifyChain.js` 中，未做页面可配置。

后续建议：

- 确认后端 Merkle 返回字段是否长期稳定。
- 确认 `leafItems` 对大文件的处理是否满足业务和性能要求。
- 确认 `expectedRoot` 比对逻辑是在后端完成，还是需要前端补充提示。
- 确认真实链上 `TrafficVerifyStore` 的 `setRecord`、`getRecordWithStatus`、`interchain`、`callback`、`getLastCallbackResult` 方法签名与前端一致。
- 如果后端已经具备统一账本同步能力，可以考虑将 Merkle 也迁移为后端同步，减少前端直接操作链上合约的复杂度。

### 4.2 隐私证明验证

页面文件：

```text
src/views/crossVerification/zkp.vue
```

当前已完成：

- 支持业务标识输入。
- 算法固定展示为 `Groth16`。
- 支持电路标识输入。
- 支持三种证明数据输入方式：粘贴 JSON、上传证明文件、使用示例证明。
- 上传证明文件支持 `.json` 和 `.txt`。
- 会校验证明数据必须是合法 JSON 且不能为空。
- 支持公开输入 JSON 输入。
- 支持公开输入 Hash 输入，并校验为 64 位十六进制字符串。
- 支持通过 `LedgerTargetSelector` 选择是否同步到可信账本。
- 若开启可信账本同步但未选择目标资源，会阻止提交并提示。
- 调用 `verifyZkp(payload)` 执行后端验证。
- 对后端结果进行字段归一化，兼容 `detail.proofSummary.proofHash`、`detail.proofHash`、`response.proofHash` 等字段。
- 使用 `VerificationResultPanel` 展示记录 ID、验证方式、业务标识、算法、验证状态、电路标识、证明 Hash、公开输入 Hash、结果 Hash、账本同步状态、交易哈希等信息。
- 支持完整 JSON 弹窗查看。
- 每次验证结果会写入 localStorage 最近记录。

当前 ZKP 请求体大致结构：

```json
{
  "businessId": "traffic-proof-001",
  "circuitId": "traffic-speed-range-v1",
  "proof": {
    "piA": [],
    "piB": [],
    "piC": [],
    "protocol": "groth16",
    "curve": "bn128"
  },
  "publicSignals": ["42", "60", "1"],
  "publicInputHash": "可选，64位十六进制字符串",
  "writeLedger": false,
  "ledgerTargets": []
}
```

注意：

- 当前示例证明只是用于打通页面输入和接口调用，不代表真实生产证明。
- 当前页面不自行写链，只把 `writeLedger` 与 `ledgerTargets` 传给后端。
- `ledgerTargets` 当前是资源路径数组，例如 `["payment.bcos3.TrafficVerifyStore"]`。
- 需要后端明确是否支持 `writeLedger` 和 `ledgerTargets` 字段。

后续建议：

- 用真实 Groth16 证明文件做一次完整验证。
- 确认证明字段命名是否与后端一致，例如 `piA`、`piB`、`piC` 或其他格式。
- 确认 `publicSignals` 可以是数组、对象还是字符串。
- 确认 `publicInputHash` 是前端可选字段，还是必须由后端根据公开输入计算。
- 如果需要链上留痕，明确由后端写账本还是前端复用 `trafficVerifyChain.js` 写账本。

### 4.3 多方签名验证

页面文件：

```text
src/views/crossVerification/thresholdSignature.vue
```

当前已完成：

- 支持业务标识输入。
- 支持待验证消息输入。
- 支持总节点数输入，范围为 `1` 到 `1000`。
- 支持签名阈值输入，阈值不能超过总节点数。
- 支持参与节点编号输入，使用英文逗号分隔。
- 校验参与节点编号必须为数字、不能重复、必须在 `1` 到总节点数之间。
- 校验参与节点数量不能小于签名阈值。
- 支持签名数据输入。
- 签名数据优先按 JSON 解析，解析失败时作为普通字符串签名提交。
- 支持通过 `LedgerTargetSelector` 选择是否同步到可信账本。
- 若开启可信账本同步但未选择目标资源，会阻止提交并提示。
- 调用 `verifyThresholdSignature(payload)` 执行后端验证。
- 对后端结果进行字段归一化，补充阈值、总节点数、参与节点数量、参与节点列表、消息 Hash、签名 Hash 等展示字段。
- 使用 `VerificationResultPanel` 展示结果。
- 支持完整 JSON 弹窗查看。
- 每次验证结果会写入 localStorage 最近记录。

当前多方签名请求体大致结构：

```json
{
  "businessId": "traffic-signature-001",
  "message": "待验证业务消息或摘要",
  "threshold": 3,
  "totalNodes": 5,
  "participantIds": [1, 2, 3],
  "signatureBundle": {
    "aggregateSignature": "traffic-threshold-signature-value",
    "participantSignatures": {
      "1": "sig-node-1",
      "2": "sig-node-2",
      "3": "sig-node-3"
    },
    "valid": true
  },
  "writeLedger": false,
  "ledgerTargets": []
}
```

注意：

- 当前默认签名数据是示例结构，真实签名格式需要后端确认。
- 当前页面不自行验证密码学签名，只负责收集参数并调用后端验证接口。
- 当前页面不自行写链，账本同步依赖后端。

后续建议：

- 明确签名算法名称和签名数据结构，例如 BLS、Schnorr、ECDSA 聚合签名或业务自定义格式。
- 明确 `participantIds` 是否应为数字数组、字符串数组还是节点地址数组。
- 明确待验证消息是原文、摘要、交易 ID 还是业务数据 Hash。
- 真实联调失败时，优先检查后端对 `signatureBundle` 的解析规则。

### 4.4 验证记录

页面文件：

```text
src/views/crossVerification/records.vue
```

当前已完成：

- 页面创建时自动请求验证记录。
- 支持按验证方式筛选。
- 支持按业务标识筛选。
- 支持按验证状态筛选。
- 支持查询、重置、刷新。
- 支持分页，包括页码、每页条数、总数。
- 支持表格展示记录 ID、验证方式、业务标识、算法、验证状态、可信账本状态、协同网络、交易哈希、创建时间。
- 支持查看详情弹窗。
- 详情弹窗展示记录摘要和完整 JSON。
- 支持复制记录 ID。
- 支持复制完整详情。
- 列表返回结构已兼容 `records`、`list`、`content`、`data.records`、`data.list`、`data.content` 等常见字段。

当前记录列表请求参数大致结构：

```json
{
  "page": 1,
  "size": 10,
  "verifyType": "MERKLE",
  "businessId": "traffic-batch-001",
  "status": "PASS"
}
```

当前期望列表响应可为以下任意形式之一：

```json
{
  "records": [],
  "page": 1,
  "size": 10,
  "total": 0
}
```

```json
{
  "data": {
    "records": [],
    "page": 1,
    "size": 10,
    "total": 0
  }
}
```

注意：

- 当前记录页面只读取服务端接口。
- 三个验证页面保存到 localStorage 的 `cross-verification-history` 尚未接入记录列表。
- 如果后端未实现记录持久化，记录页面会显示空列表或加载失败。

后续建议：

- 明确服务端分页从 `0` 开始还是从 `1` 开始。
- 明确筛选字段名称是否为 `verifyType`、`businessId`、`status`。
- 明确详情接口返回的是直接记录对象，还是包在 `data` 字段中。
- 如果短期内后端无法提供记录持久化，可临时把 localStorage 最近记录作为兜底数据源，但需要清楚标识“本地记录”和“服务端记录”的区别。

## 5. 状态枚举与展示约定

### 5.1 验证状态

当前前端主要识别：

| 状态 | 页面文案 | 类型 |
| --- | --- | --- |
| `PASS` | 验证通过 | success |
| `FAIL` | 验证未通过 | danger |
| `ERROR` | 验证异常 | danger |

如果后端返回其他状态，前端会展示原始状态文本，标签类型默认为 `info`。

### 5.2 可信账本状态

当前前端主要识别：

| 状态 | 页面文案 | 类型 |
| --- | --- | --- |
| `SUCCESS` | 已同步可信账本 | success |
| `FAILED` | 同步失败 | danger |
| `PENDING` | 同步中或同步状态待确认 | warning |
| `DISABLED` | 未启用同步 | info |
| `LEDGER_SUCCESS` | 已同步可信账本 | success |
| `LEDGER_FAILED` | 同步失败 | danger |

后续建议后端尽量统一账本状态枚举，避免同时出现 `SUCCESS` 和 `LEDGER_SUCCESS` 两套命名。

## 6. 本地缓存说明

当前工具文件：

```text
src/views/crossVerification/utils/verificationUtils.js
```

使用的 localStorage key：

```text
cross-verification-history
```

用途：

- 保存最近 20 条前端验证结果。
- 当前三个验证入口都会调用 `saveRecentRecord`。
- 当前记录列表页面尚未读取该缓存。

后续可选处理：

1. 保持当前状态，只把 localStorage 当作调试辅助。
2. 在记录页面服务端请求失败时读取 localStorage 兜底展示。
3. 把 localStorage 记录做成“最近验证”独立区域，避免和服务端持久化记录混淆。

## 7. 可信账本与跨链流程说明

当前可信账本相关逻辑分为两类。

### 7.1 Merkle 当前流程

数据完整性验证当前由前端显式执行以下流程：

1. 调用 `/api/cross-verification/merkle/verify` 完成 Merkle 验证。
2. 若验证状态为 `PASS`，前端构造链上记录。
3. 调用 `writeVerifyRecord('bcos3', businessId, 'MERKLE', record)`。
4. 前端向 `payment.bcos3.TrafficVerifyStore` 发送 `setRecord` 交易。
5. 前端轮询 `getVerifyRecord('bcos3', businessId, 'MERKLE')`，确认记录可查询。
6. 调用 `interchainQueryRecord('fabric', 'bcos3', businessId, 'MERKLE')`。
7. 前端通过 `payment.fabric.traffic_verify_store` 发起跨链查询。
8. 调用 `waitLastCallbackResult('fabric', { recordKey })` 等待回调。
9. 若回调记录存在，则展示 fabric 验证成功。

该流程中任何一步失败，页面会保留本地验证结果，同时将账本或 fabric 验证状态标为失败。

### 7.2 ZKP 与多方签名当前流程

ZKP 和多方签名验证已与 Merkle 对齐：

1. 调用后端完成链下验证并创建验证记录，后端请求固定 `writeLedger=false`，避免缺失网关时停留在 `PENDING`。
2. 验证状态为 `PASS` 且页面开启可信账本同步时，调用共享的 `syncCrossChainVerification`。
3. 通过 `payment.bcos3.TrafficVerifyStore.setRecord` 写入对应 `ZKP` 或 `THRESHOLD_SIGNATURE` 记录。
4. 轮询 `getRecordWithStatus` 确认 BCOS3 记录可查询。
5. 通过 `payment.fabric.traffic_verify_store.interchain` 发起跨链查询。
6. 调用 `waitLastCallbackResult` 确认 Fabric 回调记录。
7. 调用 `PUT /api/cross-verification/records/{recordId}/ledger`，把账本交易哈希和跨链状态回写后端记录。
8. 页面分别展示链下验证、可信账本同步和 Fabric 跨链验证状态。

三类验证目前统一采用 BCOS3 写入、Fabric 发起跨链验证的方向。

### 7.3 后续需要统一的问题

- 将浏览器端跨链编排迁移到可信后端服务，避免依赖用户页面保持在线。
- 为多个并发验证提供按 `recordKey` 隔离的回调查询，避免仅使用最后一次回调。
- 将内存验证记录替换为数据库持久化。
- 接入真实 Groth16 与真实分布式门限签名验签实现。

## 8. 后端接口待确认清单

### 8.1 健康检查

接口：

```text
GET /api/cross-verification/health
```

待确认：

- 成功响应是否只要 HTTP 200 即可。
- 是否包含 `status`、`service`、`version` 等字段。
- 服务不可用时错误结构是什么。

### 8.2 Merkle 验证

接口：

```text
POST /api/cross-verification/merkle/verify
```

待确认：

- `leafItems` 最大数量。
- 单个叶子的最大长度。
- 是否支持二进制文件分块后的 Base64 字符串。
- `expectedRoot` 是否由后端执行比对。
- `sampleIndex` 是否可选。
- 返回字段中 Merkle Root 的标准字段名。
- 返回字段中叶子数量、抽样叶子、证明路径、证明哈希的标准字段名。
- 失败时是返回 HTTP 200 + `status=FAIL`，还是返回非 2xx。

### 8.3 ZKP 验证

接口：

```text
POST /api/cross-verification/zkp/verify
```

待确认：

- `proof` 的标准 JSON 结构。
- `publicSignals` 的标准结构。
- `circuitId` 是否必填。
- `algorithm` 是否由前端传入，还是后端固定。
- `publicInputHash` 是否可选。
- 证明失败与请求错误的区分方式。
- 账本同步字段是否支持 `writeLedger` 和 `ledgerTargets`。

### 8.4 多方签名验证

接口：

```text
POST /api/cross-verification/threshold-signature/verify
```

待确认：

- 签名算法。
- `message` 应传原文还是 Hash。
- `participantIds` 应传数字、节点名、账户地址还是公钥。
- `signatureBundle` 标准结构。
- 阈值和总节点数是否由后端再次校验。
- 聚合签名和单个参与方签名是否都需要。
- 账本同步字段是否支持 `writeLedger` 和 `ledgerTargets`。

### 8.5 记录列表

接口：

```text
GET /api/cross-verification/records
```

待确认：

- 页码从 `1` 开始还是从 `0` 开始。
- 每页条数字段是 `size` 还是 `pageSize`。
- 总数字段是 `total`、`totalElements` 还是其他。
- 列表字段是 `records`、`list`、`content` 还是包在 `data` 中。
- 筛选字段是否支持 `verifyType`、`businessId`、`status`。
- 是否支持按创建时间倒序。

### 8.6 记录详情

接口：

```text
GET /api/cross-verification/records/{recordId}
```

待确认：

- `recordId` 是否全局唯一。
- 详情接口返回直接对象还是 `{ data: {} }`。
- 是否包含完整 `detail`、`ledger`、`chainVerification`、`raw` 字段。

## 9. 当前验证情况

最近一次本地验证结果：

```shell
npm run lint
npm run build:prod
```

结果：

- `npm run lint` 通过。
- `npm run build:prod` 通过。
- 生产构建存在资源体积 warning，主要与已有的 `GUET-logo.svg`、Element UI chunk、libs chunk 体积有关，不是跨链可信验证模块本身的阻断问题。

未完成的验证：

- 未在本文档更新时重新跑真实浏览器页面验证。
- 未确认本机当前 `8088` 后端是否正在运行。
- 未确认真实 WeCross Router 登录态。
- 未确认真实 `bcos3` 写入和 `fabric` 回调在当前环境一定可用。
- 未完成三类验证的真实后端联调闭环。

## 10. 已知风险

### 10.1 前后端字段契约仍可能不稳定

当前前端做了一些字段兼容，例如 Merkle Root 兼容 `merkleRoot`、`rootHash`、`resultHash`，ZKP 证明 Hash 兼容 `proofHash`、`detail.proofHash`、`detail.proofSummary.proofHash`。这能提高兼容性，但也说明后端字段命名还需要最终固定。

### 10.2 Merkle 与其他两类验证的账本同步职责不一致

Merkle 由前端主动写账本和发起跨链查询；ZKP 与多方签名依赖后端。这是当前最重要的架构不一致点，后续必须统一，否则用户会看到三类验证在账本同步行为上不一致。

### 10.3 `getLastCallbackResult` 可能存在并发覆盖风险

当前 fabric 回调查询使用“最近一次回调结果”。如果多人或多个验证任务同时执行，最近回调可能不是当前业务标识对应的回调。虽然前端会用 `recordKey` 判断是否匹配，但从接口设计看，后续最好提供按 `recordKey` 查询回调结果的接口。

### 10.4 记录页面依赖服务端持久化

记录页面当前不读取 localStorage 最近记录。如果后端没有保存记录，用户执行验证后仍可能在记录页面看不到历史结果。

### 10.5 资源选择器未限制合约类型

`LedgerTargetSelector` 当前从 WeCross 资源列表中读取资源，但没有强制限制只能选择验证合约。如果用户选到了普通业务合约，后端或链上写入可能失败。

### 10.6 示例数据不等于真实业务数据

ZKP 示例证明、多方签名默认签名包只用于页面演示和接口格式调试，不能作为真实密码学验证成功的依据。

## 11. 建议交接推进顺序

建议下一位成员按以下顺序继续推进：

1. 拉起本地新版验证后端，确认 `http://127.0.0.1:8088/api/cross-verification/health` 可用。
2. 启动前端，进入 `/cross-verification/merkle`、`/zkp`、`/threshold-signature`、`/records` 确认页面可访问。
3. 对照本文档第 8 节，先固定后端接口字段契约。
4. 用最小正例跑通 Merkle 验证，不开启真实链路时先确认后端验证结果展示正确。
5. 再跑通 Merkle 的 `bcos3` 写入和 `fabric` 跨链回调。
6. 用真实 Groth16 证明跑通 ZKP 验证。
7. 用真实阈值签名或后端认可的签名包跑通多方签名验证。
8. 明确 ZKP 和多方签名的账本同步由后端负责还是前端负责。
9. 完成验证记录的服务端持久化和分页查询。
10. 最后补充接口 mock、最小自动化测试或联调测试文档。

## 12. 可执行检查命令

前端静态检查：

```shell
npm run lint
```

生产构建：

```shell
npm run build:prod
```

开发启动：

```shell
npm run dev
```

建议联调前确认：

```text
1. 前端开发服务已启动。
2. 新版验证后端监听 127.0.0.1:8088。
3. WeCross Router 可访问。
4. 当前浏览器登录态有效。
5. bcos3 与 fabric 验证合约资源路径存在。
```

## 13. 交接验收标准

如果后续要将该模块从“基础实现”推进到“可交付”，建议至少满足以下标准：

- 四个页面均可从菜单进入。
- 健康检查能正确显示服务可用或服务异常。
- Merkle 手动输入验证成功。
- Merkle 文件上传验证成功。
- Merkle 期望 Root 错误时能显示验证未通过。
- ZKP 使用真实证明验证成功。
- ZKP 使用错误证明时能显示验证未通过或验证异常。
- 多方签名使用真实签名包验证成功。
- 多方签名参与节点不足阈值时能在前端阻止提交。
- 三类验证均能形成记录 ID。
- 三类验证均能进入记录列表查询。
- 记录详情能展示完整 JSON。
- 可信账本同步成功时能展示交易哈希。
- 可信账本同步失败时不影响本地验证结果展示，并能明确提示失败原因。
- `npm run lint` 通过。
- `npm run build:prod` 通过。

## 14. 给接手人的重点提醒

- 不要先重构 UI，优先确认接口契约和真实链路。
- 不要删除旧版 `/verification/index`，除非新版已完全联调通过并得到确认。
- 不要把链下验证成功和跨链账本同步成功混为一个状态，两者要分别展示。
- 如果遇到 `401 Unauthorized` 或 `Login check failed`，优先检查 WeCross Router 登录态或凭证，不要直接判断为前端页面问题。
- 如果记录列表为空，先确认后端是否真的持久化记录，再考虑 localStorage 兜底。
- 如果链上写入失败，先确认资源路径、合约方法签名、当前账户权限和 Router 连接状态。
- 如果要统一三类验证的账本同步，建议优先选择“后端统一处理”，前端只展示同步结果，这样能减少浏览器端直接编排跨链流程的复杂度。
