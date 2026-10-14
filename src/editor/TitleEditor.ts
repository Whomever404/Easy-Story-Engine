import type { TitleLayoutConfig } from '../engine/types';

export class TitleEditor {
  private container: HTMLElement;
  private config: TitleLayoutConfig;
  public onChange?: () => void;

  constructor(container: HTMLElement, config: TitleLayoutConfig) {
    this.container = container;
    this.config = config;
    this.render();
  }

  public render(): void {
    this.container.innerHTML = '';
    const root = document.createElement('div');
    root.style.cssText = 'width: 100%; height: 100%; display: flex; background: #121522; color: #fff; font-family: sans-serif;';

    // Left: Settings form
    const left = document.createElement('div');
    left.style.cssText = 'width: 320px; background: #181d2e; border-right: 1px solid rgba(255,255,255,0.1); padding: 20px; display: flex; flex-direction: column; gap: 14px;';
    left.innerHTML = `
      <h3 style="margin: 0; color: #64b5f6;">标题画面设置 (§4.10)</h3>
      <div>
        <label style="font-size: 12px; color: #aaa;">游戏标题文字</label>
        <input id="title-text-inp" type="text" value="${this.config.titleText}" style="width: 100%; padding: 8px; background: #1c2237; border: 1px solid #3d496e; border-radius: 6px; color: #fff; margin-top: 4px;">
      </div>
      <div>
        <label style="font-size: 12px; color: #aaa;">背景音乐 BGM 音轨</label>
        <input id="title-bgm-inp" type="text" value="${this.config.bgmTrack || 'title_theme'}" style="width: 100%; padding: 8px; background: #1c2237; border: 1px solid #3d496e; border-radius: 6px; color: #fff; margin-top: 4px;">
      </div>
      <div>
        <label style="font-size: 12px; color: #aaa;">Logo 图标素材路径</label>
        <input id="title-logo-inp" type="text" value="${this.config.logoImage || ''}" placeholder="assets/images/logo.png" style="width: 100%; padding: 8px; background: #1c2237; border: 1px solid #3d496e; border-radius: 6px; color: #fff; margin-top: 4px;">
      </div>
    `;

    left.querySelector('#title-text-inp')?.addEventListener('input', (e: any) => {
      this.config.titleText = e.target.value;
      if (this.onChange) this.onChange();
      this.updatePreview();
    });

    root.appendChild(left);

    // Right: Visual Live Canvas Preview
    const right = document.createElement('div');
    right.style.cssText = 'flex: 1; display: flex; justify-content: center; align-items: center; padding: 24px; background: #0d101a;';

    const previewBox = document.createElement('div');
    previewBox.id = 'title-preview-box';
    previewBox.style.cssText = `
      width: 640px; height: 380px; background: linear-gradient(135deg, #1a237e, #0d47a1);
      border: 2px solid #3d496e; border-radius: 12px; box-shadow: 0 16px 40px rgba(0,0,0,0.6);
      display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 24px;
    `;
    previewBox.innerHTML = `
      <div id="prev-title" style="font-size: 36px; font-weight: 900; letter-spacing: 2px; color: #ffd54f; text-shadow: 0 4px 16px rgba(0,0,0,0.8);">${this.config.titleText}</div>
      <div style="display: flex; flex-direction: column; gap: 8px; width: 220px;">
        <button style="padding: 10px; background: #1976d2; border: none; border-radius: 6px; color: #fff; font-weight: bold; cursor: pointer;">开始新游戏 (New Game)</button>
        <button style="padding: 10px; background: #283593; border: none; border-radius: 6px; color: #fff; font-weight: bold; cursor: pointer;">继续游戏 (Continue)</button>
        <button style="padding: 10px; background: #37474f; border: none; border-radius: 6px; color: #fff; font-weight: bold; cursor: pointer;">成就殿堂 (Achievements)</button>
      </div>
    `;

    right.appendChild(previewBox);
    root.appendChild(right);
    this.container.appendChild(root);
  }

  private updatePreview(): void {
    const el = this.container.querySelector('#prev-title');
    if (el) el.textContent = this.config.titleText;
  }
}
