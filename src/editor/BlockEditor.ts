import type { EventCommand } from '../engine/types';

export class BlockEditor {
  private container: HTMLElement;
  private commands: EventCommand[];
  public onChange?: (commands: EventCommand[]) => void;

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
    root.className = 'ese-block-editor';
    root.style.cssText = `
      width: 100%; height: 100%; display: flex; flex-direction: column;
      background: #151928; color: #fff; font-family: sans-serif;
    `;

    // Toolbar for adding new blocks
    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'padding: 12px 16px; background: #1c2237; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; gap: 8px; flex-wrap: wrap; align-items: center;';
    toolbar.innerHTML = '<span style="font-size: 13px; font-weight: bold; color: #90caf9; margin-right: 6px;">+ 添加指令积木:</span>';

    const btnStyle = 'padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 6px; border: none; cursor: pointer; color: #fff; transition: opacity 0.2s;';

    const addTextBtn = document.createElement('button');
    addTextBtn.innerText = '文字对话';
    addTextBtn.style.cssText = btnStyle + 'background: #1976d2;';
    addTextBtn.onclick = () => this.addCommand('show_text', { characterName: '旁白', text: '新对话台词文本' });

    const addChoiceBtn = document.createElement('button');
    addChoiceBtn.innerText = '分支选项';
    addChoiceBtn.style.cssText = btnStyle + 'background: #00897b;';
    addChoiceBtn.onclick = () => this.addCommand('show_choices', { prompt: '请选择行动:', choices: [{ label: '选项一' }, { label: '选项二' }] });

    const addBranchBtn = document.createElement('button');
    addBranchBtn.innerText = '条件分支';
    addBranchBtn.style.cssText = btnStyle + 'background: #f57c00;';
    addBranchBtn.onclick = () => this.addCommand('conditional_branch', { condition: { switches: [{ key: 'flag1', value: true }] }, thenCommands: [] });

    const addModeBtn = document.createElement('button');
    addModeBtn.innerText = '切换游戏模式';
    addModeBtn.style.cssText = btnStyle + 'background: #e91e63;';
    addModeBtn.onclick = () => this.addCommand('switch_mode', { targetModeId: 'rpg', params: { mapId: 'town_square' } });

    const addSwitchBtn = document.createElement('button');
    addSwitchBtn.innerText = '开关/变量控制';
    addSwitchBtn.style.cssText = btnStyle + 'background: #7b1fa2;';
    addSwitchBtn.onclick = () => this.addCommand('control_switches', { key: 'plot_flag', value: true });

    const addAudioBtn = document.createElement('button');
    addAudioBtn.innerText = '播放音效/BGM';
    addAudioBtn.style.cssText = btnStyle + 'background: #388e3c;';
    addAudioBtn.onclick = () => this.addCommand('play_se', { track: 'confirm' });

    toolbar.append(addTextBtn, addChoiceBtn, addBranchBtn, addModeBtn, addSwitchBtn, addAudioBtn);
    root.appendChild(toolbar);

    // Command List Canvas / Blocks Stack
    const list = document.createElement('div');
    list.style.cssText = 'flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 8px;';

    if (this.commands.length === 0) {
      list.innerHTML = '<div style="color: #777; text-align: center; padding: 40px;">暂无指令积木。点击上方按钮向事件序列添加指令积木。</div>';
    } else {
      this.commands.forEach((cmd, idx) => {
        const block = this.renderCommandBlock(cmd, idx);
        list.appendChild(block);
      });
    }

    root.appendChild(list);
    this.container.appendChild(root);
  }

  private addCommand(code: string, parameters: any): void {
    this.commands.push({ code, parameters });
    if (this.onChange) this.onChange(this.commands);
    this.render();
  }

  private moveCommand(fromIndex: number, delta: number): void {
    const toIndex = fromIndex + delta;
    if (toIndex < 0 || toIndex >= this.commands.length) return;
    const item = this.commands.splice(fromIndex, 1)[0];
    this.commands.splice(toIndex, 0, item);
    if (this.onChange) this.onChange(this.commands);
    this.render();
  }

  private deleteCommand(index: number): void {
    this.commands.splice(index, 1);
    if (this.onChange) this.onChange(this.commands);
    this.render();
  }

  private renderCommandBlock(cmd: EventCommand, index: number): HTMLElement {
    const block = document.createElement('div');

    let borderColor = '#1976d2';
    let blockTitle = '显示台词文字';
    if (cmd.code === 'switch_mode') {
      borderColor = '#e91e63';
      blockTitle = '切换游戏模式';
    } else if (cmd.code === 'show_choices') {
      borderColor = '#00897b';
      blockTitle = '显示分支选项';
    } else if (cmd.code === 'conditional_branch') {
      borderColor = '#f57c00';
      blockTitle = '条件分支';
    } else if (cmd.code === 'control_switches' || cmd.code === 'control_variables') {
      borderColor = '#7b1fa2';
      blockTitle = '变量/开关操作';
    } else if (cmd.code.includes('bgm') || cmd.code.includes('se')) {
      borderColor = '#388e3c';
      blockTitle = '音频播放控制';
    }

    block.style.cssText = `
      background: #1b2033; border-left: 5px solid ${borderColor};
      border-radius: 6px; padding: 10px 14px; display: flex;
      justify-content: space-between; align-items: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    `;

    // Block details
    const content = document.createElement('div');
    content.style.cssText = 'flex: 1;';
    content.innerHTML = `
      <div style="font-weight: bold; font-size: 13px; color: ${borderColor};">${index + 1}. [${blockTitle}]</div>
      <div style="font-size: 13px; color: #ddd; margin-top: 4px;">${this.formatCommandParameters(cmd)}</div>
    `;

    // Action Controls (Up, Down, Delete)
    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; gap: 6px; align-items: center;';

    const upBtn = document.createElement('button');
    upBtn.innerText = '▲ 上移';
    upBtn.style.cssText = 'background: #2a3350; border: none; border-radius: 4px; color: #fff; cursor: pointer; padding: 4px 8px; font-size: 11px;';
    upBtn.onclick = () => this.moveCommand(index, -1);

    const downBtn = document.createElement('button');
    downBtn.innerText = '▼ 下移';
    downBtn.style.cssText = 'background: #2a3350; border: none; border-radius: 4px; color: #fff; cursor: pointer; padding: 4px 8px; font-size: 11px;';
    downBtn.onclick = () => this.moveCommand(index, 1);

    const delBtn = document.createElement('button');
    delBtn.innerText = '✕ 删除';
    delBtn.style.cssText = 'background: #c62828; border: none; border-radius: 4px; color: #fff; cursor: pointer; padding: 4px 8px; font-size: 11px;';
    delBtn.onclick = () => this.deleteCommand(index);

    actions.append(upBtn, downBtn, delBtn);
    block.append(content, actions);
    return block;
  }

  private formatCommandParameters(cmd: EventCommand): string {
    if (cmd.code === 'show_text') {
      return `${cmd.parameters.characterName || '旁白'}: "${cmd.parameters.text || ''}"`;
    }
    if (cmd.code === 'switch_mode') {
      return `目标模式: <b>${cmd.parameters.targetModeId}</b>`;
    }
    if (cmd.code === 'show_choices') {
      const choices = cmd.parameters.choices || [];
      return `提示: "${cmd.parameters.prompt || ''}" | 分支项: [${choices.map((c: any) => c.label).join(', ')}]`;
    }
    return JSON.stringify(cmd.parameters);
  }
}
