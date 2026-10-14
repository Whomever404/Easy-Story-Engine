import type { EngineShell, SaveMeta, Achievement, TitleLayoutConfig } from '../types';

export class SystemOverlay {
  private shell: EngineShell;
  private container: HTMLElement;
  private rootElement: HTMLElement | null = null;
  private activeModal: HTMLElement | null = null;

  constructor(shell: EngineShell, container: HTMLElement) {
    this.shell = shell;
    this.container = container;
    this.setupUI();
    this.registerEvents();
  }

  private registerEvents(): void {
    this.shell.on('overlay.system_menu.toggle', (data: any) => {
      this.toggleMenu(data?.show);
    });

    this.shell.on('achievement.unlocked', (data: any) => {
      this.showAchievementBanner(data.achievement);
    });
  }

  private setupUI(): void {
    const root = document.createElement('div');
    root.className = 'ese-system-overlay-container';
    root.style.cssText = 'position: absolute; inset: 0; pointer-events: none; z-index: 1000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
    this.rootElement = root;

    // Top-right Menu Gear Button
    const menuBtn = document.createElement('button');
    menuBtn.className = 'ese-menu-gear-btn';
    menuBtn.style.cssText = `
      position: absolute; top: 16px; right: 16px; pointer-events: auto;
      width: 42px; height: 42px; border-radius: 8px; background: rgba(20, 25, 40, 0.85);
      border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      color: #fff; font-size: 20px; cursor: pointer; display: flex;
      justify-content: center; align-items: center; transition: all 0.2s; backdrop-filter: blur(8px);
    `;
    menuBtn.innerText = '⚙️';
    menuBtn.onclick = () => this.toggleMenu();
    root.appendChild(menuBtn);

    this.container.appendChild(root);
  }

  public toggleMenu(show?: boolean): void {
    if (this.activeModal) {
      this.closeModal();
      return;
    }

    this.showSystemMenuModal();
  }

  private showSystemMenuModal(): void {
    this.createModal('系统菜单', (body) => {
      const list = document.createElement('div');
      list.style.cssText = 'display: flex; flex-direction: column; gap: 10px; width: 260px; margin: 0 auto;';

      const btnStyle = 'padding: 12px 18px; font-size: 15px; font-weight: 600; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: #22293d; color: #fff; cursor: pointer; transition: 0.2s;';

      const saveBtn = document.createElement('button');
      saveBtn.innerText = '💾 保存进度 (存档)';
      saveBtn.style.cssText = btnStyle;
      saveBtn.onclick = () => {
        this.closeModal();
        this.showSaveLoadModal('save');
      };

      const loadBtn = document.createElement('button');
      loadBtn.innerText = '📂 读取进度 (读档)';
      loadBtn.style.cssText = btnStyle;
      loadBtn.onclick = () => {
        this.closeModal();
        this.showSaveLoadModal('load');
      };

      const achBtn = document.createElement('button');
      achBtn.innerText = '🏆 成就系统';
      achBtn.style.cssText = btnStyle;
      achBtn.onclick = () => {
        this.closeModal();
        this.showAchievementsModal();
      };

      const galleryBtn = document.createElement('button');
      galleryBtn.innerText = '🖼️ CG 回想图库';
      galleryBtn.style.cssText = btnStyle;
      galleryBtn.onclick = () => {
        this.closeModal();
        this.showGalleryModal();
      };

      const settingsBtn = document.createElement('button');
      settingsBtn.innerText = '🔊 声音与引擎设置';
      settingsBtn.style.cssText = btnStyle;
      settingsBtn.onclick = () => {
        this.closeModal();
        this.showSettingsModal();
      };

      list.append(saveBtn, loadBtn, achBtn, galleryBtn, settingsBtn);
      body.appendChild(list);
    });
  }

  // -------------------------------------------------------------
  // Save / Load Modal (§4.14)
  // -------------------------------------------------------------

  public async showSaveLoadModal(mode: 'save' | 'load'): Promise<void> {
    const saves = await this.shell.getSaves();
    const saveMap = new Map<number, SaveMeta>();
    saves.forEach((s) => saveMap.set(s.slot, s));

    this.createModal(mode === 'save' ? 'Save Game (保存进度)' : 'Load Game (读取进度)', (body) => {
      const scroll = document.createElement('div');
      scroll.style.cssText = 'max-height: 420px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;';

      for (let slot = 1; slot <= 6; slot++) {
        const item = saveMap.get(slot);
        const card = document.createElement('div');
        card.style.cssText = `
          padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.05); display: flex; justify-content: space-between;
          align-items: center; cursor: pointer; transition: 0.2s;
        `;
        card.onmouseenter = () => (card.style.borderColor = '#2196f3');
        card.onmouseleave = () => (card.style.borderColor = 'rgba(255,255,255,0.15)');

        if (item) {
          const dateStr = new Date(item.timestamp).toLocaleString();
          card.innerHTML = `
            <div>
              <div style="font-weight: bold; color: #64b5f6;">存档槽位 ${slot}: ${item.chapterLabel || '冒险章节'}</div>
              <div style="font-size: 12px; color: #aaa; margin-top: 4px;">保存时间: ${dateStr} | 模式: ${item.modeId.toUpperCase()}</div>
            </div>
            <button style="background: ${mode === 'save' ? '#1976d2' : '#388e3c'}; border: none; border-radius: 6px; color: #fff; padding: 6px 14px; font-weight: bold; cursor: pointer;">
              ${mode === 'save' ? '覆盖存档' : '读取进度'}
            </button>
          `;
        } else {
          card.innerHTML = `
            <div>
              <div style="font-weight: bold; color: #888;">存档槽位 ${slot}: [空存档位]</div>
            </div>
            ${mode === 'save' ? '<button style="background: #1976d2; border: none; border-radius: 6px; color: #fff; padding: 6px 14px; font-weight: bold; cursor: pointer;">保存</button>' : '<span style="color: #666; font-size: 13px;">无数据</span>'}
          `;
        }

        card.onclick = async () => {
          if (mode === 'save') {
            await this.shell.saveGame(slot, 'Story Progress');
            this.shell.playSe('confirm');
            this.closeModal();
          } else {
            if (item) {
              await this.shell.loadGame(slot);
              this.shell.playSe('confirm');
              this.closeModal();
            }
          }
        };

        scroll.appendChild(card);
      }

      body.appendChild(scroll);
    });
  }

  // -------------------------------------------------------------
  // Achievements Modal (§4.9)
  // -------------------------------------------------------------

  public showAchievementsModal(): void {
    const allAchievements = Object.values(this.shell.projectData.achievements || {});
    const unlockedIds = this.shell.state.achievements;

    this.createModal('成就系统 (Achievements)', (body) => {
      const scroll = document.createElement('div');
      scroll.style.cssText = 'max-height: 420px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;';

      if (allAchievements.length === 0) {
        scroll.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">工程中未配置任何成就项。</div>';
      } else {
        allAchievements.forEach((ach) => {
          const isUnlocked = unlockedIds.includes(ach.id);
          const isSecret = ach.secret && !isUnlocked;

          const card = document.createElement('div');
          card.style.cssText = `
            padding: 12px 16px; border-radius: 8px; border: 1px solid ${isUnlocked ? '#ffd54f' : 'rgba(255,255,255,0.1)'};
            background: ${isUnlocked ? 'rgba(255,213,79,0.08)' : 'rgba(255,255,255,0.03)'};
            display: flex; align-items: center; gap: 14px;
          `;

          card.innerHTML = `
            <div style="font-size: 32px;">${isUnlocked ? '🏆' : isSecret ? '❓' : '🔒'}</div>
            <div style="flex: 1;">
              <div style="font-weight: bold; color: ${isUnlocked ? '#ffd54f' : '#ccc'};">${isSecret ? '???' : ach.name}</div>
              <div style="font-size: 13px; color: #999; margin-top: 4px;">${isSecret ? '隐藏成就（达成特定剧情或条件后解锁）' : ach.desc}</div>
            </div>
            ${isUnlocked ? '<span style="color: #4caf50; font-weight: bold; font-size: 12px;">已解锁</span>' : '<span style="color: #888; font-size: 12px;">未达成</span>'}
          `;

          scroll.appendChild(card);
        });
      }

      body.appendChild(scroll);
    });
  }

  // -------------------------------------------------------------
  // Gallery Modal (§4.8.4)
  // -------------------------------------------------------------

  public showGalleryModal(): void {
    const unlocked = this.shell.state.gallery;

    this.createModal('CG 回想图库 (Gallery)', (body) => {
      const grid = document.createElement('div');
      grid.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; max-height: 400px; overflow-y: auto;';

      if (unlocked.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; color: #888; text-align: center; padding: 20px;">暂未解锁任何剧情 CG。通过短信照片分享与关键剧情推进即可收集图库！</div>';
      } else {
        unlocked.forEach((assetId) => {
          const card = document.createElement('div');
          card.style.cssText = 'border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; overflow: hidden; background: #000; text-align: center; padding: 10px;';
          card.innerHTML = `
            <div style="font-size: 36px; padding: 20px 0;">🖼️</div>
            <div style="font-size: 12px; color: #aaa;">${assetId}</div>
          `;
          grid.appendChild(card);
        });
      }

      body.appendChild(grid);
    });
  }

  // -------------------------------------------------------------
  // Settings Modal (§4.11)
  // -------------------------------------------------------------

  public showSettingsModal(): void {
    this.createModal('声音与引擎设置', (body) => {
      body.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 18px; width: 320px; margin: 0 auto;">
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>背景音乐音量 (BGM)</span>
              <span id="val-bgm">80%</span>
            </div>
            <input type="range" id="slider-bgm" min="0" max="100" value="80" style="width: 100%;">
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>操作与场景音效 (SE)</span>
              <span id="val-se">90%</span>
            </div>
            <input type="range" id="slider-se" min="0" max="100" value="90" style="width: 100%;">
          </div>
        </div>
      `;

      const sliderBgm = body.querySelector('#slider-bgm') as HTMLInputElement;
      const valBgm = body.querySelector('#val-bgm') as HTMLElement;
      sliderBgm.oninput = () => {
        valBgm.textContent = `${sliderBgm.value}%`;
      };

      const sliderSe = body.querySelector('#slider-se') as HTMLInputElement;
      const valSe = body.querySelector('#val-se') as HTMLElement;
      sliderSe.oninput = () => {
        valSe.textContent = `${sliderSe.value}%`;
      };
    });
  }

  // -------------------------------------------------------------
  // Floating Achievement Banner (§4.9.3)
  // -------------------------------------------------------------

  private showAchievementBanner(ach?: Achievement): void {
    if (!ach || !this.rootElement) return;

    const banner = document.createElement('div');
    banner.style.cssText = `
      position: absolute; top: 24px; left: 50%; transform: translateX(-50%);
      background: rgba(22, 28, 46, 0.95); border: 2px solid #ffd54f;
      border-radius: 12px; padding: 12px 24px; color: #fff;
      display: flex; align-items: center; gap: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6); pointer-events: auto;
      z-index: 1100; animation: bounce-in 0.5s ease;
    `;
    banner.innerHTML = `
      <div style="font-size: 36px;">🏆</div>
      <div>
        <div style="font-size: 11px; color: #ffd54f; font-weight: bold; letter-spacing: 1px;">ACHIEVEMENT UNLOCKED!</div>
        <div style="font-size: 16px; font-weight: bold; color: #fff; margin-top: 2px;">${ach.name}</div>
        <div style="font-size: 12px; color: #bbb;">${ach.desc}</div>
      </div>
    `;

    this.rootElement.appendChild(banner);

    setTimeout(() => {
      banner.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      banner.style.opacity = '0';
      banner.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(() => banner.remove(), 500);
    }, 4000);
  }

  private createModal(title: string, renderBody: (body: HTMLElement) => void): void {
    if (!this.rootElement) return;
    this.closeModal();

    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: absolute; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
      display: flex; justify-content: center; align-items: center; pointer-events: auto;
      z-index: 1050; color: #fff;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background: #181d2e; border: 1px solid rgba(255,255,255,0.2); border-radius: 14px;
      width: 480px; max-width: 90%; padding: 22px; box-shadow: 0 16px 40px rgba(0,0,0,0.7);
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;';
    header.innerHTML = `<h3 style="margin: 0; font-size: 18px; color: #64b5f6;">${title}</h3>`;

    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✕';
    closeBtn.style.cssText = 'background: none; border: none; color: #bbb; font-size: 18px; cursor: pointer;';
    closeBtn.onclick = () => this.closeModal();
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    renderBody(body);

    box.append(header, body);
    backdrop.appendChild(box);
    this.rootElement.appendChild(backdrop);
    this.activeModal = backdrop;
  }

  private closeModal(): void {
    if (this.activeModal) {
      this.activeModal.remove();
      this.activeModal = null;
    }
  }
}
