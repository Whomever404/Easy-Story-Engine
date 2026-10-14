import type { TitleLayoutConfig, TitleMenuButton, TitleClickableElement } from '../engine/types';

export class TitleEditor {
  private container: HTMLElement;
  private config: TitleLayoutConfig;
  private selectedType: 'none' | 'global' | 'button' | 'clickable' = 'global';
  private selectedButtonId: string | null = null;
  private selectedClickableId: string | null = null;
  private activeLeftTab: 'buttons' | 'clickables' | 'visuals' = 'buttons';
  public onChange?: () => void;

  constructor(container: HTMLElement, config: TitleLayoutConfig) {
    this.container = container;
    this.config = config;
    this.ensureDefaults();
    this.render();
  }

  private ensureDefaults(): void {
    if (!this.config.buttons) {
      this.config.buttons = [
        { id: 'btn_new_game', label: '开始新游戏', action: 'new_game', enabled: true },
        { id: 'btn_continue', label: '继续游戏', action: 'continue', enabled: true },
        { id: 'btn_achievements', label: '成就殿堂', action: 'achievements', enabled: true },
        { id: 'btn_gallery', label: 'CG 图库', action: 'gallery', enabled: true },
      ];
    }
    if (!this.config.clickableElements) {
      this.config.clickableElements = [
        {
          id: 'click_title',
          name: '主标题点击事件',
          type: 'title_text',
          x: 20,
          y: 15,
          width: 60,
          height: 18,
          action: 'none',
          tooltip: '点击主标题',
        },
      ];
    }
    if (!this.config.layoutTheme) {
      this.config.layoutTheme = 'centered';
    }
  }

  public setConfig(config: TitleLayoutConfig): void {
    this.config = config;
    this.ensureDefaults();
    this.render();
  }

  public render(): void {
    this.container.innerHTML = '';

    const root = document.createElement('div');
    root.className = 'ese-title-editor-workbench';
    root.style.cssText = `
      width: 100%; height: 100%; display: flex;
      background: #0f121d; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden; user-select: none;
    `;

    // 1. Left Sidebar: Structure & Button/Clickable Manager
    const leftSidebar = document.createElement('div');
    leftSidebar.style.cssText = `
      width: 320px; background: #161a29; border-right: 1px solid rgba(255,255,255,0.1);
      display: flex; flex-direction: column; overflow: hidden;
    `;
    this.renderLeftSidebar(leftSidebar);
    root.appendChild(leftSidebar);

    // 2. Middle: Interactive Visual Title Screen Preview
    const centerStage = document.createElement('div');
    centerStage.style.cssText = `
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: radial-gradient(circle at center, #1b2138 0%, #0d101a 100%);
      padding: 24px; position: relative; overflow: auto;
    `;
    this.renderPreviewStage(centerStage);
    root.appendChild(centerStage);

    // 3. Right Sidebar: Inspector for selected element
    const rightInspector = document.createElement('div');
    rightInspector.style.cssText = `
      width: 300px; background: #161a29; border-left: 1px solid rgba(255,255,255,0.1);
      display: flex; flex-direction: column; overflow-y: auto; padding: 20px; gap: 16px;
    `;
    this.renderInspector(rightInspector);
    root.appendChild(rightInspector);

    this.container.appendChild(root);
  }

  // -------------------------------------------------------------
  // Left Sidebar: Tabs (Buttons / Clickable Hotspots / Theme)
  // -------------------------------------------------------------

  private renderLeftSidebar(sidebar: HTMLElement): void {
    // Header
    const header = document.createElement('div');
    header.style.cssText = 'padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: space-between;';
    header.innerHTML = `
      <span style="font-weight: bold; font-size: 15px; color: #64b5f6; display: flex; align-items: center; gap: 8px;">
        🎨 开始界面定制
      </span>
      <span style="font-size: 11px; background: #283593; color: #bbdefb; padding: 2px 6px; border-radius: 4px;">所见即所得</span>
    `;
    sidebar.appendChild(header);

    // Tabs
    const tabsBar = document.createElement('div');
    tabsBar.style.cssText = 'display: flex; background: #121522; border-bottom: 1px solid rgba(255,255,255,0.08); padding: 4px; gap: 4px;';

    const createTabBtn = (tabKey: 'buttons' | 'clickables' | 'visuals', label: string) => {
      const btn = document.createElement('button');
      const isAct = this.activeLeftTab === tabKey;
      btn.innerText = label;
      btn.style.cssText = `
        flex: 1; padding: 7px 0; font-size: 12px; font-weight: 600; border: none; border-radius: 4px; cursor: pointer;
        background: ${isAct ? '#22293d' : 'transparent'}; color: ${isAct ? '#64b5f6' : '#aaa'}; transition: 0.2s;
      `;
      btn.onclick = () => {
        this.activeLeftTab = tabKey;
        this.render();
      };
      return btn;
    };

    tabsBar.appendChild(createTabBtn('buttons', '🔘 按钮管理'));
    tabsBar.appendChild(createTabBtn('clickables', '👆 点击元素'));
    tabsBar.appendChild(createTabBtn('visuals', '🖼️ 画面背景'));
    sidebar.appendChild(tabsBar);

    // Body content according to active tab
    const content = document.createElement('div');
    content.style.cssText = 'flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px;';

    if (this.activeLeftTab === 'buttons') {
      this.renderButtonsTab(content);
    } else if (this.activeLeftTab === 'clickables') {
      this.renderClickablesTab(content);
    } else {
      this.renderVisualsTab(content);
    }

    sidebar.appendChild(content);
  }

  private renderButtonsTab(container: HTMLElement): void {
    // Quick Add Button Toolbar
    const addToolbar = document.createElement('div');
    addToolbar.style.cssText = 'display: flex; gap: 6px; flex-direction: column;';
    addToolbar.innerHTML = `
      <div style="font-size: 12px; color: #aaa; margin-bottom: 4px;">可选择添加的预设菜单按钮:</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
        <button id="add-btn-new" style="background: #1976d2; border: none; border-radius: 4px; color: #fff; padding: 6px; font-size: 11px; cursor: pointer;">+ 开始新游戏</button>
        <button id="add-btn-cont" style="background: #283593; border: none; border-radius: 4px; color: #fff; padding: 6px; font-size: 11px; cursor: pointer;">+ 继续游戏</button>
        <button id="add-btn-ach" style="background: #f57c00; border: none; border-radius: 4px; color: #fff; padding: 6px; font-size: 11px; cursor: pointer;">+ 成就殿堂</button>
        <button id="add-btn-gal" style="background: #7b1fa2; border: none; border-radius: 4px; color: #fff; padding: 6px; font-size: 11px; cursor: pointer;">+ CG 图库</button>
        <button id="add-btn-set" style="background: #37474f; border: none; border-radius: 4px; color: #fff; padding: 6px; font-size: 11px; cursor: pointer;">+ 游戏设置</button>
        <button id="add-btn-custom" style="background: #00897b; border: none; border-radius: 4px; color: #fff; padding: 6px; font-size: 11px; cursor: pointer;">+ 自定义剧情按钮</button>
      </div>
    `;

    addToolbar.querySelector('#add-btn-new')?.addEventListener('click', () => {
      this.addButton('开始新游戏', 'new_game');
    });
    addToolbar.querySelector('#add-btn-cont')?.addEventListener('click', () => {
      this.addButton('继续游戏', 'continue');
    });
    addToolbar.querySelector('#add-btn-ach')?.addEventListener('click', () => {
      this.addButton('成就殿堂', 'achievements');
    });
    addToolbar.querySelector('#add-btn-gal')?.addEventListener('click', () => {
      this.addButton('CG 图库', 'gallery');
    });
    addToolbar.querySelector('#add-btn-set')?.addEventListener('click', () => {
      this.addButton('系统设置', 'settings');
    });
    addToolbar.querySelector('#add-btn-custom')?.addEventListener('click', () => {
      this.addButton('跳转特定章节', 'jump_story', 'ch1.prologue');
    });

    container.appendChild(addToolbar);

    // Buttons List
    const listLabel = document.createElement('div');
    listLabel.style.cssText = 'font-size: 12px; color: #90caf9; font-weight: bold; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;';
    listLabel.innerText = `画面中的按钮清单 (${this.config.buttons.length}):`;
    container.appendChild(listLabel);

    const buttonsList = document.createElement('div');
    buttonsList.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

    this.config.buttons.forEach((btn, index) => {
      const item = document.createElement('div');
      const isSel = this.selectedType === 'button' && this.selectedButtonId === btn.id;
      item.style.cssText = `
        padding: 10px 12px; background: ${isSel ? '#283593' : '#1c2237'};
        border: 1px solid ${isSel ? '#64b5f6' : 'rgba(255,255,255,0.1)'};
        border-radius: 6px; display: flex; justify-content: space-between; align-items: center;
        cursor: pointer; transition: 0.2s;
      `;

      item.innerHTML = `
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: bold; font-size: 13px; color: #fff;">${btn.label}</div>
          <div style="font-size: 11px; color: #aaa; margin-top: 2px;">动作: ${this.getActionName(btn.action)}</div>
        </div>
        <div style="display: flex; gap: 4px; align-items: center;">
          <button data-move-up="${index}" style="background: #2a3350; border: none; border-radius: 3px; color: #fff; cursor: pointer; padding: 2px 6px; font-size: 10px;">▲</button>
          <button data-move-down="${index}" style="background: #2a3350; border: none; border-radius: 3px; color: #fff; cursor: pointer; padding: 2px 6px; font-size: 10px;">▼</button>
          <button data-delete="${index}" style="background: #c62828; border: none; border-radius: 3px; color: #fff; cursor: pointer; padding: 2px 6px; font-size: 10px;">✕</button>
        </div>
      `;

      item.onclick = (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'BUTTON') return;
        this.selectButton(btn.id);
      };

      item.querySelector(`[data-move-up="${index}"]`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (index > 0) {
          const item = this.config.buttons.splice(index, 1)[0];
          this.config.buttons.splice(index - 1, 0, item);
          this.notifyChange();
          this.render();
        }
      });

      item.querySelector(`[data-move-down="${index}"]`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (index < this.config.buttons.length - 1) {
          const item = this.config.buttons.splice(index, 1)[0];
          this.config.buttons.splice(index + 1, 0, item);
          this.notifyChange();
          this.render();
        }
      });

      item.querySelector(`[data-delete="${index}"]`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.config.buttons.splice(index, 1);
        if (this.selectedButtonId === btn.id) {
          this.selectedType = 'global';
        }
        this.notifyChange();
        this.render();
      });

      buttonsList.appendChild(item);
    });

    container.appendChild(buttonsList);
  }

  private renderClickablesTab(container: HTMLElement): void {
    const tip = document.createElement('div');
    tip.style.cssText = 'font-size: 12px; color: #aaa; line-height: 1.5; background: rgba(33, 150, 243, 0.1); border-left: 3px solid #2196f3; padding: 8px 10px; border-radius: 4px;';
    tip.innerText = '除菜单按钮外，还可配置标题画面上的任何元素（文字、Logo、热区方框）是否具备点击交互行为。';
    container.appendChild(tip);

    const addHotspotBtn = document.createElement('button');
    addHotspotBtn.innerText = '+ 添加自定义点击热区 (Clickable Hotspot)';
    addHotspotBtn.style.cssText = 'background: #e91e63; border: none; border-radius: 6px; color: #fff; padding: 9px; font-size: 12px; font-weight: bold; cursor: pointer;';
    addHotspotBtn.onclick = () => {
      const newHotspot: TitleClickableElement = {
        id: `click_${Date.now()}`,
        name: `点击交互区 ${this.config.clickableElements?.length || 1}`,
        type: 'hotspot',
        x: 35,
        y: 75,
        width: 30,
        height: 12,
        action: 'play_se',
        soundEffect: 'confirm',
        tooltip: '隐藏彩蛋区',
      };
      if (!this.config.clickableElements) this.config.clickableElements = [];
      this.config.clickableElements.push(newHotspot);
      this.selectClickable(newHotspot.id);
      this.notifyChange();
      this.render();
    };
    container.appendChild(addHotspotBtn);

    // List of clickable elements
    const elementsList = document.createElement('div');
    elementsList.style.cssText = 'display: flex; flex-direction: column; gap: 8px; margin-top: 6px;';

    (this.config.clickableElements || []).forEach((elem, index) => {
      const item = document.createElement('div');
      const isSel = this.selectedType === 'clickable' && this.selectedClickableId === elem.id;
      item.style.cssText = `
        padding: 10px 12px; background: ${isSel ? '#283593' : '#1c2237'};
        border: 1px solid ${isSel ? '#e91e63' : 'rgba(255,255,255,0.1)'};
        border-radius: 6px; display: flex; justify-content: space-between; align-items: center;
        cursor: pointer;
      `;

      item.innerHTML = `
        <div>
          <div style="font-weight: bold; font-size: 13px; color: #ffd54f;">${elem.name}</div>
          <div style="font-size: 11px; color: #aaa; margin-top: 2px;">类型: ${elem.type} | 动作: ${this.getActionName(elem.action)}</div>
        </div>
        <button data-del-elem="${index}" style="background: #c62828; border: none; border-radius: 3px; color: #fff; cursor: pointer; padding: 2px 6px; font-size: 10px;">✕</button>
      `;

      item.onclick = (e) => {
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
        this.selectClickable(elem.id);
      };

      item.querySelector(`[data-del-elem="${index}"]`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.config.clickableElements?.splice(index, 1);
        this.selectedType = 'global';
        this.notifyChange();
        this.render();
      });

      elementsList.appendChild(item);
    });

    container.appendChild(elementsList);
  }

  private renderVisualsTab(container: HTMLElement): void {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label style="font-size: 12px; color: #aaa;">游戏主标题文字</label>
          <input id="inp-title-text" type="text" value="${this.config.titleText || ''}" style="width: 100%; padding: 8px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 4px;">
        </div>
        <div>
          <label style="font-size: 12px; color: #aaa;">副标题文字 (可选)</label>
          <input id="inp-subtitle-text" type="text" value="${this.config.subtitleText || ''}" placeholder="例如：Chapter 1 / Demo Version" style="width: 100%; padding: 8px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 4px;">
        </div>
        <div>
          <label style="font-size: 12px; color: #aaa;">背景图片素材路径 / URL</label>
          <input id="inp-bg-img" type="text" value="${this.config.bgImage || ''}" placeholder="assets/images/title_bg.png" style="width: 100%; padding: 8px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 4px;">
        </div>
        <div>
          <label style="font-size: 12px; color: #aaa;">Logo 图标素材路径 / URL</label>
          <input id="inp-logo-img" type="text" value="${this.config.logoImage || ''}" placeholder="assets/images/logo.png" style="width: 100%; padding: 8px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 4px;">
        </div>
        <div>
          <label style="font-size: 12px; color: #aaa;">界面排版模式</label>
          <select id="sel-layout-theme" style="width: 100%; padding: 8px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 4px;">
            <option value="centered" ${this.config.layoutTheme === 'centered' ? 'selected' : ''}>居中排版 (经典 AVG 风格)</option>
            <option value="left_vertical" ${this.config.layoutTheme === 'left_vertical' ? 'selected' : ''}>左侧竖排 (现代叙事风格)</option>
            <option value="bottom_horizontal" ${this.config.layoutTheme === 'bottom_horizontal' ? 'selected' : ''}>底部横排 (RPG 宽屏风格)</option>
          </select>
        </div>
        <div>
          <label style="font-size: 12px; color: #aaa;">标题背景音乐 BGM 音轨</label>
          <input id="inp-bgm-track" type="text" value="${this.config.bgmTrack || 'title_theme'}" style="width: 100%; padding: 8px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 4px;">
        </div>
      </div>
    `;

    container.querySelector('#inp-title-text')?.addEventListener('input', (e: any) => {
      this.config.titleText = e.target.value;
      this.notifyChange();
      this.updatePreviewDirectly();
    });
    container.querySelector('#inp-subtitle-text')?.addEventListener('input', (e: any) => {
      this.config.subtitleText = e.target.value;
      this.notifyChange();
      this.updatePreviewDirectly();
    });
    container.querySelector('#inp-bg-img')?.addEventListener('input', (e: any) => {
      this.config.bgImage = e.target.value;
      this.notifyChange();
      this.updatePreviewDirectly();
    });
    container.querySelector('#inp-logo-img')?.addEventListener('input', (e: any) => {
      this.config.logoImage = e.target.value;
      this.notifyChange();
      this.updatePreviewDirectly();
    });
    container.querySelector('#sel-layout-theme')?.addEventListener('change', (e: any) => {
      this.config.layoutTheme = e.target.value;
      this.notifyChange();
      this.render();
    });
    container.querySelector('#inp-bgm-track')?.addEventListener('input', (e: any) => {
      this.config.bgmTrack = e.target.value;
      this.notifyChange();
    });
  }

  // -------------------------------------------------------------
  // Center: Live Interactive Screen Preview
  // -------------------------------------------------------------

  private renderPreviewStage(stage: HTMLElement): void {
    const hint = document.createElement('div');
    hint.style.cssText = 'position: absolute; top: 12px; font-size: 12px; color: #aaa; background: rgba(0,0,0,0.5); padding: 4px 12px; border-radius: 12px;';
    hint.innerText = '💡 提示：点击预览画面中的标题、Logo、按钮或热区，右侧将联动打开属性编辑';
    stage.appendChild(hint);

    // 16:9 Screen Box
    const screen = document.createElement('div');
    screen.id = 'title-screen-canvas';
    screen.style.cssText = `
      width: 680px; height: 382px; border-radius: 12px; border: 2px solid #3d496e;
      position: relative; overflow: hidden; display: flex; flex-direction: column;
      box-shadow: 0 20px 60px rgba(0,0,0,0.8);
      background: ${this.config.bgImage ? `url('${this.config.bgImage}') center/cover` : 'linear-gradient(135deg, #10162a 0%, #1a237e 50%, #0d47a1 100%)'};
      transition: background 0.3s;
    `;

    // Title & Logo section
    const isLeft = this.config.layoutTheme === 'left_vertical';
    const isBottom = this.config.layoutTheme === 'bottom_horizontal';

    const titleContainer = document.createElement('div');
    titleContainer.className = 'title-screen-text-zone';
    titleContainer.style.cssText = `
      position: absolute;
      ${isLeft ? 'top: 60px; left: 40px; text-align: left;' : 'top: 50px; left: 0; right: 0; text-align: center;'}
      cursor: pointer; z-index: 10;
    `;
    titleContainer.onclick = () => {
      this.selectedType = 'global';
      this.render();
    };

    if (this.config.logoImage) {
      const logoImg = document.createElement('img');
      logoImg.src = this.config.logoImage;
      logoImg.style.cssText = 'max-height: 50px; margin-bottom: 8px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.6));';
      titleContainer.appendChild(logoImg);
    }

    const mainTitle = document.createElement('div');
    mainTitle.id = 'preview-main-title';
    mainTitle.style.cssText = 'font-size: 38px; font-weight: 900; letter-spacing: 2px; color: #ffd54f; text-shadow: 0 4px 18px rgba(0,0,0,0.9);';
    mainTitle.innerText = this.config.titleText || '我的游戏';
    titleContainer.appendChild(mainTitle);

    if (this.config.subtitleText) {
      const subtitle = document.createElement('div');
      subtitle.id = 'preview-subtitle';
      subtitle.style.cssText = 'font-size: 14px; font-weight: 500; color: #bbdefb; margin-top: 4px; letter-spacing: 1px;';
      subtitle.innerText = this.config.subtitleText;
      titleContainer.appendChild(subtitle);
    }

    screen.appendChild(titleContainer);

    // Buttons Container
    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.className = 'title-screen-buttons-zone';

    if (isLeft) {
      buttonsWrapper.style.cssText = 'position: absolute; left: 40px; top: 160px; display: flex; flex-direction: column; gap: 8px; width: 180px; z-index: 10;';
    } else if (isBottom) {
      buttonsWrapper.style.cssText = 'position: absolute; bottom: 30px; left: 40px; right: 40px; display: flex; justify-content: center; gap: 12px; z-index: 10;';
    } else {
      // Centered
      buttonsWrapper.style.cssText = 'position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; gap: 8px; width: 220px; z-index: 10;';
    }

    this.config.buttons.forEach((btn) => {
      const b = document.createElement('button');
      const isSel = this.selectedType === 'button' && this.selectedButtonId === btn.id;
      b.innerText = btn.label;
      b.style.cssText = `
        padding: 10px 14px; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer;
        background: ${isSel ? '#1976d2' : 'rgba(24, 30, 48, 0.85)'};
        border: 2px solid ${isSel ? '#ffd54f' : 'rgba(255,255,255,0.2)'};
        color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        transition: transform 0.2s, background 0.2s, border-color 0.2s;
      `;
      b.onmouseenter = () => {
        b.style.transform = 'scale(1.04)';
        b.style.borderColor = '#64b5f6';
      };
      b.onmouseleave = () => {
        b.style.transform = 'scale(1)';
        b.style.borderColor = isSel ? '#ffd54f' : 'rgba(255,255,255,0.2)';
      };
      b.onclick = (e) => {
        e.stopPropagation();
        this.selectButton(btn.id);
      };
      buttonsWrapper.appendChild(b);
    });

    screen.appendChild(buttonsWrapper);

    // Clickable Hotspots overlay
    (this.config.clickableElements || []).forEach((elem) => {
      if (elem.type === 'hotspot') {
        const hotspot = document.createElement('div');
        const isSel = this.selectedType === 'clickable' && this.selectedClickableId === elem.id;
        hotspot.style.cssText = `
          position: absolute; left: ${elem.x}%; top: ${elem.y}%; width: ${elem.width || 20}%; height: ${elem.height || 10}%;
          border: 2px dashed ${isSel ? '#ffeb3b' : '#e91e63'}; background: rgba(233, 30, 99, 0.15);
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: bold; color: #fff; cursor: pointer; z-index: 20;
          box-shadow: ${isSel ? '0 0 12px #ffeb3b' : 'none'};
        `;
        hotspot.innerText = `👆 ${elem.name}`;
        hotspot.onclick = (e) => {
          e.stopPropagation();
          this.selectClickable(elem.id);
        };
        screen.appendChild(hotspot);
      }
    });

    stage.appendChild(screen);
  }

  // -------------------------------------------------------------
  // Right Inspector Panel: Configure Active Element
  // -------------------------------------------------------------

  private renderInspector(inspector: HTMLElement): void {
    const title = document.createElement('div');
    title.style.cssText = 'border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; font-size: 15px; font-weight: bold; color: #64b5f6;';

    if (this.selectedType === 'button' && this.selectedButtonId) {
      const btn = this.config.buttons.find((b) => b.id === this.selectedButtonId);
      if (btn) {
        title.innerText = '🔘 按钮属性设置';
        inspector.appendChild(title);
        this.renderButtonInspector(inspector, btn);
        return;
      }
    }

    if (this.selectedType === 'clickable' && this.selectedClickableId) {
      const elem = this.config.clickableElements?.find((e) => e.id === this.selectedClickableId);
      if (elem) {
        title.innerText = '👆 点击元素属性设置';
        inspector.appendChild(title);
        this.renderClickableInspector(inspector, elem);
        return;
      }
    }

    // Default: Global Settings Inspector
    title.innerText = '🎨 开始界面全局属性';
    inspector.appendChild(title);

    inspector.innerHTML += `
      <div style="font-size: 13px; color: #aaa; line-height: 1.5;">
        当前选中：开始界面全局配置。在左侧或预览区点击按钮/热区即可展开专属属性设置。
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
        <div>
          <label style="font-size: 11px; color: #aaa;">游戏标题</label>
          <div style="font-weight: bold; font-size: 14px; color: #ffd54f; margin-top: 2px;">${this.config.titleText || '未命名游戏'}</div>
        </div>
        <div>
          <label style="font-size: 11px; color: #aaa;">配置按钮数量</label>
          <div style="font-size: 13px; color: #fff; margin-top: 2px;">${this.config.buttons.length} 个功能按钮</div>
        </div>
        <div>
          <label style="font-size: 11px; color: #aaa;">点击交互热区数量</label>
          <div style="font-size: 13px; color: #fff; margin-top: 2px;">${this.config.clickableElements?.length || 0} 个交互热区</div>
        </div>
      </div>
    `;
  }

  private renderButtonInspector(inspector: HTMLElement, btn: TitleMenuButton): void {
    const form = document.createElement('div');
    form.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

    form.innerHTML = `
      <div>
        <label style="font-size: 11px; color: #aaa;">按钮唯一标识 (ID)</label>
        <div style="font-family: monospace; font-size: 12px; color: #bbdefb; margin-top: 2px;">${btn.id}</div>
      </div>
      <div>
        <label style="font-size: 11px; color: #aaa;">按钮显示文字 (Label)</label>
        <input id="insp-btn-label" type="text" value="${btn.label}" style="width: 100%; padding: 7px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 2px;">
      </div>
      <div>
        <label style="font-size: 11px; color: #aaa;">点击触发动作 (Action)</label>
        <select id="insp-btn-action" style="width: 100%; padding: 7px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 2px;">
          <option value="new_game" ${btn.action === 'new_game' ? 'selected' : ''}>开始新游戏 (New Game)</option>
          <option value="continue" ${btn.action === 'continue' ? 'selected' : ''}>读取存档 (Continue)</option>
          <option value="settings" ${btn.action === 'settings' ? 'selected' : ''}>打开系统设置 (Settings)</option>
          <option value="achievements" ${btn.action === 'achievements' ? 'selected' : ''}>打开成就面板 (Achievements)</option>
          <option value="gallery" ${btn.action === 'gallery' ? 'selected' : ''}>打开回想图库 (Gallery)</option>
          <option value="jump_story" ${btn.action === 'jump_story' ? 'selected' : ''}>跳转指定剧情事件 (Jump Story)</option>
          <option value="exit" ${btn.action === 'exit' ? 'selected' : ''}>退出游戏 (Exit)</option>
        </select>
      </div>
      <div id="insp-btn-jump-box" style="display: ${btn.action === 'jump_story' ? 'block' : 'none'};">
        <label style="font-size: 11px; color: #aaa;">目标剧情标签/事件 (Story Label)</label>
        <input id="insp-btn-target" type="text" value="${btn.targetStoryLabel || ''}" placeholder="例如: ch1.prologue" style="width: 100%; padding: 7px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 2px;">
      </div>
      <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08);">
        <button id="insp-btn-delete" style="width: 100%; background: #c62828; border: none; border-radius: 6px; color: #fff; padding: 8px; font-weight: bold; cursor: pointer;">删除此按钮</button>
      </div>
    `;

    form.querySelector('#insp-btn-label')?.addEventListener('input', (e: any) => {
      btn.label = e.target.value;
      this.notifyChange();
      this.updatePreviewDirectly();
    });

    const actionSel = form.querySelector('#insp-btn-action') as HTMLSelectElement;
    actionSel.addEventListener('change', () => {
      btn.action = actionSel.value as any;
      const jumpBox = form.querySelector('#insp-btn-jump-box') as HTMLElement;
      if (jumpBox) jumpBox.style.display = btn.action === 'jump_story' ? 'block' : 'none';
      this.notifyChange();
    });

    form.querySelector('#insp-btn-target')?.addEventListener('input', (e: any) => {
      btn.targetStoryLabel = e.target.value;
      this.notifyChange();
    });

    form.querySelector('#insp-btn-delete')?.addEventListener('click', () => {
      const idx = this.config.buttons.findIndex((b) => b.id === btn.id);
      if (idx !== -1) {
        this.config.buttons.splice(idx, 1);
        this.selectedType = 'global';
        this.notifyChange();
        this.render();
      }
    });

    inspector.appendChild(form);
  }

  private renderClickableInspector(inspector: HTMLElement, elem: TitleClickableElement): void {
    const form = document.createElement('div');
    form.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

    form.innerHTML = `
      <div>
        <label style="font-size: 11px; color: #aaa;">元素名称</label>
        <input id="insp-click-name" type="text" value="${elem.name}" style="width: 100%; padding: 7px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 2px;">
      </div>
      <div>
        <label style="font-size: 11px; color: #aaa;">悬浮提示 Tooltip</label>
        <input id="insp-click-tip" type="text" value="${elem.tooltip || ''}" placeholder="鼠标悬浮提示" style="width: 100%; padding: 7px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 2px;">
      </div>
      <div>
        <label style="font-size: 11px; color: #aaa;">点击触发动作</label>
        <select id="insp-click-act" style="width: 100%; padding: 7px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff; margin-top: 2px;">
          <option value="none" ${elem.action === 'none' ? 'selected' : ''}>无动作 (仅展示)</option>
          <option value="jump_story" ${elem.action === 'jump_story' ? 'selected' : ''}>跳转指定剧情节点</option>
          <option value="play_se" ${elem.action === 'play_se' ? 'selected' : ''}>播放彩蛋音效</option>
          <option value="new_game" ${elem.action === 'new_game' ? 'selected' : ''}>开始新游戏</option>
          <option value="achievements" ${elem.action === 'achievements' ? 'selected' : ''}>打开成就</option>
          <option value="gallery" ${elem.action === 'gallery' ? 'selected' : ''}>打开图库</option>
        </select>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div>
          <label style="font-size: 11px; color: #aaa;">X 坐标 (%)</label>
          <input id="insp-click-x" type="number" value="${elem.x}" min="0" max="100" style="width: 100%; padding: 6px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff;">
        </div>
        <div>
          <label style="font-size: 11px; color: #aaa;">Y 坐标 (%)</label>
          <input id="insp-click-y" type="number" value="${elem.y}" min="0" max="100" style="width: 100%; padding: 6px; background: #1c2237; border: 1px solid #3d496e; border-radius: 4px; color: #fff;">
        </div>
      </div>
      <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08);">
        <button id="insp-click-del" style="width: 100%; background: #c62828; border: none; border-radius: 6px; color: #fff; padding: 8px; font-weight: bold; cursor: pointer;">删除此热区</button>
      </div>
    `;

    form.querySelector('#insp-click-name')?.addEventListener('input', (e: any) => {
      elem.name = e.target.value;
      this.notifyChange();
      this.render();
    });
    form.querySelector('#insp-click-tip')?.addEventListener('input', (e: any) => {
      elem.tooltip = e.target.value;
      this.notifyChange();
    });
    form.querySelector('#insp-click-act')?.addEventListener('change', (e: any) => {
      elem.action = e.target.value;
      this.notifyChange();
    });
    form.querySelector('#insp-click-x')?.addEventListener('input', (e: any) => {
      elem.x = Number(e.target.value) || 0;
      this.notifyChange();
      this.render();
    });
    form.querySelector('#insp-click-y')?.addEventListener('input', (e: any) => {
      elem.y = Number(e.target.value) || 0;
      this.notifyChange();
      this.render();
    });
    form.querySelector('#insp-click-del')?.addEventListener('click', () => {
      const idx = this.config.clickableElements?.findIndex((c) => c.id === elem.id);
      if (idx !== undefined && idx !== -1) {
        this.config.clickableElements?.splice(idx, 1);
        this.selectedType = 'global';
        this.notifyChange();
        this.render();
      }
    });

    inspector.appendChild(form);
  }

  // -------------------------------------------------------------
  // Helpers & Event Notifiers
  // -------------------------------------------------------------

  private addButton(label: string, action: any, targetStoryLabel?: string): void {
    const newBtn: TitleMenuButton = {
      id: `btn_${Date.now()}`,
      label,
      action,
      targetStoryLabel,
      enabled: true,
    };
    this.config.buttons.push(newBtn);
    this.selectButton(newBtn.id);
    this.notifyChange();
    this.render();
  }

  private selectButton(id: string): void {
    this.selectedType = 'button';
    this.selectedButtonId = id;
    this.selectedClickableId = null;
    this.render();
  }

  private selectClickable(id: string): void {
    this.selectedType = 'clickable';
    this.selectedClickableId = id;
    this.selectedButtonId = null;
    this.render();
  }

  private updatePreviewDirectly(): void {
    const t = this.container.querySelector('#preview-main-title');
    if (t) t.textContent = this.config.titleText;

    const sub = this.container.querySelector('#preview-subtitle');
    if (sub) sub.textContent = this.config.subtitleText || '';

    const canvas = this.container.querySelector('#title-screen-canvas') as HTMLElement;
    if (canvas) {
      canvas.style.backgroundImage = this.config.bgImage ? `url('${this.config.bgImage}')` : 'none';
    }
  }

  private getActionName(action: string): string {
    const map: Record<string, string> = {
      new_game: '开始新游戏',
      continue: '读取存档',
      settings: '系统设置',
      achievements: '成就殿堂',
      gallery: 'CG 图库',
      jump_story: '跳转剧情事件',
      play_se: '播放音效',
      exit: '退出游戏',
      none: '无动作',
    };
    return map[action] || action;
  }

  private notifyChange(): void {
    if (this.onChange) this.onChange();
  }
}

