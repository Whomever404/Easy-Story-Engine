import type { PluginMeta } from '../engine/types';

export class PluginEditor {
  private container: HTMLElement;
  private plugins: PluginMeta[];
  public onChange?: () => void;

  constructor(container: HTMLElement, plugins: PluginMeta[] = []) {
    this.container = container;
    this.plugins = plugins;
    this.render();
  }

  public render(): void {
    this.container.innerHTML = '';
    const root = document.createElement('div');
    root.style.cssText = 'width: 100%; height: 100%; padding: 24px; background: #121522; color: #fff; font-family: sans-serif; display: flex; flex-direction: column; gap: 16px; overflow-y: auto;';

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;';
    header.innerHTML = `
      <div>
        <h3 style="margin: 0; color: #64b5f6;">Plugin Manager (插件管理器 §4.16.5)</h3>
        <p style="font-size: 12px; color: #aaa; margin: 4px 0 0 0;">Manage custom mode modules, command script extensions, and third-party libraries.</p>
      </div>
    `;

    const addBtn = document.createElement('button');
    addBtn.innerText = '+ Add Plugin';
    addBtn.style.cssText = 'background: #1976d2; border: none; border-radius: 6px; color: #fff; padding: 8px 14px; font-weight: bold; cursor: pointer;';
    addBtn.onclick = () => {
      this.plugins.push({
        id: `plugin_${Date.now()}`,
        name: 'New Custom Plugin',
        file: 'plugins/scripts/myPlugin.js',
        type: 'script',
        enabled: true,
        order: this.plugins.length,
      });
      if (this.onChange) this.onChange();
      this.render();
    };
    header.appendChild(addBtn);
    root.appendChild(header);

    // List
    const list = document.createElement('div');
    list.style.cssText = 'display: flex; flex-direction: column; gap: 10px; max-width: 800px;';

    if (this.plugins.length === 0) {
      list.innerHTML = '<div style="color: #777; padding: 20px;">No custom plugins installed.</div>';
    } else {
      this.plugins.forEach((p, idx) => {
        const item = document.createElement('div');
        item.style.cssText = `
          padding: 14px 18px; background: #1a2033; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; display: flex; justify-content: space-between; align-items: center;
        `;
        item.innerHTML = `
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: bold; font-size: 15px;">${p.name}</span>
              <span style="font-size: 10px; background: #283593; padding: 2px 6px; border-radius: 4px;">${p.type.toUpperCase()}</span>
            </div>
            <div style="font-size: 12px; color: #aaa; margin-top: 4px;">Path: ${p.file} | Order: ${idx + 1}</div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button data-toggle-idx="${idx}" style="background: ${p.enabled ? '#388e3c' : '#555'}; border: none; border-radius: 4px; color: #fff; padding: 4px 10px; font-size: 12px; cursor: pointer;">
              ${p.enabled ? 'Enabled' : 'Disabled'}
            </button>
            <button data-del-idx="${idx}" style="background: #c62828; border: none; border-radius: 4px; color: #fff; padding: 4px 8px; font-size: 12px; cursor: pointer;">✕</button>
          </div>
        `;
        list.appendChild(item);
      });

      list.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const toggleIdx = target.getAttribute('data-toggle-idx');
        if (toggleIdx !== null) {
          const p = this.plugins[Number(toggleIdx)];
          p.enabled = !p.enabled;
          if (this.onChange) this.onChange();
          this.render();
        }

        const delIdx = target.getAttribute('data-del-idx');
        if (delIdx !== null) {
          this.plugins.splice(Number(delIdx), 1);
          if (this.onChange) this.onChange();
          this.render();
        }
      });
    }

    root.appendChild(list);
    this.container.appendChild(root);
  }
}
