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
      display: flex; justify-content: space-between; align-items: center; padding: 0 16px;
      user-select: none;
    `;

    // Brand and Title
    topBar.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-weight: 900; font-size: 16px; color: #64b5f6; letter-spacing: 1px;">⚡ EASY STORY ENGINE</span>
        <span style="font-size: 12px; background: #283593; padding: 2px 8px; border-radius: 4px; color: #bbdefb;" id="editor-proj-title">${this.projectData.manifest.name}</span>
      </div>
      <div id="editor-tabs-container" style="display: flex; gap: 4px;"></div>
      <div style="display: flex; gap: 8px;">
        <button id="btn-playtest" style="background: #2e7d32; border: none; border-radius: 6px; color: #fff; padding: 6px 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          ▶ Playtest (试玩)
        </button>
        <button id="btn-export-esproj" style="background: #1565c0; border: none; border-radius: 6px; color: #fff; padding: 6px 14px; font-weight: bold; cursor: pointer;">
          📦 Export .esproj
        </button>
        <button id="btn-export-html" style="background: #6a1b9a; border: none; border-radius: 6px; color: #fff; padding: 6px 14px; font-weight: bold; cursor: pointer;">
          🌐 Export HTML5
        </button>
      </div>
    `;

    root.appendChild(topBar);

    // 2. Editor Workspace Area
    const workspace = document.createElement('div');
    workspace.id = 'editor-workspace';
    workspace.style.cssText = 'flex: 1; display: flex; overflow: hidden; position: relative;';
    root.appendChild(workspace);

    this.container.appendChild(root);

    this.renderTabs();
    this.renderActiveView();
    this.wireTopButtons();
  }

  private renderTabs(): void {
    const tabContainer = this.container.querySelector('#editor-tabs-container');
    if (!tabContainer) return;
    tabContainer.innerHTML = '';

    const tabs: { id: EditorViewTab; label: string }[] = [
      { id: 'flowchart', label: '📊 Flowchart (流程图)' },
      { id: 'mindmap', label: '🧠 Mindmap (导图)' },
      { id: 'blocks', label: '🧱 Blocks (积木)' },
      { id: 'tilemap', label: '🗺️ Map (瓦片地图)' },
      { id: 'characters', label: '👥 Characters (角色)' },
      { id: 'database', label: '🗄️ Database (数据库)' },
      { id: 'messages', label: '💬 Messages (手机)' },
      { id: 'debate', label: '⚖️ Debate (辩论)' },
      { id: 'title', label: '🎨 Title (标题)' },
      { id: 'plugins', label: '🔌 Plugins (插件)' },
    ];

    tabs.forEach((t) => {
      const btn = document.createElement('button');
      const isAct = this.currentTab === t.id;
      btn.innerText = t.label;
      btn.style.cssText = `
        padding: 6px 12px; font-size: 12px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer;
        background: ${isAct ? '#1e263d' : 'transparent'}; color: ${isAct ? '#64b5f6' : '#aaa'}; transition: 0.2s;
      `;
      btn.onclick = () => {
        this.currentTab = t.id;
        this.renderTabs();
        this.renderActiveView();
      };
      tabContainer.appendChild(btn);
    });
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
        <h4 style="margin: 0; color: #64b5f6;">Node Inspector</h4>
        <button id="close-inspector" style="background: none; border: none; color: #aaa; cursor: pointer;">✕</button>
      </div>
      <div>
        <label style="font-size: 11px; color: #aaa;">Node ID</label>
        <div style="font-family: monospace; font-size: 12px; color: #ffd54f;">${node.id}</div>
      </div>
      <div>
        <label style="font-size: 11px; color: #aaa;">Title</label>
        <input id="node-title-inp" type="text" value="${node.title}" style="width: 100%; padding: 6px; background: #1f2538; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 2px;">
      </div>
      <div>
        <label style="font-size: 11px; color: #aaa;">Type</label>
        <select id="node-type-sel" style="width: 100%; padding: 6px; background: #1f2538; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 2px;">
          <option value="dialogue" ${node.type === 'dialogue' ? 'selected' : ''}>Dialogue</option>
          <option value="event" ${node.type === 'event' ? 'selected' : ''}>Event Sequence</option>
          <option value="choice" ${node.type === 'choice' ? 'selected' : ''}>Choices Branch</option>
          <option value="switch_mode" ${node.type === 'switch_mode' ? 'selected' : ''}>Switch Game Mode (§6.2)</option>
          <option value="battle" ${node.type === 'battle' ? 'selected' : ''}>RPG Battle</option>
          <option value="debate" ${node.type === 'debate' ? 'selected' : ''}>Debate Trial</option>
        </select>
      </div>
      <div id="inspector-type-specific"></div>
    `;

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
          <div style="font-weight: bold; color: #ff80ab; font-size: 12px; margin-bottom: 6px;">Mode Switch Settings (§6.2)</div>
          <label style="font-size: 11px; color: #aaa;">Target Mode ID</label>
          <select id="inp-target-mode" style="width: 100%; padding: 4px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 2px;">
            <option value="avg" ${node.data?.targetModeId === 'avg' ? 'selected' : ''}>AVG Mode</option>
            <option value="rpg" ${node.data?.targetModeId === 'rpg' ? 'selected' : ''}>RPG Mode</option>
            <option value="debate" ${node.data?.targetModeId === 'debate' ? 'selected' : ''}>Debate Mode</option>
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
          <label style="font-size: 11px; color: #aaa;">Dialogue Text</label>
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
      <span>🎮 Playtest Session: ${this.projectData.manifest.name}</span>
      <button id="close-playtest-btn" style="background: none; border: none; color: #ff5252; font-size: 18px; cursor: pointer;">✕</button>
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
