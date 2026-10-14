# Easy Story Engine (ESE)

**Easy Story Engine (ESE)** 是一套基于 HTML5 的**可扩展多模式叙事游戏引擎与图形化编辑器**（骨架 + 可插拔模式模块）。
引擎不预设固定主线模式，每个工程在系统设置中自由指定起始模式（`startMode`）与起始事件（`startEvent`），内置首批三大平级模块：**AVG 视觉小说模式**、**RPG 瓦片探索与回合制战斗模式**、**Debate 逆转辩论破除矛盾模式**。

---

## 核心特性

1. **骨架 + 模式模块架构 (§1)**
   - 全局状态层（Core State）：开关、变量、双域背包、好感度、图库、成就、游戏时钟、自定义全局数值（`G[key]`）。
   - 模式管理器（Mode Manager）：统一生命周期调度（`onEnter`, `onExit`, `update`, `render`, `serialize`, `deserialize`）。
   - 事件总线（Event Bus）与指令解释器（Command Interpreter）：驱动对话、分支、模式无缝切换。

2. **三大内置玩法模式 (§2, §3, §5)**
   - **AVG 模式**：角色立绘与表情差分、打字机对话、分支选项（含限时倒计时）、回看记录（Log）、双域背包出示（Present）与好感度赠礼系统。
   - **RPG 模式**：简化瓦片地图（32px 统一网格、单层瓦片 + 碰撞层 + 区域层）、地图事件、回合制指令战斗（攻击/技能/防御/物品/逃跑、JS 伤害公式）。
   - **Debate 辩论模式**：证言-追问-出示循环，威慑追问获取证言补充，在矛盾陈述句上出示正确证物触发突破（Breakthrough!），压制条/血条惩罚。

3. **双域物品与跨模式 Facet (§4, §4.5)**
   - 实体多 Facet 机制：同一实体在不同模式下体现不同属性（AVG 证物/礼物、RPG 装备/消耗品、Debate 矛盾关联）。
   - 模式物品适配器（`ItemAdapter`）按域消费。

4. **常驻系统覆盖层与手机消息系统 (§4.8, §4.9, §4.14)**
   - 手机消息系统：全局事件驱动，支持文字、表情、图片、文件消息与回复选项回流。
   - 成就系统：横幅提示、跨模式条件触发与多周目继承。
   - 统一存档系统：包含版本号、元数据、核心状态、各模式现场与剧情断点，支持 IndexedDB、localStorage 与 `.sav` 文件导入导出。

5. **角色立绘强制表情集约束 (§4.12)**
   - 全体角色只要配置了立绘（`portrait`）或表情（`face`），必须完整提供**喜怒哀乐**（`normal`, `joy`, `anger`, `sorrow`）四套基础表情，编辑器实时校验并在缺失时拦截报错。

6. **工程文件格式协议（.esproj, §4.16）**
   - 目录形态天然 Git 友好，分发形态支持单文件 `.esproj`（ZIP 容器）无损互转导入导出。

7. **全功能图形化 Web 编辑器 (§6)**
   - 流程图视图（Flowchart Graph）
   - 思维导图视图（Mindmap）
   - 积木式事件命令视图（Block-based Command List）
   - 瓦片地图编辑器（Tilemap Editor）
   - 角色立绘与表情校验编辑器
   - 实体与多 Facet 数据库编辑器
   - 手机消息剧本编辑器
   - 辩论剧本编辑器
   - 标题画面可视化编辑器
   - 插件管理器
   - 一键实时试玩（Playtest）与静态站点导出

---

## 快速开始

### 依赖环境
- Node.js >= 18 (已验证 Node.js 24)
- npm / pnpm

### 安装与运行

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器（图形化编辑器与实时试玩）
npm run dev

# 3. 运行完整自动化测试套件
npm test

# 4. 构建生产包
npm run build
```

---

## 工程目录结构

```
Easy-Story-Engine/
├── src/
│   ├── engine/
│   │   ├── types/          # 全局类型定义与 GameModeModule 接口规范
│   │   ├── core/           # Shell、CoreState、EventBus、TriggerEngine、SaveManager、AudioManager、EntityRegistry
│   │   ├── interpreter/    # 事件指令解释器与文本控制字符解析器
│   │   ├── modes/
│   │   │   ├── avg/        # AVG 模式模块
│   │   │   ├── rpg/        # RPG 模式模块与回合制战斗系统
│   │   │   └── debate/     # Debate 辩论模式模块
│   │   └── overlay/        # 手机消息系统、系统菜单、存档界面、成就横幅
│   ├── project/            # .esproj 协议、无损 ZIP 打包解包与表情集校验器
│   ├── editor/             # 流程图、思维导图、积木、瓦片地图、数据库、角色、消息、辩论等编辑器组件
│   ├── demo/               # 官方演示工程数据《午夜之雨案》
│   └── main.ts             # Web 主入口
├── demo-project/           # 符合 §4.16 协议的标准工程目录
├── tests/                  # 自动化测试用例
├── package.json
├── tsconfig.json
└── vite.config.ts
```

