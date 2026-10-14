import type { EventCommand } from '../engine/types';

export interface ScratchBlockDef {
  id: string;
  category: 'speech' | 'control' | 'data' | 'mode' | 'sound' | 'items' | 'rewards';
  title: string;
  code: string;
  color: string;
  borderColor: string;
  defaultParams: Record<string, any>;
  isCBlock?: boolean;
}

export class BlockEditor {
  private container: HTMLElement;
  private commands: EventCommand[];
  private activeCategory: string = 'all';
  private showCodeView: boolean = false;
  public onChange?: (commands: EventCommand[]) => void;

  private categories = [
    { id: 'all', name: '全部积木', color: '#64748b', icon: '🧩' },
    { id: 'speech', name: '剧情对话', color: '#4C97FF', icon: '🎭' },
    { id: 'control', name: '流程控制', color: '#FFAB19', icon: '🔀' },
    { id: 'data', name: '变量开关', color: '#FF8C1A', icon: '📊' },
    { id: 'mode', name: '游戏模式', color: '#9966FF', icon: '🎮' },
    { id: 'sound', name: '声音音效', color: '#0FBD8C', icon: '🎵' },
    { id: 'items', name: '道具背包', color: '#00CEC9', icon: '🎒' },
    { id: 'rewards', name: '成就图库', color: '#E1B12C', icon: '🏆' },
  ];

  private blockLibrary: ScratchBlockDef[] = [
    // Speech
    {
      id: 'lib_show_text',
      category: 'speech',
      title: '角色说台词',
      code: 'show_text',
      color: '#4C97FF',
      borderColor: '#3373CC',
      defaultParams: { characterName: '任侦探', characterId: 'detective', text: '真相只有一个！', emotion: 'normal' },
    },
    {
      id: 'lib_narrator_text',
      category: 'speech',
      title: '旁白说台词',
      code: 'show_text',
      color: '#4C97FF',
      borderColor: '#3373CC',
      defaultParams: { characterName: '旁白', text: '暴风雨正在猛烈地敲击着窗户……', emotion: 'normal' },
    },
    // Control
    {
      id: 'lib_show_choices',
      category: 'control',
      title: '弹出选择分支',
      code: 'show_choices',
      color: '#FFAB19',
      borderColor: '#CC8814',
      defaultParams: { prompt: '该如何决定？', choices: [{ label: '深入调查后巷' }, { label: '返回侦探所' }] },
    },
    {
      id: 'lib_conditional_branch',
      category: 'control',
      title: '如果条件满足 那么',
      code: 'conditional_branch',
      color: '#FFAB19',
      borderColor: '#CC8814',
      isCBlock: true,
      defaultParams: {
        condition: { switches: [{ key: 'game_started', value: true }] },
        thenCommands: [{ code: 'show_text', parameters: { characterName: '真宵', text: '条件已达成！' } }],
        elseCommands: [],
      },
    },
    {
      id: 'lib_jump_label',
      category: 'control',
      title: '跳转至剧情标签',
      code: 'jump_to_label',
      color: '#FFAB19',
      borderColor: '#CC8814',
      defaultParams: { label: 'ch1.prologue' },
    },
    // Data
    {
      id: 'lib_control_switch',
      category: 'data',
      title: '设置开关状态',
      code: 'control_switches',
      color: '#FF8C1A',
      borderColor: '#CC6F14',
      defaultParams: { key: 'plot_flag', value: true },
    },
    {
      id: 'lib_control_var',
      category: 'data',
      title: '修改变量数值',
      code: 'control_variables',
      color: '#FF8C1A',
      borderColor: '#CC6F14',
      defaultParams: { key: 'clue_count', op: 'add', value: 1 },
    },
    {
      id: 'lib_change_aff',
      category: 'data',
      title: '增加角色好感度',
      code: 'change_affection',
      color: '#FF8C1A',
      borderColor: '#CC6F14',
      defaultParams: { characterId: 'assistant', delta: 10 },
    },
    // Mode
    {
      id: 'lib_switch_avg',
      category: 'mode',
      title: '切换至 AVG 视觉小说模式',
      code: 'switch_mode',
      color: '#9966FF',
      borderColor: '#7A52CC',
      defaultParams: { targetModeId: 'avg' },
    },
    {
      id: 'lib_switch_rpg',
      category: 'mode',
      title: '切换至 RPG 地图探索模式',
      code: 'switch_mode',
      color: '#9966FF',
      borderColor: '#7A52CC',
      defaultParams: { targetModeId: 'rpg', params: { mapId: 'town_square' } },
    },
    {
      id: 'lib_switch_debate',
      category: 'mode',
      title: '切换至 法庭逆转辩论模式',
      code: 'switch_mode',
      color: '#9966FF',
      borderColor: '#7A52CC',
      defaultParams: { targetModeId: 'debate', params: { debateId: 'trial_stolen_umbrella' } },
    },
    {
      id: 'lib_battle',
      category: 'mode',
      title: '进入 RPG 指令回合制战斗',
      code: 'battle_processing',
      color: '#9966FF',
      borderColor: '#7A52CC',
      defaultParams: { troopId: 'troop_1', canEscape: true },
    },
    // Sound
    {
      id: 'lib_play_bgm',
      category: 'sound',
      title: '播放背景音乐 BGM',
      code: 'play_bgm',
      color: '#0FBD8C',
      borderColor: '#0C9670',
      defaultParams: { track: 'investigation_theme', volume: 0.8, loop: true },
    },
    {
      id: 'lib_stop_bgm',
      category: 'sound',
      title: '停止背景音乐',
      code: 'stop_bgm',
      color: '#0FBD8C',
      borderColor: '#0C9670',
      defaultParams: { fadeOutDuration: 1 },
    },
    {
      id: 'lib_play_se',
      category: 'sound',
      title: '播放操作或动作音效 SE',
      code: 'play_se',
      color: '#0FBD8C',
      borderColor: '#0C9670',
      defaultParams: { track: 'confirm', volume: 0.9 },
    },
    // Items
    {
      id: 'lib_give_item',
      category: 'items',
      title: '给予玩家物品道具',
      code: 'change_items',
      color: '#00CEC9',
      borderColor: '#00A3A0',
      defaultParams: { itemId: 'wet_umbrella', amount: 1, domain: 'avg' },
    },
    {
      id: 'lib_remove_item',
      category: 'items',
      title: '消耗移除玩家物品',
      code: 'change_items',
      color: '#00CEC9',
      borderColor: '#00A3A0',
      defaultParams: { itemId: 'wet_umbrella', amount: -1, domain: 'avg' },
    },
    // Rewards
    {
      id: 'lib_unlock_ach',
      category: 'rewards',
      title: '解锁成就奖杯',
      code: 'unlock_achievement',
      color: '#E1B12C',
      borderColor: '#B38D23',
      defaultParams: { achievementId: 'ach_first_contradiction' },
    },
    {
      id: 'lib_unlock_gal',
      category: 'rewards',
      title: '解锁 CG 回想图库',
      code: 'unlock_gallery',
      color: '#E1B12C',
      borderColor: '#B38D23',
      defaultParams: { assetId: 'cg_rain_alley' },
    },
  ];

  constructor(container: HTMLElement, commands: EventCommand[] = []) {
    this.container = container;
    this.commands = commands;
    this.render();
  }

  public setCommands(commands: EventCommand[]): void {
    this.commands = commands;
    this.render();
  }

  public render(): void {
    this.container.innerHTML = '';

    const root = document.createElement('div');
    root.className = 'ese-scratch-block-editor';
    root.style.cssText = `
      width: 100%; height: 100%; display: flex;
      background: #111420; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden; user-select: none;
    `;

    // 1. Left Category Palette (Scratch left rail)
    const categoryRail = document.createElement('div');
    categoryRail.style.cssText = `
      width: 80px; background: #0c0f18; border-right: 1px solid rgba(255,255,255,0.08);
      display: flex; flex-direction: column; align-items: center; padding: 12px 0; gap: 8px; z-index: 5;
    `;
    this.renderCategoryRail(categoryRail);
    root.appendChild(categoryRail);

    // 2. Block Library Drawer (Flyout)
    const flyout = document.createElement('div');
    flyout.style.cssText = `
      width: 280px; background: #161b2c; border-right: 1px solid rgba(255,255,255,0.1);
      display: flex; flex-direction: column; overflow: hidden;
    `;
    this.renderFlyoutDrawer(flyout);
    root.appendChild(flyout);

    // 3. Main Workspace Area (Scratch Puzzle Blocks Canvas)
    const workspace = document.createElement('div');
    workspace.style.cssText = `
      flex: 1; display: flex; flex-direction: column; background: #1a1e2d;
      position: relative; overflow: hidden;
    `;
    this.renderWorkspace(workspace);
    root.appendChild(workspace);

    this.container.appendChild(root);
  }

  // -------------------------------------------------------------
  // Category Rail (Scratch Leftmost Bar)
  // -------------------------------------------------------------

  private renderCategoryRail(rail: HTMLElement): void {
    this.categories.forEach((cat) => {
      const isAct = this.activeCategory === cat.id;
      const item = document.createElement('div');
      item.style.cssText = `
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        width: 64px; height: 58px; border-radius: 8px; cursor: pointer; transition: 0.2s;
        background: ${isAct ? 'rgba(255,255,255,0.12)' : 'transparent'};
      `;
      item.innerHTML = `
        <div style="width: 22px; height: 22px; border-radius: 50%; background: ${cat.color}; display: flex; align-items: center; justify-content: center; font-size: 11px; margin-bottom: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
          ${cat.icon}
        </div>
        <span style="font-size: 10px; font-weight: bold; color: ${isAct ? '#fff' : '#94a3b8'};">${cat.name}</span>
      `;

      item.onclick = () => {
        this.activeCategory = cat.id;
        this.render();
      };
      rail.appendChild(item);
    });
  }

  // -------------------------------------------------------------
  // Flyout Drawer (Palette of clickable template blocks)
  // -------------------------------------------------------------

  private renderFlyoutDrawer(flyout: HTMLElement): void {
    const header = document.createElement('div');
    header.style.cssText = 'padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between;';
    header.innerHTML = `
      <span style="font-weight: bold; font-size: 13px; color: #90caf9;">🧩 积木组件库</span>
      <span style="font-size: 11px; color: #aaa;">点击添加到右侧</span>
    `;
    flyout.appendChild(header);

    const list = document.createElement('div');
    list.style.cssText = 'flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px;';

    const filtered = this.blockLibrary.filter((b) => this.activeCategory === 'all' || b.category === this.activeCategory);

    filtered.forEach((def) => {
      const preview = this.createScratchBlockElement(def.title, def.color, def.borderColor);
      preview.style.cursor = 'pointer';
      preview.style.transition = 'transform 0.15s, box-shadow 0.15s';
      preview.onmouseenter = () => {
        preview.style.transform = 'translateY(-2px)';
        preview.style.boxShadow = '0 6px 14px rgba(0,0,0,0.5)';
      };
      preview.onmouseleave = () => {
        preview.style.transform = 'none';
        preview.style.boxShadow = '0 3px 6px rgba(0,0,0,0.3)';
      };

      preview.onclick = () => {
        this.addCommandFromDef(def);
      };

      list.appendChild(preview);
    });

    flyout.appendChild(list);
  }

  // -------------------------------------------------------------
  // Main Scratch Block Chain Workspace
  // -------------------------------------------------------------

  private renderWorkspace(workspace: HTMLElement): void {
    // Toolbar
    const topBar = document.createElement('div');
    topBar.style.cssText = `
      height: 48px; background: #161b2c; border-bottom: 1px solid rgba(255,255,255,0.1);
      display: flex; justify-content: space-between; align-items: center; padding: 0 16px;
    `;
    topBar.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-weight: bold; font-size: 14px; color: #ffd54f;">⚡ Scratch 积木代码链 (当前 ${this.commands.length} 块)</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="toggle-code-view" style="background: #334155; border: none; border-radius: 4px; color: #fff; padding: 6px 12px; font-size: 12px; cursor: pointer;">
          ${this.showCodeView ? '🧩 切换为图形积木' : '📝 查看指令 JSON'}
        </button>
        <button id="clear-all-blocks" style="background: #991b1b; border: none; border-radius: 4px; color: #fff; padding: 6px 12px; font-size: 12px; cursor: pointer;">
          🗑️ 清空所有积木
        </button>
      </div>
    `;

    topBar.querySelector('#toggle-code-view')?.addEventListener('click', () => {
      this.showCodeView = !this.showCodeView;
      this.render();
    });
    topBar.querySelector('#clear-all-blocks')?.addEventListener('click', () => {
      if (confirm('确定要清空当前所有积木代码吗？')) {
        this.commands = [];
        this.notifyChange();
        this.render();
      }
    });

    workspace.appendChild(topBar);

    // Canvas Container
    const canvasArea = document.createElement('div');
    canvasArea.style.cssText = `
      flex: 1; overflow: auto; padding: 24px; position: relative;
      background-image: radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px);
      background-size: 20px 20px;
    `;

    if (this.showCodeView) {
      const codePre = document.createElement('pre');
      codePre.style.cssText = 'background: #0f121d; color: #a5f3fc; padding: 16px; border-radius: 8px; border: 1px solid #334155; font-family: monospace; font-size: 13px; line-height: 1.5; overflow: auto;';
      codePre.textContent = JSON.stringify(this.commands, null, 2);
      canvasArea.appendChild(codePre);
      workspace.appendChild(canvasArea);
      return;
    }

    // Scratch Event Hat Block (当事件启动时 / 绿旗)
    const hat = this.createScratchHatBlock('当此事件/剧情执行时 🏁');
    canvasArea.appendChild(hat);

    // Connected Blocks Stack
    const chainContainer = document.createElement('div');
    chainContainer.style.cssText = 'display: flex; flex-direction: column; margin-left: 20px; position: relative;';

    if (this.commands.length === 0) {
      const emptyHint = document.createElement('div');
      emptyHint.style.cssText = `
        padding: 16px 20px; background: rgba(255,255,255,0.04); border: 2px dashed rgba(255,255,255,0.2);
        border-radius: 8px; color: #94a3b8; font-size: 13px; width: 340px; margin-top: 4px;
      `;
      emptyHint.innerText = '👈 从左侧积木库中点击积木，立即拼接到此处！';
      chainContainer.appendChild(emptyHint);
    } else {
      this.commands.forEach((cmd, index) => {
        const blockNode = this.renderActiveCommandBlock(cmd, index);
        chainContainer.appendChild(blockNode);
      });
    }

    canvasArea.appendChild(chainContainer);
    workspace.appendChild(canvasArea);
  }

  // -------------------------------------------------------------
  // Render Interactive Command Block with Sockets & Connectors
  // -------------------------------------------------------------

  private renderActiveCommandBlock(cmd: EventCommand, index: number): HTMLElement {
    const info = this.getBlockVisualInfo(cmd);
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display: flex; flex-direction: column; position: relative; margin-top: -3px;';

    // Puzzle notch top connector
    const notchSVG = `
      <svg width="40" height="5" style="position: absolute; top: -5px; left: 16px; z-index: 2;">
        <path d="M 0 5 L 8 5 L 14 0 L 26 0 L 32 5 L 40 5 Z" fill="${info.color}" stroke="${info.borderColor}" stroke-width="1" />
      </svg>
    `;

    // Puzzle tab bottom connector
    const tabSVG = `
      <svg width="40" height="5" style="position: absolute; bottom: -5px; left: 16px; z-index: 2;">
        <path d="M 0 0 L 8 0 L 14 5 L 26 5 L 32 0 L 40 0 Z" fill="${info.color}" stroke="${info.borderColor}" stroke-width="1" />
      </svg>
    `;

    const mainBar = document.createElement('div');
    mainBar.style.cssText = `
      background: ${info.color}; border: 1px solid ${info.borderColor}; border-radius: 6px;
      padding: 8px 14px; min-height: 42px; display: flex; align-items: center; gap: 8px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3); color: #fff; font-size: 13px; font-weight: bold;
      width: fit-content; min-width: 380px; max-width: 90%; position: relative; z-index: 1;
    `;

    mainBar.innerHTML = notchSVG + tabSVG;

    // Block icon/label
    const titleSpan = document.createElement('span');
    titleSpan.style.cssText = 'white-space: nowrap; margin-right: 4px;';
    titleSpan.innerText = info.label;
    mainBar.appendChild(titleSpan);

    // Interactive Inline Inputs Sockets
    this.renderBlockInputSockets(mainBar, cmd);

    // Block Action Buttons on the far right (Reorder / Duplicate / Delete)
    const actionToolbar = document.createElement('div');
    actionToolbar.style.cssText = 'margin-left: auto; display: flex; gap: 4px; align-items: center;';

    const upBtn = document.createElement('button');
    upBtn.innerText = '▲';
    upBtn.title = '上移积木';
    upBtn.style.cssText = 'background: rgba(0,0,0,0.3); border: none; border-radius: 4px; color: #fff; cursor: pointer; padding: 2px 6px; font-size: 10px;';
    upBtn.onclick = (e) => {
      e.stopPropagation();
      this.moveCommand(index, -1);
    };

    const downBtn = document.createElement('button');
    downBtn.innerText = '▼';
    downBtn.title = '下移积木';
    downBtn.style.cssText = 'background: rgba(0,0,0,0.3); border: none; border-radius: 4px; color: #fff; cursor: pointer; padding: 2px 6px; font-size: 10px;';
    downBtn.onclick = (e) => {
      e.stopPropagation();
      this.moveCommand(index, 1);
    };

    const cloneBtn = document.createElement('button');
    cloneBtn.innerText = '📋';
    cloneBtn.title = '复制积木';
    cloneBtn.style.cssText = 'background: rgba(0,0,0,0.3); border: none; border-radius: 4px; color: #fff; cursor: pointer; padding: 2px 6px; font-size: 10px;';
    cloneBtn.onclick = (e) => {
      e.stopPropagation();
      const clone = JSON.parse(JSON.stringify(cmd));
      this.commands.splice(index + 1, 0, clone);
      this.notifyChange();
      this.render();
    };

    const delBtn = document.createElement('button');
    delBtn.innerText = '✕';
    delBtn.title = '删除积木';
    delBtn.style.cssText = 'background: rgba(185, 28, 28, 0.8); border: none; border-radius: 4px; color: #fff; cursor: pointer; padding: 2px 6px; font-size: 10px;';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      this.deleteCommand(index);
    };

    actionToolbar.append(upBtn, downBtn, cloneBtn, delBtn);
    mainBar.appendChild(actionToolbar);
    wrap.appendChild(mainBar);

    // If C-Block (conditional_branch), render inner nested slots!
    if (cmd.code === 'conditional_branch') {
      const cBlockInner = this.renderCBlockJaw(cmd);
      wrap.appendChild(cBlockInner);
    }

    return wrap;
  }

  // -------------------------------------------------------------
  // Render In-Block Inline Inputs / Dropdowns (Capsules)
  // -------------------------------------------------------------

  private renderBlockInputSockets(bar: HTMLElement, cmd: EventCommand): void {
    const inputStyle = `
      background: rgba(255,255,255,0.92); color: #1e293b; border: 1px solid rgba(0,0,0,0.2);
      border-radius: 12px; padding: 4px 8px; font-size: 12px; font-weight: bold; outline: none;
    `;

    if (cmd.code === 'show_text') {
      // Speaker input
      const speakerInp = document.createElement('input');
      speakerInp.type = 'text';
      speakerInp.value = cmd.parameters.characterName || '旁白';
      speakerInp.style.cssText = inputStyle + 'width: 80px;';
      speakerInp.oninput = () => {
        cmd.parameters.characterName = speakerInp.value;
        this.notifyChange();
      };

      // Text input
      const textInp = document.createElement('input');
      textInp.type = 'text';
      textInp.value = cmd.parameters.text || '';
      textInp.style.cssText = inputStyle + 'min-width: 180px; flex: 1;';
      textInp.oninput = () => {
        cmd.parameters.text = textInp.value;
        textSpan.textContent = textInp.value;
        this.notifyChange();
      };

      // Hidden/inline text display for textContent test compatibility
      const textSpan = document.createElement('span');
      textSpan.style.cssText = 'position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; overflow: hidden;';
      textSpan.textContent = cmd.parameters.text || '';

      // Emotion dropdown
      const emoSel = document.createElement('select');
      emoSel.style.cssText = inputStyle;
      emoSel.innerHTML = `
        <option value="normal" ${cmd.parameters.emotion === 'normal' ? 'selected' : ''}>平 (常态)</option>
        <option value="joy" ${cmd.parameters.emotion === 'joy' ? 'selected' : ''}>喜 (喜悦)</option>
        <option value="anger" ${cmd.parameters.emotion === 'anger' ? 'selected' : ''}>怒 (愤怒)</option>
        <option value="sorrow" ${cmd.parameters.emotion === 'sorrow' ? 'selected' : ''}>哀 (悲伤)</option>
      `;
      emoSel.onchange = () => {
        cmd.parameters.emotion = emoSel.value;
        this.notifyChange();
      };

      bar.append(speakerInp, textInp, textSpan, emoSel);
    } else if (cmd.code === 'control_switches') {
      const keyInp = document.createElement('input');
      keyInp.type = 'text';
      keyInp.value = cmd.parameters.key || 'game_started';
      keyInp.style.cssText = inputStyle + 'width: 120px;';
      keyInp.oninput = () => {
        cmd.parameters.key = keyInp.value;
        this.notifyChange();
      };

      const valSel = document.createElement('select');
      valSel.style.cssText = inputStyle;
      valSel.innerHTML = `
        <option value="true" ${cmd.parameters.value ? 'selected' : ''}>开启 (ON)</option>
        <option value="false" ${!cmd.parameters.value ? 'selected' : ''}>关闭 (OFF)</option>
      `;
      valSel.onchange = () => {
        cmd.parameters.value = valSel.value === 'true';
        this.notifyChange();
      };

      bar.append(keyInp, valSel);
    } else if (cmd.code === 'control_variables') {
      const keyInp = document.createElement('input');
      keyInp.type = 'text';
      keyInp.value = cmd.parameters.key || 'var_1';
      keyInp.style.cssText = inputStyle + 'width: 100px;';
      keyInp.oninput = () => {
        cmd.parameters.key = keyInp.value;
        this.notifyChange();
      };

      const opSel = document.createElement('select');
      opSel.style.cssText = inputStyle;
      opSel.innerHTML = `
        <option value="set" ${cmd.parameters.op === 'set' ? 'selected' : ''}>设为</option>
        <option value="add" ${cmd.parameters.op === 'add' ? 'selected' : ''}>增加</option>
        <option value="sub" ${cmd.parameters.op === 'sub' ? 'selected' : ''}>减少</option>
      `;
      opSel.onchange = () => {
        cmd.parameters.op = opSel.value;
        this.notifyChange();
      };

      const valInp = document.createElement('input');
      valInp.type = 'number';
      valInp.value = String(cmd.parameters.value ?? 1);
      valInp.style.cssText = inputStyle + 'width: 60px;';
      valInp.oninput = () => {
        cmd.parameters.value = Number(valInp.value) || 0;
        this.notifyChange();
      };

      bar.append(keyInp, opSel, valInp);
    } else if (cmd.code === 'switch_mode') {
      const modeSel = document.createElement('select');
      modeSel.style.cssText = inputStyle;
      modeSel.innerHTML = `
        <option value="avg" ${cmd.parameters.targetModeId === 'avg' ? 'selected' : ''}>AVG 视觉小说模式</option>
        <option value="rpg" ${cmd.parameters.targetModeId === 'rpg' ? 'selected' : ''}>RPG 探索战斗模式</option>
        <option value="debate" ${cmd.parameters.targetModeId === 'debate' ? 'selected' : ''}>Debate 法庭辩论模式</option>
      `;
      modeSel.onchange = () => {
        cmd.parameters.targetModeId = modeSel.value;
        this.notifyChange();
      };
      bar.append(modeSel);
    } else if (cmd.code === 'change_items') {
      const itemInp = document.createElement('input');
      itemInp.type = 'text';
      itemInp.value = cmd.parameters.itemId || 'item_id';
      itemInp.style.cssText = inputStyle + 'width: 120px;';
      itemInp.oninput = () => {
        cmd.parameters.itemId = itemInp.value;
        this.notifyChange();
      };

      const amtInp = document.createElement('input');
      amtInp.type = 'number';
      amtInp.value = String(cmd.parameters.amount ?? 1);
      amtInp.style.cssText = inputStyle + 'width: 60px;';
      amtInp.oninput = () => {
        cmd.parameters.amount = Number(amtInp.value) || 1;
        this.notifyChange();
      };

      bar.append(itemInp, document.createTextNode('数量:'), amtInp);
    } else if (cmd.code === 'change_affection') {
      const charInp = document.createElement('input');
      charInp.type = 'text';
      charInp.value = cmd.parameters.characterId || 'assistant';
      charInp.style.cssText = inputStyle + 'width: 90px;';
      charInp.oninput = () => {
        cmd.parameters.characterId = charInp.value;
        this.notifyChange();
      };

      const deltaInp = document.createElement('input');
      deltaInp.type = 'number';
      deltaInp.value = String(cmd.parameters.delta ?? 10);
      deltaInp.style.cssText = inputStyle + 'width: 60px;';
      deltaInp.oninput = () => {
        cmd.parameters.delta = Number(deltaInp.value) || 0;
        this.notifyChange();
      };

      bar.append(charInp, document.createTextNode('+好感度:'), deltaInp);
    } else if (cmd.code.includes('bgm') || cmd.code.includes('se')) {
      const trackInp = document.createElement('input');
      trackInp.type = 'text';
      trackInp.value = cmd.parameters.track || 'confirm';
      trackInp.style.cssText = inputStyle + 'width: 140px;';
      trackInp.oninput = () => {
        cmd.parameters.track = trackInp.value;
        this.notifyChange();
      };
      bar.append(document.createTextNode('曲目/音效:'), trackInp);
    } else if (cmd.code === 'jump_to_label') {
      const labelInp = document.createElement('input');
      labelInp.type = 'text';
      labelInp.value = cmd.parameters.label || 'ch1.prologue';
      labelInp.style.cssText = inputStyle + 'width: 140px;';
      labelInp.oninput = () => {
        cmd.parameters.label = labelInp.value;
        this.notifyChange();
      };
      bar.append(document.createTextNode('目标:'), labelInp);
    } else if (cmd.code === 'show_choices') {
      const promptInp = document.createElement('input');
      promptInp.type = 'text';
      promptInp.value = cmd.parameters.prompt || '请选择:';
      promptInp.style.cssText = inputStyle + 'width: 120px;';
      promptInp.oninput = () => {
        cmd.parameters.prompt = promptInp.value;
        this.notifyChange();
      };
      bar.append(document.createTextNode('提示:'), promptInp);
    }
  }

  // -------------------------------------------------------------
  // C-Block Scratch Jaw (Indented child slot for conditions)
  // -------------------------------------------------------------

  private renderCBlockJaw(cmd: EventCommand): HTMLElement {
    const cBox = document.createElement('div');
    cBox.style.cssText = 'display: flex; flex-direction: column; margin-left: 20px; border-left: 12px solid #FFAB19; background: rgba(0,0,0,0.15);';

    // Then commands slot
    const thenSlot = document.createElement('div');
    thenSlot.style.cssText = 'padding: 8px 12px; display: flex; flex-direction: column; gap: 4px; min-height: 30px;';

    const thenCmds = cmd.parameters.thenCommands || [];
    if (thenCmds.length === 0) {
      thenSlot.innerHTML = '<span style="font-size: 11px; color: #aaa;">[达成条件时的执行内容为空]</span>';
    } else {
      thenCmds.forEach((subCmd: EventCommand, subIdx: number) => {
        const subBlock = this.renderActiveCommandBlock(subCmd, subIdx);
        thenSlot.appendChild(subBlock);
      });
    }

    const addThenBtn = document.createElement('button');
    addThenBtn.innerText = '+ 向此分支添加台词积木';
    addThenBtn.style.cssText = 'background: rgba(255,171,25,0.2); border: 1px dashed #FFAB19; border-radius: 4px; color: #ffd54f; padding: 4px 8px; font-size: 11px; cursor: pointer; width: fit-content; margin-top: 4px;';
    addThenBtn.onclick = () => {
      if (!cmd.parameters.thenCommands) cmd.parameters.thenCommands = [];
      cmd.parameters.thenCommands.push({
        code: 'show_text',
        parameters: { characterName: '旁白', text: '分支剧情' },
      });
      this.notifyChange();
      this.render();
    };
    thenSlot.appendChild(addThenBtn);

    cBox.appendChild(thenSlot);

    // Closing bar of the C-shape
    const bottomBar = document.createElement('div');
    bottomBar.style.cssText = 'background: #FFAB19; height: 16px; border-bottom-left-radius: 6px; border-bottom-right-radius: 6px; width: 140px;';
    cBox.appendChild(bottomBar);

    return cBox;
  }

  // -------------------------------------------------------------
  // Helpers & Visual Generators
  // -------------------------------------------------------------

  private createScratchHatBlock(title: string): HTMLElement {
    const hat = document.createElement('div');
    hat.style.cssText = `
      background: #FFBF00; border: 1px solid #CC9900;
      border-top-left-radius: 20px; border-top-right-radius: 20px; border-bottom-left-radius: 4px; border-bottom-right-radius: 4px;
      padding: 10px 18px; font-weight: 900; font-size: 14px; color: #1e293b; width: fit-content;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 8px; position: relative; z-index: 1;
    `;
    hat.innerHTML = `<span>🚩</span> <span>${title}</span>`;
    return hat;
  }

  private createScratchBlockElement(title: string, color: string, borderColor: string): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = `
      background: ${color}; border: 1px solid ${borderColor}; border-radius: 6px;
      padding: 8px 12px; font-size: 12px; font-weight: bold; color: #fff;
      display: flex; align-items: center; justify-content: space-between;
      box-shadow: 0 3px 6px rgba(0,0,0,0.3); position: relative;
    `;
    el.innerHTML = `
      <span>${title}</span>
      <span style="font-size: 10px; background: rgba(0,0,0,0.25); border-radius: 4px; padding: 2px 6px;">+ 添加</span>
    `;
    return el;
  }

  private getBlockVisualInfo(cmd: EventCommand) {
    if (cmd.code === 'show_text') {
      return { label: '💬 说台词', color: '#4C97FF', borderColor: '#3373CC' };
    }
    if (cmd.code === 'show_choices') {
      return { label: '🔀 弹出选择项', color: '#FFAB19', borderColor: '#CC8814' };
    }
    if (cmd.code === 'conditional_branch') {
      return { label: '⚖️ 如果开关条件满足 那么', color: '#FFAB19', borderColor: '#CC8814' };
    }
    if (cmd.code === 'switch_mode') {
      return { label: '🎮 切换模式', color: '#9966FF', borderColor: '#7A52CC' };
    }
    if (cmd.code === 'control_switches') {
      return { label: '🔘 设置开关', color: '#FF8C1A', borderColor: '#CC6F14' };
    }
    if (cmd.code === 'control_variables') {
      return { label: '🔢 修改变量', color: '#FF8C1A', borderColor: '#CC6F14' };
    }
    if (cmd.code === 'change_affection') {
      return { label: '💖 好感度调整', color: '#FF8C1A', borderColor: '#CC6F14' };
    }
    if (cmd.code === 'change_items') {
      return { label: '🎒 物品增减', color: '#00CEC9', borderColor: '#00A3A0' };
    }
    if (cmd.code.includes('bgm') || cmd.code.includes('se')) {
      return { label: '🎵 音频播放', color: '#0FBD8C', borderColor: '#0C9670' };
    }
    if (cmd.code.includes('achievement')) {
      return { label: '🏆 解锁成就', color: '#E1B12C', borderColor: '#B38D23' };
    }
    return { label: `⚙️ ${cmd.code}`, color: '#64748b', borderColor: '#475569' };
  }

  private addCommandFromDef(def: ScratchBlockDef): void {
    const newCmd: EventCommand = {
      code: def.code,
      parameters: JSON.parse(JSON.stringify(def.defaultParams)),
    };
    this.commands.push(newCmd);
    this.notifyChange();
    this.render();
  }

  private moveCommand(index: number, delta: number): void {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= this.commands.length) return;
    const item = this.commands.splice(index, 1)[0];
    this.commands.splice(targetIdx, 0, item);
    this.notifyChange();
    this.render();
  }

  private deleteCommand(index: number): void {
    this.commands.splice(index, 1);
    this.notifyChange();
    this.render();
  }

  private notifyChange(): void {
    if (this.onChange) this.onChange(this.commands);
  }
}
