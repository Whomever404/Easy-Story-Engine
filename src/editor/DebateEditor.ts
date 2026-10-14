import type { DebateScript } from '../engine/types';

export class DebateEditor {
  private container: HTMLElement;
  private debates: Record<string, DebateScript>;
  private selectedId: string | null = null;
  public onChange?: () => void;

  constructor(container: HTMLElement, debates: Record<string, DebateScript>) {
    this.container = container;
    this.debates = debates;
    this.selectedId = Object.keys(debates)[0] || null;
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
    sHeader.innerHTML = '<span style="font-weight: bold; font-size: 13px;">法庭辩论剧本</span>';

    const addBtn = document.createElement('button');
    addBtn.innerText = '+ 新建剧本';
    addBtn.style.cssText = 'background: #2196f3; border: none; border-radius: 4px; color: #fff; padding: 4px 8px; font-size: 11px; cursor: pointer;';
    addBtn.onclick = () => {
      const newId = `debate_${Date.now()}`;
      this.debates[newId] = {
        id: newId,
        title: '新法庭辩论证言',
        witnessId: 'suspect',
        penalty: 20,
        maxPressure: 100,
        sentences: [
          {
            id: 's1',
            speakerId: 'suspect',
            text: '案发当时我一直在家里休息，什么都不知道。',
            pressResponseText: '你确定一直在家吗？是的，我就在客厅看电视。',
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
    for (const [id, deb] of Object.entries(this.debates)) {
      const item = document.createElement('div');
      const isSel = id === this.selectedId;
      item.style.cssText = `padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; background: ${isSel ? '#283593' : 'transparent'};`;
      item.innerHTML = `<div style="font-weight: bold; font-size: 13px;">${deb.title}</div><div style="font-size: 11px; color: #aaa;">标识: ${deb.id}</div>`;
      item.onclick = () => {
        this.selectedId = id;
        this.render();
      };
      list.appendChild(item);
    }
    sidebar.appendChild(list);
    root.appendChild(sidebar);

    // Right details
    const main = document.createElement('div');
    main.style.cssText = 'flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px;';

    if (!this.selectedId || !this.debates[this.selectedId]) {
      main.innerHTML = '<div style="color: #888;">请在左侧选择辩论剧本进行编辑。</div>';
    } else {
      const deb = this.debates[this.selectedId];
      main.innerHTML = `
        <h3 style="margin: 0; color: #e91e63;">法庭质询剧本: ${deb.title}</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label style="font-size: 12px; color: #aaa;">辩论主题标题</label>
            <input id="deb-title-input" type="text" value="${deb.title}" style="width: 100%; padding: 6px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 4px;">
          </div>
          <div>
            <label style="font-size: 12px; color: #aaa;">出示错误惩罚 (扣除信心/压力值)</label>
            <input id="deb-penalty-input" type="number" value="${deb.penalty}" style="width: 100%; padding: 6px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 4px;">
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
          <h4 style="margin: 0; color: #64b5f6;">证人证言陈述序列</h4>
          <button id="add-sentence-btn" style="background: #1976d2; border: none; border-radius: 4px; color: #fff; padding: 4px 10px; font-size: 12px; cursor: pointer;">+ 添加证言语句</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${deb.sentences
            .map(
              (s, i) => `
            <div style="padding: 12px; background: #1c2237; border-radius: 6px; border: 1px solid ${s.contradictionEvidenceId ? '#f44336' : '#3d496e'};">
              <div style="display: flex; justify-content: space-between; font-size: 12px; color: #90caf9; margin-bottom: 6px;">
                <span>陈述句 ${i + 1}</span>
                ${s.contradictionEvidenceId ? `<span style="color: #f44336; font-weight: bold;">[矛盾突破点: ${s.contradictionEvidenceId}]</span>` : '<span style="color: #888;">[常规证词]</span>'}
              </div>
              <div style="font-size: 14px; color: #fff; margin-bottom: 6px;">"${s.text}"</div>
              <div style="font-size: 12px; color: #aaa;">威慑追问回应: "${s.pressResponseText}"</div>
            </div>
          `
            )
            .join('')}
        </div>
      `;

      main.querySelector('#deb-title-input')?.addEventListener('input', (e: any) => {
        deb.title = e.target.value;
        if (this.onChange) this.onChange();
      });

      main.querySelector('#add-sentence-btn')?.addEventListener('click', () => {
        deb.sentences.push({
          id: `s_${Date.now()}`,
          speakerId: deb.witnessId,
          text: 'New statement from witness.',
          pressResponseText: 'Witness elaborates further.',
        });
        if (this.onChange) this.onChange();
        this.render();
      });
    }

    root.appendChild(main);
    this.container.appendChild(root);
  }
}
