# 跨链可信验证测试指南

## 1. 启动

先启动验证后端（默认 `8088`）：

```powershell
cd D:\GitHub\traffic-model-blockchain-verification
mvn clean package
java -jar .\target\transportation_model-1.0-SNAPSHOT.jar
```

新开 PowerShell，启动前端。该脚本直接使用 D 盘 Node.js，不依赖系统全局 `npm`：

```powershell
cd D:\GitHub\traffic-model-blockchain-web
powershell -ExecutionPolicy Bypass -File .\start-frontend.ps1
```

打开 `http://localhost:9528`。停止前端：

```powershell
powershell -ExecutionPolicy Bypass -File .\stop-frontend.ps1
```

## 2. 前置条件

- WeCross Router 可访问并已登录。
- BCOS3 资源：`payment.bcos3.TrafficVerifyStore`。
- Fabric 资源：`payment.fabric.traffic_verify_store`。
- 合约/链码实现 `setRecord`、`getRecordWithStatus`、`interchain`、`callback` 和 `getLastCallbackResult`。
- 只测试链下验证时，可关闭“同步到可信账本”；完整跨链测试必须打开。

## 3. 数据完整性（Merkle）

1. 进入“跨链可信验证 → Merkle验证”。
2. 点击业务标识右侧“生成”。
3. 选择手动输入，使用以下三行：

```text
vehicle=粤A10001,speed=42,time=2026-07-04T09:00:00
vehicle=粤A10002,speed=58,time=2026-07-04T09:00:05
vehicle=粤A10003,speed=36,time=2026-07-04T09:00:10
```

4. 抽样索引可填 `1`；首次测试不填预期 Root。
5. 打开可信账本同步，选择 `payment.bcos3.TrafficVerifyStore`，点击执行验证。
6. 预期：链下状态 PASS；记录写入 BCOS3；Fabric 查询 BCOS3 并收到回调；验证记录页面可按业务标识查到该记录。

## 4. 隐私证明（ZKP）

1. 进入“ZKP验证”。
2. 点击业务标识右侧“生成”。
3. 点击电路标识右侧“生成测试数据”。页面自动填入：
   - 电路：`traffic-speed-range-v1`
   - Groth16 示例 `piA/piB/piC`
   - 公开输入：`["42", "60", "1"]`
4. 打开可信账本同步并执行验证。
5. 预期：结构校验 PASS，显示证明 Hash、公开输入 Hash；随后完成 BCOS3 写入、Fabric 跨链查询及记录回写。

注意：当前后端验证的是 Groth16 证明结构和测试标志，不执行真实 pairing 运算。生产环境应接入 snarkjs/JNI 或独立证明验证服务，并加载对应 verification key。

## 5. 多方签名

1. 进入“门限阈值签名”。
2. 点击业务标识右侧“生成”。
3. 点击签名数据下方“生成测试数据”。页面自动填入：
   - 总节点数 `5`
   - 阈值 `3`
   - 参与节点 `1,2,3`
   - 三份节点签名和一份聚合签名
4. 打开可信账本同步并执行验证。
5. 预期：参与节点数达到阈值，链下状态 PASS；之后完成 BCOS3 写入、Fabric 跨链查询及记录回写。

注意：当前签名值是联调用模拟证据，不是节点真正生成的门限签名。真实系统应由各节点独立持有密钥份额，通过节点服务提交部分签名，由协调服务聚合；前端只发起任务并查询状态，不应保存私钥份额。

## 6. 完整调用链

三类功能统一执行以下流程：

1. 前端把验证参数提交给链下验证后端。
2. 后端完成验证并生成验证记录、输入 Hash、结果 Hash。
3. 前端调用 WeCross，将摘要记录写入 BCOS3 `TrafficVerifyStore`。
4. 前端轮询确认 BCOS3 记录可读取。
5. Fabric 链码通过 WeCross `interchain` 查询 BCOS3 记录。
6. Fabric 回调保存跨链查询结果。
7. 前端读取回调并把账本状态、交易哈希和跨链状态回写后端验证记录。
8. 在“验证记录”页面用业务标识查询，检查 PASS、账本 SUCCESS 和 Fabric 跨链 SUCCESS。

若链下 PASS 但账本失败，依次检查 Router、登录凭据、资源路径、合约方法和账户权限。
