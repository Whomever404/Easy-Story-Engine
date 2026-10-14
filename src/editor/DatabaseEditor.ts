import type { Entity, CustomGlobalDef } from '../engine/types';

export class DatabaseEditor {
  private container: HTMLElement;
  private entities: Record<string, Entity>;
  private globals: CustomGlobalDef[];
  private activeTab: 'entities' | 'globals' = 'entities';
  private selectedEntityId: string | null = null;
  private activeFacetTab: 'avg' | 'rpg' | 'debate' = 'avg';
  public onChange?: () => void;

  constructor(container: HTMLElement, entities: Record<string, Entity>, globals: CustomGlobalDef[]) {
    this.container = container;
    this.entities = entities;
    this.globals = globals;
    this.selectedEntityId = Object.keys(entities)[0] || null;
    this.render();
  }

  public render(): void {
    this.container.innerHTML = '';

    const root = document.createElement('div');
    root.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column; background: #121522; color: #fff; font-family: sans-serif;';

    // Top Navigation Tabs (Entities / Custom Globals)
    const nav = document.createElement('div');
    nav.style.cssText = 'padding: 8px 16px; background: #181d2e; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; gap: 12px;';

    const tabStyle = (active: boolean) => `
      padding: 8px 16px; font-size: 13px; font-weight: bold; border-radius: 6px; cursor: pointer; border: none;
      background: ${active ? '#1976d2' : 'transparent'}; color: ${active ? '#fff' : '#aaa'};
    `;

    const entBtn = document.createElement('button');
    entBtn.innerText = 'Entities & Facets (实体与多模式属性 §4.5)';
    entBtn.style.cssText = tabStyle(this.activeTab === 'entities');
    entBtn.onclick = () => {
      this.activeTab = 'entities';
      this.render();
    };

    const gloBtn = document.createElement('button');
    gloBtn.innerText = 'Custom Globals (自定义全局数值 §4.15)';
    gloBtn.style.cssText = tabStyle(this.activeTab === 'globals');
    gloBtn.onclick = () => {
      this.activeTab = 'globals';
      this.render();
    };

    nav.append(entBtn, gloBtn);
    root.appendChild(nav);

    // Body content
    const body = document.createElement('div');
    body.style.cssText = 'flex: 1; display: flex; overflow: hidden;';

    if (this.activeTab === 'entities') {
      this.renderEntitiesSection(body);
    } else {
      this.renderGlobalsSection(body);
    }

    root.appendChild(body);
    this.container.appendChild(root);
  }

  private renderEntitiesSection(container: HTMLElement): void {
    // Left list
    const sidebar = document.createElement('div');
    sidebar.style.cssText = 'width: 220px; background: #161b2c; border-right: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column;';

    const sHeader = document.createElement('div');
    sHeader.style.cssText = 'padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;';
    sHeader.innerHTML = '<span style="font-weight: bold; font-size: 13px;">Entities</span>';

    const addBtn = document.createElement('button');
    addBtn.innerText = '+ Add';
    addBtn.style.cssText = 'background: #2196f3; border: none; border-radius: 4px; color: #fff; padding: 4px 8px; font-size: 11px; cursor: pointer;';
    addBtn.onclick = () => {
      const newId = `item_${Date.now()}`;
      this.entities[newId] = {
        id: newId,
        base: { name: 'New Item', icon: '', desc: '', storyTags: [] },
        facets: {
          avg: { category: 'evidence', unlockFlags: [] },
          rpg: { type: 'item', price: 10 },
          debate: { contradictionIds: [] },
        },
      };
      this.selectedEntityId = newId;
      if (this.onChange) this.onChange();
      this.render();
    };
    sHeader.appendChild(addBtn);
    sidebar.appendChild(sHeader);

    const list = document.createElement('div');
    list.style.cssText = 'flex: 1; overflow-y: auto;';
    for (const [id, ent] of Object.entries(this.entities)) {
      const item = document.createElement('div');
      const isSel = id === this.selectedEntityId;
      item.style.cssText = `
        padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05);
        cursor: pointer; background: ${isSel ? '#283593' : 'transparent'};
      `;
      item.innerHTML = `
        <div style="font-weight: bold; font-size: 13px;">${ent.base.name}</div>
        <div style="font-size: 11px; color: #aaa;">ID: ${ent.id}</div>
      `;
      item.onclick = () => {
        this.selectedEntityId = id;
        this.render();
      };
      list.appendChild(item);
    }
    sidebar.appendChild(list);
    container.appendChild(sidebar);

    // Right details & multi-facets (§4.5)
    const main = document.createElement('div');
    main.style.cssText = 'flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px;';

    if (!this.selectedEntityId || !this.entities[this.selectedEntityId]) {
      main.innerHTML = '<div style="color: #888;">Select an entity to edit.</div>';
    } else {
      const entity = this.entities[this.selectedEntityId];

      main.innerHTML = `
        <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
          <h3 style="margin: 0 0 10px 0; color: #ffd54f;">Entity Base (实体本体)</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="font-size: 12px; color: #aaa;">Name</label>
              <input id="ent-name" type="text" value="${entity.base.name}" style="width: 100%; padding: 8px; background: #1c2237; border: 1px solid #3d496e; border-radius: 6px; color: #fff; margin-top: 4px;">
            </div>
            <div>
              <label style="font-size: 12px; color: #aaa;">Description</label>
              <input id="ent-desc" type="text" value="${entity.base.desc}" style="width: 100%; padding: 8px; background: #1c2237; border: 1px solid #3d496e; border-radius: 6px; color: #fff; margin-top: 4px;">
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
          <button id="facet-tab-avg" style="padding: 6px 12px; font-size: 12px; font-weight: bold; border-radius: 4px; border: none; cursor: pointer; background: ${this.activeFacetTab === 'avg' ? '#2196f3' : '#283149'}; color: #fff;">AVG Facet (礼物/证物)</button>
          <button id="facet-tab-rpg" style="padding: 6px 12px; font-size: 12px; font-weight: bold; border-radius: 4px; border: none; cursor: pointer; background: ${this.activeFacetTab === 'rpg' ? '#4caf50' : '#283149'}; color: #fff;">RPG Facet (道具/装备)</button>
          <button id="facet-tab-debate" style="padding: 6px 12px; font-size: 12px; font-weight: bold; border-radius: 4px; border: none; cursor: pointer; background: ${this.activeFacetTab === 'debate' ? '#e91e63' : '#283149'}; color: #fff;">Debate Facet (法庭证物)</button>
        </div>

        <div id="facet-editor-content"></div>
      `;

      // Wire Base inputs
      const nameInp = main.querySelector('#ent-name') as HTMLInputElement;
      nameInp.oninput = () => {
        entity.base.name = nameInp.value;
        if (this.onChange) this.onChange();
      };
      const descInp = main.querySelector('#ent-desc') as HTMLInputElement;
      descInp.oninput = () => {
        entity.base.desc = descInp.value;
        if (this.onChange) this.onChange();
      };

      // Wire Facet tabs
      main.querySelector('#facet-tab-avg')?.addEventListener('click', () => {
        this.activeFacetTab = 'avg';
        this.render();
      });
      main.querySelector('#facet-tab-rpg')?.addEventListener('click', () => {
        this.activeFacetTab = 'rpg';
        this.render();
      });
      main.querySelector('#facet-tab-debate')?.addEventListener('click', () => {
        this.activeFacetTab = 'debate';
        this.render();
      });

      const facetBox = main.querySelector('#facet-editor-content') as HTMLElement;
      if (this.activeFacetTab === 'avg') {
        const avg = entity.facets.avg || { category: 'evidence' };
        facetBox.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div>
              <label style="font-size: 12px; color: #aaa;">Category (类别: 礼物 Gift / 证物 Evidence / 物品 Trinket)</label>
              <select id="avg-cat" style="width: 200px; padding: 6px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 4px; display: block;">
                <option value="evidence" ${avg.category === 'evidence' ? 'selected' : ''}>Evidence (证物 - 解锁剧情分支)</option>
                <option value="gift" ${avg.category === 'gift' ? 'selected' : ''}>Gift (礼物 - 提升好感度)</option>
                <option value="trinket" ${avg.category === 'trinket' ? 'selected' : ''}>Trinket (物品 - 看反应)</option>
              </select>
            </div>
            <div>
              <label style="font-size: 12px; color: #aaa;">Affection Value (好感度增加值)</label>
              <input id="avg-eff" type="number" value="${avg.effectValue ?? 10}" style="width: 200px; padding: 6px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 4px; display: block;">
            </div>
          </div>
        `;
        const catSelect = facetBox.querySelector('#avg-cat') as HTMLSelectElement;
        catSelect.onchange = () => {
          if (!entity.facets.avg) entity.facets.avg = { category: 'evidence' };
          entity.facets.avg.category = catSelect.value as any;
          if (this.onChange) this.onChange();
        };
      } else if (this.activeFacetTab === 'rpg') {
        const rpg = entity.facets.rpg || { type: 'item', price: 10 };
        facetBox.innerHTML = `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="font-size: 12px; color: #aaa;">Item Type</label>
              <select id="rpg-type" style="width: 100%; padding: 6px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 4px;">
                <option value="item" ${rpg.type === 'item' ? 'selected' : ''}>Consumable Item</option>
                <option value="weapon" ${rpg.type === 'weapon' ? 'selected' : ''}>Weapon</option>
                <option value="armor" ${rpg.type === 'armor' ? 'selected' : ''}>Armor</option>
              </select>
            </div>
            <div>
              <label style="font-size: 12px; color: #aaa;">Price (Gold)</label>
              <input id="rpg-price" type="number" value="${rpg.price ?? 10}" style="width: 100%; padding: 6px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 4px;">
            </div>
          </div>
        `;
      } else {
        const deb = entity.facets.debate || { contradictionIds: [] };
        facetBox.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div>
              <label style="font-size: 12px; color: #aaa;">Press Response Override (追问回应)</label>
              <input id="deb-press" type="text" value="${deb.pressResponse || ''}" style="width: 100%; padding: 6px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 4px;">
            </div>
          </div>
        `;
      }
    }

    container.appendChild(main);
  }

  private renderGlobalsSection(container: HTMLElement): void {
    const box = document.createElement('div');
    box.style.cssText = 'flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px;';

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
    header.innerHTML = `
      <div>
        <h3 style="margin: 0; color: #64b5f6;">Custom Global Variables (自定义全局数值总表 §4.15)</h3>
        <p style="font-size: 12px; color: #aaa; margin: 4px 0 0 0;">Custom variables shared across all modes and evaluated by Triggers (G[key]).</p>
      </div>
    `;

    const addBtn = document.createElement('button');
    addBtn.innerText = '+ Add Global Variable';
    addBtn.style.cssText = 'background: #1976d2; border: none; border-radius: 6px; color: #fff; padding: 8px 14px; font-weight: bold; cursor: pointer;';
    addBtn.onclick = () => {
      this.globals.push({
        key: `custom_${Date.now()}`,
        name: 'New Global',
        type: 'number',
        default: 0,
        hidden: false,
        exposeToTriggers: true,
      });
      if (this.onChange) this.onChange();
      this.render();
    };
    header.appendChild(addBtn);
    box.appendChild(header);

    // Table
    const table = document.createElement('table');
    table.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;';
    table.innerHTML = `
      <thead>
        <tr style="border-bottom: 2px solid rgba(255,255,255,0.15); color: #90caf9;">
          <th style="padding: 10px;">Key</th>
          <th style="padding: 10px;">Display Name</th>
          <th style="padding: 10px;">Type</th>
          <th style="padding: 10px;">Default</th>
          <th style="padding: 10px;">Hidden (暗线剧情)</th>
          <th style="padding: 10px;">Action</th>
        </tr>
      </thead>
      <tbody>
        ${this.globals
          .map(
            (g, idx) => `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 10px; font-family: monospace; color: #ffd54f;">${g.key}</td>
            <td style="padding: 10px;">${g.name}</td>
            <td style="padding: 10px; color: #81c784;">${g.type}</td>
            <td style="padding: 10px;">${g.default}</td>
            <td style="padding: 10px;">${g.hidden ? '🔒 Hidden' : '👁️ Visible'}</td>
            <td style="padding: 10px;">
              <button data-del-idx="${idx}" style="background: #c62828; border: none; border-radius: 4px; color: #fff; padding: 3px 8px; cursor: pointer;">Delete</button>
            </td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    `;

    table.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const delIdx = target.getAttribute('data-del-idx');
      if (delIdx !== null) {
        this.globals.splice(Number(delIdx), 1);
        if (this.onChange) this.onChange();
        this.render();
      }
    });

    box.appendChild(table);
    container.appendChild(box);
  }
}
