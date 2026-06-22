# 链下验证模块修改总结

> 说明：本文总结本轮链下验证模块相关改动。

## 1. 本地 mock 模式下链下验证请求 503 修复

### 问题现象

前端调用链下验证接口时出现：

```text
POST http://localhost:9528/api/verification/merkle 503 (Service Unavailable)
```

排查后确认：

- 前端 `localhost:9528` 到后端 `127.0.0.1:8088` 的代理链路可用。
- 后端健康接口 `/api/verification/health` 可正常返回。
- 真正的 503 来自后端 `WeCrossCredentialFilter`。
- 后端即使处于默认 `wecross.mode=mock` 模式，也会访问 `127.0.0.1:8250/auth/listAccount` 校验 WeCross 登录凭证。
- 本机 WeCross Router 8250 未启动，因此凭证校验失败并返回 503。

### 修改内容

修改后端文件：

```text
WeCross-Offline-Verification/WerCross-Offline_Verify/src/main/java/com/traffic/wecross/api/WeCrossCredentialFilter.java
```

新增 `mockMode` 判断：

- 当 `wecross.mode=mock` 时，跳过 Router 凭证校验。
- 在 mock 模式下写入一个本地认证上下文 `mock-verification-user`，让链下验证接口可直接运行。
- 当 `wecross.mode=sdk` 时，保留原来的 WeCross Authorization 校验逻辑。

### 效果

本地开发时不再依赖 WeCross Router，即可调用：

```text
POST /api/verification/merkle
POST /api/verification/groth16
POST /api/verification/threshold-signature
```

真实写链时仍可通过：

```powershell
$env:WECROSS_MODE='sdk'
```

恢复 Router 凭证校验与真实 WeCross SDK 交互。

## 2. 零知识证明 JPBC 运行时缺类修复

### 问题现象

运行零知识证明时报错：

```text
Handler dispatch failed; nested exception is java.lang.NoClassDefFoundError: it/unisa/dia/gas/plaf/jpbc/pairing/a/TypeACurveGenerator
```

排查后确认：

- `TypeACurveGenerator.class` 存在于本地 `lib/jpbc-plaf-2.0.0.jar`。
- 之前生成的 Spring Boot 可执行 jar 没有包含 `jpbc-api` 和 `jpbc-plaf`。
- 原因是这两个 JPBC 依赖在 `pom.xml` 中使用了 `system` scope，默认不会被 `spring-boot:repackage` 打进可执行 jar。

### 修改内容

修改后端文件：

```text
WeCross-Offline-Verification/WerCross-Offline_Verify/pom.xml
```

在 `spring-boot-maven-plugin` 配置中加入：

```xml
<includeSystemScope>true</includeSystemScope>
```

### 效果

重新打包后，可执行 jar 中已包含：

```text
BOOT-INF/lib/jpbc-api-2.0.0.jar
BOOT-INF/lib/jpbc-plaf-2.0.0.jar
```

`target/transportation_model-1.0-SNAPSHOT.jar` 体积也从普通 jar 的几十 KB 变为包含依赖后的约 41 MB。

实际调用：

```text
POST /api/verification/groth16
```

已返回 200，不再出现 `NoClassDefFoundError`。

## 3. 链下验证页面布局外壳调整

### 修改内容

修改前端文件：

```text
traffic-model-blockchain-web/src/views/verification/index.vue
```

参照“跨域协同”和“共享审计/资源管理”模块初始界面的组织方式，对链下验证页做了结构性包裹：

- 在页面内容外层新增一个大的 `el-card` 容器：`verification-shell`。
- 将页面标题、服务状态、Tab、表单、验证结果、最近生成记录统一收进同一个外框中。
- 保留原有表单、接口调用、资源加载、文件解析、历史记录和结果展示逻辑。
- 调整页面标题字号，使其与跨域协同、资源管理页面标题层级更一致。
- 修复新增外层后产生的 Vue 模板缩进问题。

## 4. 验证结果

### 后端验证

已执行并通过：

```powershell
mvn "-Dmaven.repo.local=E:\桂电\区块链\多模态交通大模型\traffic\WeCross-Offline-Verification\WerCross-Offline_Verify\.m2\repository" package org.springframework.boot:spring-boot-maven-plugin:2.7.18:repackage -DskipTests
```

已验证：

```text
POST /api/verification/merkle -> 200
POST /api/verification/groth16 -> 200
```

### 前端验证

已执行并通过：

```powershell
npm run lint
npm run build:prod
```

`build:prod` 仅保留项目既有的资源体积 warning，未出现模板编译错误。

## 5. 后续运行建议

后端本地 mock 模式启动：

```powershell
cd "E:\桂电\区块链\多模态交通大模型\traffic\WeCross-Offline-Verification\WerCross-Offline_Verify"
java -jar target\transportation_model-1.0-SNAPSHOT.jar
```

前端启动：

```powershell
cd "E:\桂电\区块链\多模态交通大模型\traffic\traffic-model-blockchain-web"
npm run dev
```

真实连接 WeCross SDK 时：

```powershell
$env:WECROSS_MODE='sdk'
java -jar target\transportation_model-1.0-SNAPSHOT.jar
```

如果重新打包时报：

```text
Unable to rename ... transportation_model-1.0-SNAPSHOT.jar.original
```

说明后端 jar 正在运行，需要先停止占用 `8088` 的 Java 进程，再重新打包。