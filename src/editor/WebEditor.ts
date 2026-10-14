import type { ProjectData, StoryNode } from '../engine/types';
import { FlowchartEditor } from './FlowchartEditor';
import { MindmapEditor } from './MindmapEditor';
import { BlockEditor } from './BlockEditor';
import { CharacterEditor } from './CharacterEditor';
import { DatabaseEditor } from './DatabaseEditor';
import { TilemapEditor } from './TilemapEditor';
import { MessageEditor } from './MessageEditor';
import { DebateEditor } from './DebateEditor';
import { TitleEditor } from './TitleEditor';
import { PluginEditor } from './PluginEditor';
import { EsprojProtocol } from '../project/EsprojProtocol';
import { EngineShell } from '../engine/core/EngineShell';
import { AvgMode } from '../engine/modes/avg/AvgMode';
import { RpgMode } from '../engine/modes/rpg/RpgMode';
import { DebateMode } from '../engine/modes/debate/DebateMode';
import { PhoneMessagingSystem } from '../engine/overlay/PhoneMessagingSystem';
import { SystemOverlay } from '../engine/overlay/SystemOverlay';

export type EditorViewTab =
  | 'flowchart'
  | 'mindmap'
  | 'blocks'
  | 'tilemap'
  | 'characters'
  | 'database'
  | 'messages'
  | 'debate'
  | 'title'
  | 'plugins';

export class WebEditor {
  private container: HTMLElement;
  public projectData: ProjectData;
  private currentTab: EditorViewTab = 'flowchart';
  private currentGraphId: string = 'ch1';
  private selectedNode: StoryNode | null = null;

  // Sub-editors
  private flowchartEditor: FlowchartEditor | null = null;
  private mindmapEditor: MindmapEditor | null = null;
  private blockEditor: BlockEditor | null = null;

  // Active playtest session
  private playtestShell: EngineShell | null = null;

  constructor(container: HTMLElement, projectData: ProjectData) {
    this.container = container;
    this.projectData = projectData;
    this.currentGraphId = Object.keys(projectData.storyGraphs)[0] || 'ch1';
    this.setupUI();
  }

  private setupUI(): void {
    this.container.innerHTML = '';

    const root = document.createElement('div');
    root.className = 'ese-web-editor-app';
    root.style.cssText = `
      width: 100%; height: 100%; display: flex; flex-direction: column;
      background: #0f121d; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
    `;

    // 1. Top Global Navigation Bar
    const topBar = document.createElement('div');
    topBar.style.cssText = `
      height: 52px; background: #161b2c; border-bottom: 1px solid rgba(255,255,255,0.12);
      display: flex; justify-content: space-between; align-items: center; padding: 0 18px;
      user-select: none; z-index: 100; box-shadow: 0 2px 10px rgba(0,0,0,0.4);
    `;

    // Brand, Title & Breadcrumb
    topBar.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px;">
        <span style="font-weight: 900; font-size: 16px; color: #64b5f6; letter-spacing: 1px; display: flex; align-items: center; gap: 6px;">
          ⚡ 故事引擎 (ESE)
        </span>
        <span style="font-size: 12px; background: #283593; padding: 3px 10px; border-radius: 4px; color: #bbdefb; font-weight: 600;" id="editor-proj-title">${this.projectData.manifest.name}</span>
        <span id="editor-breadcrumb" style="font-size: 12px; color: #94a3b8; margin-left: 8px;">/ 当前工作台: 流程图</span>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <button id="btn-playtest" style="background: linear-gradient(135deg, #2e7d32, #1b5e20); border: 1px solid #4caf50; border-radius: 6px; color: #fff; padding: 7px 16px; font-weight: bold; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(46,125,50,0.4); transition: transform 0.15s;">
          ▶ 试玩游戏
        </button>
        <button id="btn-export-esproj" style="background: #1565c0; border: none; border-radius: 6px; color: #fff; padding: 7px 14px; font-weight: bold; font-size: 12px; cursor: pointer; transition: 0.2s;">
          📦 导出工程包 (.esproj)
        </button>
        <button id="btn-export-html" style="background: #6a1b9a; border: none; border-radius: 6px; color: #fff; padding: 7px 14px; font-weight: bold; font-size: 12px; cursor: pointer; transition: 0.2s;">
          🌐 导出网页版 (HTML5)
        </button>
      </div>
    `;

    root.appendChild(topBar);

    // 2. Main Content Split: Left Navigation Rail + Central Workbench
    const mainBody = document.createElement('div');
    mainBody.style.cssText = 'flex: 1; display: flex; overflow: hidden; position: relative;';

    // Left Navigation Rail (Grouped Categorized Activity Bar)
    const navRail = document.createElement('div');
    navRail.id = 'editor-tabs-container';
    navRail.style.cssText = `
      width: 180px; background: #131726; border-right: 1px solid rgba(255,255,255,0.08);
      display: flex; flex-direction: column; overflow-y: auto; padding: 12px 8px; gap: 16px;
      user-select: none;
    `;
    mainBody.appendChild(navRail);

    // Center Workspace Area
    const workspace = document.createElement('div');
    workspace.id = 'editor-workspace';
    workspace.style.cssText = 'flex: 1; display: flex; overflow: hidden; position: relative; background: #0f121d;';
    mainBody.appendChild(workspace);

    root.appendChild(mainBody);
    this.container.appendChild(root);

    this.renderTabs();
    this.renderActiveView();
    this.wireTopButtons();
  }

  private renderTabs(): void {
    const tabContainer = this.container.querySelector('#editor-tabs-container');
    if (!tabContainer) return;
    tabContainer.innerHTML = '';

    const sections = [
      {
        title: '📖 剧情编排',
        tabs: [
          { id: 'flowchart' as EditorViewTab, label: '📊 流程图' },
          { id: 'mindmap' as EditorViewTab, label: '🧠 思维导图' },
          { id: 'blocks' as EditorViewTab, label: '🧱 Scratch积木' },
        ],
      },
      {
        title: '🎮 玩法模式',
        tabs: [
          { id: 'tilemap' as EditorViewTab, label: '🗺️ 瓦片地图' },
          { id: 'debate' as EditorViewTab, label: '⚖️ 法庭辩论' },
        ],
      },
      {
        title: '📂 资产数据',
        tabs: [
          { id: 'characters' as EditorViewTab, label: '👥 角色立绘' },
          { id: 'database' as EditorViewTab, label: '🗄️ 数据库属性' },
          { id: 'messages' as EditorViewTab, label: '💬 手机短信' },
        ],
      },
      {
        title: '⚙️ 工程配置',
        tabs: [
          { id: 'title' as EditorViewTab, label: '🎨 标题画面' },
          { id: 'plugins' as EditorViewTab, label: '🔌 插件管理' },
        ],
      },
    ];

    sections.forEach((sec) => {
      const group = document.createElement('div');
      group.style.cssText = 'display: flex; flex-direction: column; gap: 3px;';

      const secTitle = document.createElement('div');
      secTitle.style.cssText = 'font-size: 11px; font-weight: bold; color: #64748b; padding: 4px 8px; text-transform: uppercase; letter-spacing: 0.5px;';
      secTitle.innerText = sec.title;
      group.appendChild(secTitle);

      sec.tabs.forEach((t) => {
        const btn = document.createElement('button');
        const isAct = this.currentTab === t.id;
        btn.innerText = t.label;
        btn.style.cssText = `
          padding: 8px 12px; font-size: 13px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer;
          background: ${isAct ? '#2563eb' : 'transparent'}; color: ${isAct ? '#fff' : '#94a3b8'};
          text-align: left; transition: all 0.15s; display: flex; align-items: center; gap: 8px;
        `;
        btn.onmouseenter = () => {
          if (this.currentTab !== t.id) {
            btn.style.background = 'rgba(255,255,255,0.06)';
            btn.style.color = '#fff';
          }
        };
        btn.onmouseleave = () => {
          if (this.currentTab !== t.id) {
            btn.style.background = 'transparent';
            btn.style.color = '#94a3b8';
          }
        };
        btn.onclick = () => {
          this.currentTab = t.id;
          this.renderTabs();
          this.renderActiveView();
          this.updateBreadcrumb(t.label);
        };
        group.appendChild(btn);
      });

      tabContainer.appendChild(group);
    });
  }

  private updateBreadcrumb(label: string): void {
    const bc = this.container.querySelector('#editor-breadcrumb');
    if (bc) bc.textContent = `/ 当前工作台: ${label}`;
  }

  private renderActiveView(): void {
    const workspace = this.container.querySelector('#editor-workspace') as HTMLElement;
    if (!workspace) return;
    workspace.innerHTML = '';

    const activeGraph = this.projectData.storyGraphs[this.currentGraphId] || Object.values(this.projectData.storyGraphs)[0];

    switch (this.currentTab) {
      case 'flowchart': {
        const fcBox = document.createElement('div');
        fcBox.style.cssText = 'flex: 1; height: 100%; position: relative;';
        workspace.appendChild(fcBox);

        this.flowchartEditor = new FlowchartEditor(fcBox, activeGraph);
        this.flowchartEditor.onNodeSelect = (node) => {
          this.selectedNode = node;
          this.renderNodeInspector(workspace, node);
        };
        break;
      }

      case 'mindmap': {
        const mmBox = document.createElement('div');
        mmBox.style.cssText = 'flex: 1; height: 100%;';
        workspace.appendChild(mmBox);

        this.mindmapEditor = new MindmapEditor(mmBox, activeGraph);
        this.mindmapEditor.onSelectNode = (nodeId) => {
          this.selectedNode = activeGraph.nodes[nodeId];
          this.currentTab = 'flowchart';
          this.renderTabs();
          this.renderActiveView();
        };
        break;
      }

      case 'blocks': {
        const blockBox = document.createElement('div');
        blockBox.style.cssText = 'flex: 1; height: 100%;';
        workspace.appendChild(blockBox);

        const initialCommands = this.selectedNode?.data?.commands || [
          { code: 'show_text', parameters: { text: 'Welcome to Easy Story Engine!' } },
        ];
        this.blockEditor = new BlockEditor(blockBox, initialCommands);
        this.blockEditor.onChange = (cmds) => {
          if (this.selectedNode) {
            if (!this.selectedNode.data) this.selectedNode.data = {};
            this.selectedNode.data.commands = cmds;
          }
        };
        break;
      }

      case 'tilemap': {
        const mapBox = document.createElement('div');
        mapBox.style.cssText = 'flex: 1; height: 100%;';
        workspace.appendChild(mapBox);

        const currentMap = Object.values(this.projectData.maps)[0];
        new TilemapEditor(mapBox, currentMap);
        break;
      }

      case 'characters': {
        const charBox = document.createElement('div');
        charBox.style.cssText = 'flex: 1; height: 100%;';
        workspace.appendChild(charBox);

        new CharacterEditor(charBox, this.projectData.characters);
        break;
      }

      case 'database': {
        const dbBox = document.createElement('div');
        dbBox.style.cssText = 'flex: 1; height: 100%;';
        workspace.appendChild(dbBox);

        new DatabaseEditor(dbBox, this.projectData.entities, this.projectData.globals);
        break;
      }

      case 'messages': {
        const msgBox = document.createElement('div');
        msgBox.style.cssText = 'flex: 1; height: 100%;';
        workspace.appendChild(msgBox);

        new MessageEditor(msgBox, this.projectData.messages);
        break;
      }

      case 'debate': {
        const debBox = document.createElement('div');
        debBox.style.cssText = 'flex: 1; height: 100%;';
        workspace.appendChild(debBox);

        new DebateEditor(debBox, this.projectData.debates);
        break;
      }

      case 'title': {
        const titleBox = document.createElement('div');
        titleBox.style.cssText = 'flex: 1; height: 100%;';
        workspace.appendChild(titleBox);

        new TitleEditor(titleBox, this.projectData.title);
        break;
      }

      case 'plugins': {
        const plugBox = document.createElement('div');
        plugBox.style.cssText = 'flex: 1; height: 100%;';
        workspace.appendChild(plugBox);

        new PluginEditor(plugBox, this.projectData.plugins);
        break;
      }
    }
  }

  private renderNodeInspector(workspace: HTMLElement, node: StoryNode | null): void {
    const existing = workspace.querySelector('#node-inspector-panel');
    if (existing) existing.remove();

    if (!node) return;

    const inspector = document.createElement('div');
    inspector.id = 'node-inspector-panel';
    inspector.style.cssText = `
      width: 280px; height: 100%; background: #161a29; border-left: 1px solid rgba(255,255,255,0.1);
      padding: 16px; display: flex; flex-direction: column; gap: 12px; z-index: 10;
    `;

    inspector.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
        <h4 style="margin: 0; color: #64b5f6;">节点属性检查器</h4>
        <button id="close-inspector" style="background: none; border: none; color: #aaa; cursor: pointer;">✕</button>
      </div>
      <div>
        <label style="font-size: 11px; color: #aaa;">节点 ID</label>
        <div style="font-family: monospace; font-size: 12px; color: #ffd54f;">${node.id}</div>
      </div>
      <div>
        <label style="font-size: 11px; color: #aaa;">节点标题</label>
        <input id="node-title-inp" type="text" value="${node.title}" style="width: 100%; padding: 6px; background: #1f2538; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 2px;">
      </div>
      <div>
        <label style="font-size: 11px; color: #aaa;">节点类型</label>
        <select id="node-type-sel" style="width: 100%; padding: 6px; background: #1f2538; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 2px;">
          <option value="dialogue" ${node.type === 'dialogue' ? 'selected' : ''}>对话剧情 (Dialogue)</option>
          <option value="event" ${node.type === 'event' ? 'selected' : ''}>事件序列 (Event Sequence)</option>
          <option value="choice" ${node.type === 'choice' ? 'selected' : ''}>分支选项 (Choice)</option>
          <option value="switch_mode" ${node.type === 'switch_mode' ? 'selected' : ''}>切换游戏模式 (§6.2)</option>
          <option value="battle" ${node.type === 'battle' ? 'selected' : ''}>RPG 回合战斗 (Battle)</option>
          <option value="debate" ${node.type === 'debate' ? 'selected' : ''}>法庭辩论 (Debate)</option>
        </select>
      </div>
      <div id="inspector-type-specific"></div>
      <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08);">
        <button id="btn-open-node-blocks" style="width: 100%; background: #4C97FF; border: none; border-radius: 6px; color: #fff; padding: 9px 12px; font-weight: bold; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 10px rgba(76,151,255,0.3);">
          🧱 在 Scratch 积木中编写指令
        </button>
      </div>
    `;

    inspector.querySelector('#btn-open-node-blocks')?.addEventListener('click', () => {
      this.currentTab = 'blocks';
      this.renderTabs();
      this.renderActiveView();
      this.updateBreadcrumb('Scratch 积木代码');
    });

    inspector.querySelector('#close-inspector')?.addEventListener('click', () => inspector.remove());
    inspector.querySelector('#node-title-inp')?.addEventListener('input', (e: any) => {
      node.title = e.target.value;
      this.flowchartEditor?.render();
    });

    const typeSel = inspector.querySelector('#node-type-sel') as HTMLSelectElement;
    typeSel.onchange = () => {
      node.type = typeSel.value as any;
      if (node.type === 'switch_mode' && !node.data?.targetModeId) {
        node.data = { targetModeId: 'rpg', params: { mapId: 'map_01' } };
      }
      this.flowchartEditor?.render();
      this.renderTypeSpecificInspector(inspector, node);
    };

    this.renderTypeSpecificInspector(inspector, node);
    workspace.appendChild(inspector);
  }

  private renderTypeSpecificInspector(inspector: HTMLElement, node: StoryNode): void {
    const box = inspector.querySelector('#inspector-type-specific') as HTMLElement;
    if (!box) return;
    box.innerHTML = '';

    if (node.type === 'switch_mode') {
      box.innerHTML = `
        <div style="margin-top: 8px; padding: 10px; background: rgba(233, 30, 99, 0.1); border: 1px solid #e91e63; border-radius: 6px;">
          <div style="font-weight: bold; color: #ff80ab; font-size: 12px; margin-bottom: 6px;">模式切换设置 (§6.2)</div>
          <label style="font-size: 11px; color: #aaa;">目标游戏模式</label>
          <select id="inp-target-mode" style="width: 100%; padding: 4px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 2px;">
            <option value="avg" ${node.data?.targetModeId === 'avg' ? 'selected' : ''}>AVG 视觉小说模式</option>
            <option value="rpg" ${node.data?.targetModeId === 'rpg' ? 'selected' : ''}>RPG 探索战斗模式</option>
            <option value="debate" ${node.data?.targetModeId === 'debate' ? 'selected' : ''}>Debate 法庭辩论模式</option>
          </select>
        </div>
      `;

      box.querySelector('#inp-target-mode')?.addEventListener('change', (e: any) => {
        if (!node.data) node.data = {};
        node.data.targetModeId = e.target.value;
        this.flowchartEditor?.render();
      });
    } else if (node.type === 'dialogue') {
      box.innerHTML = `
        <div style="margin-top: 8px;">
          <label style="font-size: 11px; color: #aaa;">对话文本内容</label>
          <textarea id="inp-diag-text" style="width: 100%; height: 80px; padding: 6px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 2px;">${node.data?.text || ''}</textarea>
        </div>
      `;
      box.querySelector('#inp-diag-text')?.addEventListener('input', (e: any) => {
        if (!node.data) node.data = {};
        node.data.text = e.target.value;
        this.flowchartEditor?.render();
      });
    }
  }

  // -------------------------------------------------------------
  // Playtest & Import/Export (§6.3, §4.16)
  // -------------------------------------------------------------

  private wireTopButtons(): void {
    const playtestBtn = this.container.querySelector('#btn-playtest');
    if (playtestBtn) {
      playtestBtn.addEventListener('click', () => this.startPlaytest());
    }

    const exportEsprojBtn = this.container.querySelector('#btn-export-esproj');
    if (exportEsprojBtn) {
      exportEsprojBtn.addEventListener('click', () => this.exportEsprojFile());
    }

    const exportHtmlBtn = this.container.querySelector('#btn-export-html');
    if (exportHtmlBtn) {
      exportHtmlBtn.addEventListener('click', () => this.exportHtmlStaticSite());
    }
  }

  public startPlaytest(): void {
    const modal = document.createElement('div');
    modal.className = 'ese-playtest-modal';
    modal.style.cssText = `
      position: absolute; inset: 0; z-index: 2000;
      background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    `;

    const win = document.createElement('div');
    win.style.cssText = `
      width: 800px; height: 600px; max-width: 95vw; max-height: 90vh;
      background: #000; border: 2px solid #29b6f6; border-radius: 12px;
      overflow: hidden; position: relative; display: flex; flex-direction: column;
      box-shadow: 0 20px 60px rgba(0,0,0,0.9);
    `;

    // Titlebar
    const titleBar = document.createElement('div');
    titleBar.style.cssText = 'height: 36px; background: #161b2c; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; padding: 0 14px; color: #fff; font-size: 13px; font-weight: bold; user-select: none; z-index: 3000;';
    titleBar.innerHTML = `
      <span>🎮 游戏实时试玩: ${this.projectData.manifest.name}</span>
      <button id="close-playtest-btn" style="background: none; border: none; color: #ff5252; font-size: 18px; cursor: pointer;">✕ 退出试玩</button>
    `;
    win.appendChild(titleBar);

    // Game container
    const gameContainer = document.createElement('div');
    gameContainer.style.cssText = 'flex: 1; position: relative; overflow: hidden;';
    win.appendChild(gameContainer);

    modal.appendChild(win);
    this.container.appendChild(modal);

    // Initialize EngineShell with all built-in modes (§1.1, §1.2)
    const shell = new EngineShell(this.projectData, gameContainer);
    shell.registerMode(new AvgMode());
    shell.registerMode(new RpgMode());
    shell.registerMode(new DebateMode());

    // Register overlays (§1.1, §4.8)
    new PhoneMessagingSystem(shell, gameContainer);
    new SystemOverlay(shell, gameContainer);

    shell.start();
    this.playtestShell = shell;

    titleBar.querySelector('#close-playtest-btn')?.addEventListener('click', () => {
      shell.stop();
      this.playtestShell = null;
      modal.remove();
    });
  }

  public async exportEsprojFile(): Promise<void> {
    try {
      const zipBytes = await EsprojProtocol.exportToZip(this.projectData);
      const blob = new Blob([zipBytes as any], { type: 'application/x-esproj' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.projectData.manifest.name || 'game'}.esproj`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export .esproj failed:', e);
      alert('Export failed. Check console for details.');
    }
  }

  public async exportHtmlStaticSite(): Promise<void> {
    try {
      const zipBytes = await EsprojProtocol.exportToZip(this.projectData);
      const blob = new Blob([zipBytes as any], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.projectData.manifest.name || 'game'}_html5_site.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export HTML5 static site failed:', e);
      alert('Export failed. Check console for details.');
    }
  }
}
