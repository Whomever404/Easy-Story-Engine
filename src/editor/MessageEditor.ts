import type { MessageScript } from '../engine/types';

export class MessageEditor {
  private container: HTMLElement;
  private messages: Record<string, MessageScript>;
  private selectedId: string | null = null;
  public onChange?: () => void;

  constructor(container: HTMLElement, messages: Record<string, MessageScript>) {
    this.container = container;
    this.messages = messages;
    this.selectedId = Object.keys(messages)[0] || null;
    this.render();
  }

  public render(): void {
    this.container.innerHTML = '';
    const root = document.createElement('div');
    root.style.cssText = 'width: 100%; height: 100%; display: flex; background: #121522; color: #fff; font-family: sans-serif;';

    // Left List
    const sidebar = document.createElement('div');
    sidebar.style.cssText = 'width: 220px; background: #181d2e; border-right: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column;';

    const sHeader = document.createElement('div');
    sHeader.style.cssText = 'padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;';
    sHeader.innerHTML = '<span style="font-weight: bold; font-size: 13px;">手机短信剧本</span>';

    const addBtn = document.createElement('button');
    addBtn.innerText = '+ 新建剧本';
    addBtn.style.cssText = 'background: #2196f3; border: none; border-radius: 4px; color: #fff; padding: 4px 8px; font-size: 11px; cursor: pointer;';
    addBtn.onclick = () => {
      const newId = `msg_script_${Date.now()}`;
      this.messages[newId] = {
        id: newId,
        characterId: 'assistant',
        trigger: { switches: [{ key: 'trigger_phone', value: true }] },
        triggerOnce: true,
        messages: [
          {
            id: `m_${Date.now()}`,
            senderId: 'assistant',
            type: 'text',
            content: '侦探！需要什么帮助随时呼我。',
            replies: [{ id: 'r1', text: '收到，正在现场调查！' }],
          },
        ],
      };
      this.selectedId = newId;
      if (this.onChange) this.onChange();
      this.render();
    };
    sHeader.appendChild(addBtn);
    sidebar.appendChild(sHeader);

    const list = document.createElement('div');
    list.style.cssText = 'flex: 1; overflow-y: auto;';
    for (const [id, script] of Object.entries(this.messages)) {
      const item = document.createElement('div');
      const isSel = id === this.selectedId;
      item.style.cssText = `padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; background: ${isSel ? '#283593' : 'transparent'};`;
      item.innerHTML = `<div style="font-weight: bold; font-size: 13px;">${id}</div><div style="font-size: 11px; color: #aaa;">发件人: ${script.characterId}</div>`;
      item.onclick = () => {
        this.selectedId = id;
        this.render();
      };
      list.appendChild(item);
    }
    sidebar.appendChild(list);
    root.appendChild(sidebar);

    // Right details & messages tree
    const main = document.createElement('div');
    main.style.cssText = 'flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px;';

    if (!this.selectedId || !this.messages[this.selectedId]) {
      main.innerHTML = '<div style="color: #888;">请在左侧选择要编辑的手机剧本。</div>';
    } else {
      const script = this.messages[this.selectedId];
      main.innerHTML = `
        <h3 style="margin: 0; color: #64b5f6;">手机剧本详情: ${script.id}</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label style="font-size: 12px; color: #aaa;">发件人角色标识 (Character ID)</label>
            <input id="script-char" type="text" value="${script.characterId}" style="width: 100%; padding: 6px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 4px;">
          </div>
          <div>
            <label style="font-size: 12px; color: #aaa;">触发策略</label>
            <select id="script-once" style="width: 100%; padding: 6px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 4px;">
              <option value="true" ${script.triggerOnce ? 'selected' : ''}>仅触发一次 (Trigger Once)</option>
              <option value="false" ${!script.triggerOnce ? 'selected' : ''}>可重复触发 (Repeatable)</option>
            </select>
          </div>
        </div>

        <h4 style="margin: 12px 0 6px 0; color: #ffd54f;">会话气泡消息列表:</h4>
        <div id="messages-list" style="display: flex; flex-direction: column; gap: 10px;">
          ${script.messages
            .map(
              (m, i) => `
            <div style="padding: 12px; background: #1c2237; border-radius: 6px; border: 1px solid #3d496e;">
              <div style="font-weight: bold; font-size: 12px; color: #90caf9;">消息 ${i + 1} (${m.type === 'text' ? '文本气泡' : m.type})</div>
              <div style="margin-top: 6px; font-size: 13px; color: #fff;">"${m.content}"</div>
              ${m.replies?.length ? `<div style="font-size: 11px; color: #aaa; margin-top: 4px;">玩家回复项: [${m.replies.map((r) => r.text).join(', ')}]</div>` : ''}
            </div>
          `
            )
            .join('')}
        </div>
      `;

      main.querySelector('#script-char')?.addEventListener('input', (e: any) => {
        script.characterId = e.target.value;
        if (this.onChange) this.onChange();
      });
    }

    root.appendChild(main);
    this.container.appendChild(root);
  }
}
