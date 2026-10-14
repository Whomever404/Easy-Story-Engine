import type { CharacterData } from '../engine/types';
import { ProjectValidator } from '../project/Validation';

export class CharacterEditor {
  private container: HTMLElement;
  private characters: Record<string, CharacterData>;
  private selectedId: string | null = null;
  public onChange?: () => void;

  constructor(container: HTMLElement, characters: Record<string, CharacterData>) {
    this.container = container;
    this.characters = characters;
    this.selectedId = Object.keys(characters)[0] || null;
    this.render();
  }

  public setCharacters(characters: Record<string, CharacterData>): void {
    this.characters = characters;
    if (!this.selectedId || !this.characters[this.selectedId]) {
      this.selectedId = Object.keys(characters)[0] || null;
    }
    this.render();
  }

  public render(): void {
    this.container.innerHTML = '';

    const root = document.createElement('div');
    root.style.cssText = 'width: 100%; height: 100%; display: flex; background: #121624; color: #fff; font-family: sans-serif;';

    // Left sidebar: Character List
    const sidebar = document.createElement('div');
    sidebar.style.cssText = 'width: 220px; background: #181d2e; border-right: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column;';

    const sideHeader = document.createElement('div');
    sideHeader.style.cssText = 'padding: 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1);';
    sideHeader.innerHTML = '<span style="font-weight: bold; font-size: 13px;">角色列表</span>';

    const addBtn = document.createElement('button');
    addBtn.innerText = '+ 新建角色';
    addBtn.style.cssText = 'background: #1976d2; border: none; border-radius: 4px; color: #fff; padding: 4px 8px; font-size: 11px; cursor: pointer;';
    addBtn.onclick = () => {
      const newId = `char_${Date.now()}`;
      this.characters[newId] = {
        id: newId,
        name: '新角色',
        initialAffection: 0,
        sprites: {
          portrait: { normal: 'normal.png', joy: 'joy.png', anger: 'anger.png', sorrow: 'sorrow.png' },
        },
      };
      this.selectedId = newId;
      if (this.onChange) this.onChange();
      this.render();
    };
    sideHeader.appendChild(addBtn);
    sidebar.appendChild(sideHeader);

    const list = document.createElement('div');
    list.style.cssText = 'flex: 1; overflow-y: auto;';
    for (const [id, char] of Object.entries(this.characters)) {
      const item = document.createElement('div');
      const isSel = id === this.selectedId;
      item.style.cssText = `
        padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05);
        cursor: pointer; background: ${isSel ? '#283593' : 'transparent'};
      `;
      item.innerHTML = `
        <div style="font-weight: bold; font-size: 14px;">${char.name}</div>
        <div style="font-size: 11px; color: #aaa;">标识: ${char.id}</div>
      `;
      item.onclick = () => {
        this.selectedId = id;
        this.render();
      };
      list.appendChild(item);
    }
    sidebar.appendChild(list);
    root.appendChild(sidebar);

    // Right form: Character Details & Facial Emotion Validator (§4.12)
    const main = document.createElement('div');
    main.style.cssText = 'flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 18px;';

    if (!this.selectedId || !this.characters[this.selectedId]) {
      main.innerHTML = '<div style="color: #888;">请在左侧选择或新建一个角色。</div>';
    } else {
      const char = this.characters[this.selectedId];
      const errors = ProjectValidator.validateCharacterEmotions(char);

      // Validation Warning Banner
      if (errors.length > 0) {
        const errorBox = document.createElement('div');
        errorBox.style.cssText = 'background: rgba(244, 67, 54, 0.15); border: 1px solid #f44336; border-radius: 8px; padding: 12px; color: #ff8a80; font-size: 13px;';
        errorBox.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 4px;">⚠️ 基础表情缺失警告（§4.12 强制基础表情集约束）:</div>
          ${errors.map((e) => `<div>• ${e.message}</div>`).join('')}
        `;
        main.appendChild(errorBox);
      }

      // Basic info inputs
      main.innerHTML += `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <label style="font-size: 12px; color: #aaa;">角色姓名</label>
            <input id="input-name" type="text" value="${char.name}" style="width: 100%; padding: 8px; background: #1c2237; border: 1px solid #3d496e; border-radius: 6px; color: #fff; margin-top: 4px;">
          </div>
          <div>
            <label style="font-size: 12px; color: #aaa;">初始好感度数值</label>
            <input id="input-aff" type="number" value="${char.initialAffection ?? 0}" style="width: 100%; padding: 8px; background: #1c2237; border: 1px solid #3d496e; border-radius: 6px; color: #fff; margin-top: 4px;">
          </div>
        </div>

        <div style="margin-top: 10px;">
          <h4 style="margin: 0 0 10px 0; color: #64b5f6;">基础表情槽位（喜怒哀乐四表情必须完整配置 §4.12）</h4>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
            <div style="background: #1c2237; padding: 10px; border-radius: 6px; border: 1px solid #3d496e;">
              <div style="font-weight: bold; color: #81c784; font-size: 12px;">常态 / 平 (Normal)</div>
              <input id="slot-normal" type="text" value="${char.sprites?.portrait?.normal || ''}" placeholder="素材ID或路径" style="width: 100%; padding: 6px; background: #111422; border: 1px solid #2d3753; border-radius: 4px; color: #fff; margin-top: 4px; font-size: 12px;">
            </div>
            <div style="background: #1c2237; padding: 10px; border-radius: 6px; border: 1px solid #3d496e;">
              <div style="font-weight: bold; color: #ffd54f; font-size: 12px;">喜悦 / 喜 (Joy)</div>
              <input id="slot-joy" type="text" value="${char.sprites?.portrait?.joy || ''}" placeholder="素材ID或路径" style="width: 100%; padding: 6px; background: #111422; border: 1px solid #2d3753; border-radius: 4px; color: #fff; margin-top: 4px; font-size: 12px;">
            </div>
            <div style="background: #1c2237; padding: 10px; border-radius: 6px; border: 1px solid #3d496e;">
              <div style="font-weight: bold; color: #e57373; font-size: 12px;">愤怒 / 怒 (Anger)</div>
              <input id="slot-anger" type="text" value="${char.sprites?.portrait?.anger || ''}" placeholder="素材ID或路径" style="width: 100%; padding: 6px; background: #111422; border: 1px solid #2d3753; border-radius: 4px; color: #fff; margin-top: 4px; font-size: 12px;">
            </div>
            <div style="background: #1c2237; padding: 10px; border-radius: 6px; border: 1px solid #3d496e;">
              <div style="font-weight: bold; color: #64b5f6; font-size: 12px;">悲哀 / 哀 (Sorrow)</div>
              <input id="slot-sorrow" type="text" value="${char.sprites?.portrait?.sorrow || ''}" placeholder="素材ID或路径" style="width: 100%; padding: 6px; background: #111422; border: 1px solid #2d3753; border-radius: 4px; color: #fff; margin-top: 4px; font-size: 12px;">
            </div>
          </div>
        </div>
      `;

      // Wire input listeners
      const nameInp = main.querySelector('#input-name') as HTMLInputElement;
      if (nameInp) {
        nameInp.oninput = () => {
          char.name = nameInp.value;
          if (this.onChange) this.onChange();
        };
      }

      const affInp = main.querySelector('#input-aff') as HTMLInputElement;
      if (affInp) {
        affInp.oninput = () => {
          char.initialAffection = Number(affInp.value) || 0;
          if (this.onChange) this.onChange();
        };
      }

      const updateEmotion = (emotion: string, val: string) => {
        if (!char.sprites) char.sprites = {};
        if (!char.sprites.portrait) char.sprites.portrait = { normal: '', joy: '', anger: '', sorrow: '' };
        char.sprites.portrait[emotion] = val;
        if (this.onChange) this.onChange();
      };

      main.querySelector('#slot-normal')?.addEventListener('input', (e: any) => updateEmotion('normal', e.target.value));
      main.querySelector('#slot-joy')?.addEventListener('input', (e: any) => updateEmotion('joy', e.target.value));
      main.querySelector('#slot-anger')?.addEventListener('input', (e: any) => updateEmotion('anger', e.target.value));
      main.querySelector('#slot-sorrow')?.addEventListener('input', (e: any) => updateEmotion('sorrow', e.target.value));
    }

    root.appendChild(main);
    this.container.appendChild(root);
  }
}
