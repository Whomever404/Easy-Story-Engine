import type {
  GameModeModule,
  ModeContext,
  GameModeCapabilities,
  TilemapData,
  MapEvent,
  ItemAdapter,
} from '../../types';
import { BattleSystem } from './BattleSystem';

export class RpgMode implements GameModeModule {
  public id = 'rpg';
  public capabilities: GameModeCapabilities = {
    supportsOverlay: false,
    itemDomain: 'rpg',
  };

  private ctx: ModeContext | null = null;
  private rootElement: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;

  // Map state
  private currentMapId: string = 'map_01';
  private currentMap: TilemapData | null = null;
  private playerX: number = 3;
  private playerY: number = 3;
  private playerDir: 'down' | 'left' | 'right' | 'up' = 'down';
  private tileSize: number = 32;

  // Battle state
  private activeBattle: BattleSystem | null = null;
  private battleOverlay: HTMLElement | null = null;

  // Input state
  private keysPressed: Set<string> = new Set();
  private lastMoveTime: number = 0;
  private moveDelay: number = 180; // ms between grid steps

  public itemAdapter: ItemAdapter = {
    canUse: (_itemId: string, item: any) => {
      return item?.type === 'item';
    },
    useEffect: (itemId: string, item: any, ctx: ModeContext) => {
      // e.g. Potion
      if (item?.hpRecovery) {
        ctx.shell.playSe('confirm');
        ctx.shell.removeItem(itemId, 1, 'rpg');
      }
    },
  };

  public onEnter(ctx: ModeContext): void {
    this.ctx = ctx;
    this.setupUI(ctx.container);
    this.loadMap(ctx.data?.mapId || this.currentMapId);

    if (ctx.data?.x !== undefined) this.playerX = ctx.data.x;
    if (ctx.data?.y !== undefined) this.playerY = ctx.data.y;

    this.registerInput();
    this.registerEventListeners();
  }

  public onExit(_ctx: ModeContext): void {
    this.unregisterInput();
    if (this.rootElement && this.rootElement.parentNode) {
      this.rootElement.parentNode.removeChild(this.rootElement);
    }
    this.rootElement = null;
    this.canvas = null;
    this.canvasCtx = null;
    this.ctx = null;
  }

  public update(_dt: number): void {
    if (this.activeBattle) return;
    this.handleMovement();
    this.checkParallelEvents();
  }

  public render(): void {
    if (this.activeBattle) return;
    this.renderMap();
  }

  public serialize(): object {
    return {
      currentMapId: this.currentMapId,
      playerX: this.playerX,
      playerY: this.playerY,
      playerDir: this.playerDir,
    };
  }

  public deserialize(data: any): void {
    if (!data) return;
    this.currentMapId = data.currentMapId || 'map_01';
    this.playerX = data.playerX ?? 3;
    this.playerY = data.playerY ?? 3;
    this.playerDir = data.playerDir || 'down';
    if (this.ctx) {
      this.loadMap(this.currentMapId);
    }
  }

  // -------------------------------------------------------------
  // UI & Canvas Setup
  // -------------------------------------------------------------

  private setupUI(container: HTMLElement): void {
    const root = document.createElement('div');
    root.className = 'ese-rpg-viewport';
    root.style.cssText = `
      position: absolute; inset: 0; width: 100%; height: 100%;
      background: #0d0f18; overflow: hidden; display: flex;
      flex-direction: column; align-items: center; justify-content: center;
      user-select: none; font-family: sans-serif;
    `;
    this.rootElement = root;

    const cv = document.createElement('canvas');
    cv.width = 640;
    cv.height = 480;
    cv.style.cssText = 'border: 2px solid #2a314b; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); background: #161a29;';
    this.canvas = cv;
    this.canvasCtx = cv.getContext('2d');
    root.appendChild(cv);

    // Top status HUD
    const hud = document.createElement('div');
    hud.className = 'ese-rpg-hud';
    hud.style.cssText = `
      position: absolute; top: 12px; left: 16px; right: 16px;
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 16px; background: rgba(18, 22, 36, 0.85); backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; z-index: 5;
    `;
    hud.innerHTML = `
      <div style="font-weight: bold; color: #64b5f6;">Map: <span id="rpg-hud-map-name"></span></div>
      <div style="display: flex; gap: 16px; font-size: 14px;">
        <span style="color: #ffd54f;">Gold: <span id="rpg-hud-gold">0</span></span>
        <button id="rpg-hud-bag-btn" style="background: #283593; border: 1px solid #5c6bc0; color: #fff; padding: 2px 10px; border-radius: 4px; cursor: pointer;">Items</button>
      </div>
    `;
    root.appendChild(hud);

    // Touch D-Pad for Mobile / Touch device support (§4.13)
    const dpad = document.createElement('div');
    dpad.className = 'ese-rpg-dpad';
    dpad.style.cssText = `
      position: absolute; bottom: 20px; left: 20px; width: 130px; height: 130px;
      display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr);
      gap: 4px; z-index: 6; opacity: 0.8;
    `;
    dpad.innerHTML = `
      <div></div><button data-dir="up" style="background: rgba(255,255,255,0.2); border: none; border-radius: 6px; color: #fff; font-size: 18px; cursor: pointer;">▲</button><div></div>
      <button data-dir="left" style="background: rgba(255,255,255,0.2); border: none; border-radius: 6px; color: #fff; font-size: 18px; cursor: pointer;">◀</button>
      <button data-dir="action" style="background: #e91e63; border: none; border-radius: 6px; color: #fff; font-size: 13px; font-weight: bold; cursor: pointer;">OK</button>
      <button data-dir="right" style="background: rgba(255,255,255,0.2); border: none; border-radius: 6px; color: #fff; font-size: 18px; cursor: pointer;">▶</button>
      <div></div><button data-dir="down" style="background: rgba(255,255,255,0.2); border: none; border-radius: 6px; color: #fff; font-size: 18px; cursor: pointer;">▼</button><div></div>
    `;
    dpad.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('button');
      if (!target) return;
      const dir = target.getAttribute('data-dir');
      if (dir === 'action') {
        this.interact();
      } else if (dir) {
        this.stepDirection(dir as any);
      }
    });
    root.appendChild(dpad);

    container.appendChild(root);

    // Bag button listener
    const bagBtn = hud.querySelector('#rpg-hud-bag-btn');
    if (bagBtn) {
      bagBtn.addEventListener('click', () => this.showRpgInventoryModal());
    }
  }

  private registerEventListeners(): void {
    if (!this.ctx) return;

    this.ctx.shell.on('rpg.battle_processing', (data: any) => {
      this.startBattle(data.troopId, {
        canEscape: data.canEscape,
        canLose: data.canLose,
        onResult: data.onResult,
      });
    });

    this.ctx.shell.on('rpg.transfer_player', (data: any) => {
      if (data.mapId) this.loadMap(data.mapId);
      if (data.x !== undefined) this.playerX = data.x;
      if (data.y !== undefined) this.playerY = data.y;
      if (data.direction) this.playerDir = data.direction;
    });
  }

  // -------------------------------------------------------------
  // Map Loading & Rendering (§3.1)
  // -------------------------------------------------------------

  public loadMap(mapId: string): void {
    this.currentMapId = mapId;
    let mapData: TilemapData | undefined = this.ctx?.shell.projectData.maps[mapId];

    if (!mapData) {
      // Default fallback test map (20x15)
      mapData = {
        id: mapId,
        name: 'Town Square',
        width: 20,
        height: 15,
        tileSize: 32,
        data: new Array(20 * 15).fill(0),
        regions: new Array(20 * 15).fill(0),
        collision: new Array(20 * 15).fill(false),
        events: [
          {
            id: 'npc_guard',
            name: 'Town Guard',
            x: 5,
            y: 4,
            pages: [
              {
                conditions: {},
                trigger: 'action',
                commands: [
                  {
                    code: 'show_text',
                    parameters: {
                      characterId: 'guard',
                      characterName: 'Town Guard',
                      text: 'Halt traveler! The road ahead is perilous. Take this sword and beware!',
                    },
                  },
                  {
                    code: 'change_items',
                    parameters: {
                      itemId: 'iron_sword',
                      amount: 1,
                      domain: 'rpg',
                    },
                  },
                ],
              },
            ],
          },
          {
            id: 'battle_encounter',
            name: 'Monster Ambush',
            x: 8,
            y: 7,
            pages: [
              {
                conditions: {},
                trigger: 'player_touch',
                commands: [
                  {
                    code: 'show_text',
                    parameters: {
                      text: 'A wild monster jumps out from the bushes!',
                    },
                  },
                  {
                    code: 'battle_processing',
                    parameters: {
                      troopId: 'troop_1',
                      canEscape: true,
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      // Add border collisions
      for (let x = 0; x < 20; x++) {
        mapData.collision[x] = true;
        mapData.collision[14 * 20 + x] = true;
      }
      for (let y = 0; y < 15; y++) {
        mapData.collision[y * 20] = true;
        mapData.collision[y * 20 + 19] = true;
      }
    }

    this.currentMap = mapData;
    this.tileSize = mapData.tileSize || 32;

    if (this.rootElement) {
      const mapNameEl = this.rootElement.querySelector('#rpg-hud-map-name');
      if (mapNameEl) mapNameEl.textContent = mapData.name;
    }

    this.updateHud();
  }

  private updateHud(): void {
    if (!this.rootElement || !this.ctx) return;
    const goldEl = this.rootElement.querySelector('#rpg-hud-gold');
    if (goldEl) {
      const gold = this.ctx.shell.getGlobal('rpg.gold') ?? 0;
      goldEl.textContent = String(gold);
    }
  }

  private renderMap(): void {
    if (!this.canvasCtx || !this.canvas || !this.currentMap) return;
    const ctx = this.canvasCtx;
    const map = this.currentMap;
    const ts = this.tileSize;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Camera offset centered on player
    const camX = Math.round(this.canvas.width / 2 - (this.playerX + 0.5) * ts);
    const camY = Math.round(this.canvas.height / 2 - (this.playerY + 0.5) * ts);

    ctx.save();
    ctx.translate(camX, camY);

    // 1. Render Ground Tiles
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const idx = y * map.width + x;
        const isSolid = map.collision[idx];

        // Grid pattern
        ctx.fillStyle = isSolid ? '#1b2234' : (x + y) % 2 === 0 ? '#22293d' : '#28314a';
        ctx.fillRect(x * ts, y * ts, ts, ts);

        // Tile border
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.strokeRect(x * ts, y * ts, ts, ts);

        if (isSolid) {
          ctx.fillStyle = '#101524';
          ctx.fillRect(x * ts + 2, y * ts + 2, ts - 4, ts - 4);
        }
      }
    }

    // 2. Render Map Events (NPCs, chests, triggers)
    for (const ev of map.events) {
      const page = this.getActiveEventPage(ev);
      if (!page) continue;

      ctx.fillStyle = '#ff9800';
      ctx.beginPath();
      ctx.arc(ev.x * ts + ts / 2, ev.y * ts + ts / 2, ts / 3, 0, Math.PI * 2);
      ctx.fill();

      // Event label
      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ev.name, ev.x * ts + ts / 2, ev.y * ts - 4);
    }

    // 3. Render Player
    ctx.fillStyle = '#2196f3';
    ctx.beginPath();
    ctx.arc(this.playerX * ts + ts / 2, this.playerY * ts + ts / 2, ts / 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Direction indicator
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const cx = this.playerX * ts + ts / 2;
    const cy = this.playerY * ts + ts / 2;
    ctx.moveTo(cx, cy);
    if (this.playerDir === 'down') ctx.lineTo(cx, cy + 12);
    else if (this.playerDir === 'up') ctx.lineTo(cx, cy - 12);
    else if (this.playerDir === 'left') ctx.lineTo(cx - 12, cy);
    else if (this.playerDir === 'right') ctx.lineTo(cx + 12, cy);
    ctx.stroke();

    ctx.restore();
  }

  // -------------------------------------------------------------
  // Movement & Input (§3.1, §3.2)
  // -------------------------------------------------------------

  private registerInput(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private unregisterInput(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keysPressed.add(e.key.toLowerCase());
    if (e.key === ' ' || e.key === 'Enter') {
      this.interact();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysPressed.delete(e.key.toLowerCase());
  };

  private handleMovement(): void {
    const now = performance.now();
    if (now - this.lastMoveTime < this.moveDelay) return;

    if (this.keysPressed.has('arrowup') || this.keysPressed.has('w')) {
      this.stepDirection('up');
      this.lastMoveTime = now;
    } else if (this.keysPressed.has('arrowdown') || this.keysPressed.has('s')) {
      this.stepDirection('down');
      this.lastMoveTime = now;
    } else if (this.keysPressed.has('arrowleft') || this.keysPressed.has('a')) {
      this.stepDirection('left');
      this.lastMoveTime = now;
    } else if (this.keysPressed.has('arrowright') || this.keysPressed.has('d')) {
      this.stepDirection('right');
      this.lastMoveTime = now;
    }
  }

  private stepDirection(dir: 'down' | 'left' | 'right' | 'up'): void {
    this.playerDir = dir;
    let targetX = this.playerX;
    let targetY = this.playerY;

    if (dir === 'up') targetY--;
    else if (dir === 'down') targetY++;
    else if (dir === 'left') targetX--;
    else if (dir === 'right') targetX++;

    if (this.canPass(targetX, targetY)) {
      this.playerX = targetX;
      this.playerY = targetY;
      this.checkPlayerTouchEvents();
    }
  }

  private canPass(x: number, y: number): boolean {
    if (!this.currentMap) return false;
    if (x < 0 || x >= this.currentMap.width || y < 0 || y >= this.currentMap.height) return false;

    const idx = y * this.currentMap.width + x;
    if (this.currentMap.collision[idx]) return false;

    // Check NPC obstacle
    for (const ev of this.currentMap.events) {
      if (ev.x === x && ev.y === y) {
        const page = this.getActiveEventPage(ev);
        if (page) return false;
      }
    }

    return true;
  }

  private interact(): void {
    if (!this.currentMap || !this.ctx) return;
    let targetX = this.playerX;
    let targetY = this.playerY;

    if (this.playerDir === 'up') targetY--;
    else if (this.playerDir === 'down') targetY++;
    else if (this.playerDir === 'left') targetX--;
    else if (this.playerDir === 'right') targetX++;

    for (const ev of this.currentMap.events) {
      if (ev.x === targetX && ev.y === targetY) {
        const page = this.getActiveEventPage(ev);
        if (page && page.trigger === 'action') {
          this.ctx.shell.playSe('confirm');
          this.ctx.shell.executeCommands(page.commands);
          return;
        }
      }
    }
  }

  private checkPlayerTouchEvents(): void {
    if (!this.currentMap || !this.ctx) return;
    for (const ev of this.currentMap.events) {
      if (ev.x === this.playerX && ev.y === this.playerY) {
        const page = this.getActiveEventPage(ev);
        if (page && page.trigger === 'player_touch') {
          this.ctx.shell.executeCommands(page.commands);
          return;
        }
      }
    }
  }

  private checkParallelEvents(): void {
    if (!this.currentMap || !this.ctx) return;
    for (const ev of this.currentMap.events) {
      const page = this.getActiveEventPage(ev);
      if (page && page.trigger === 'auto') {
        this.ctx.shell.executeCommands(page.commands);
      }
    }
  }

  private getActiveEventPage(ev: MapEvent) {
    if (!this.ctx) return ev.pages[0];
    for (let i = ev.pages.length - 1; i >= 0; i--) {
      const page = ev.pages[i];
      let pass = true;

      if (page.conditions.switch1Id) {
        const swVal = this.ctx.shell.getSwitch(page.conditions.switch1Id);
        if (swVal !== (page.conditions.switch1Val ?? true)) pass = false;
      }

      if (page.conditions.variableId && page.conditions.variableVal !== undefined) {
        const vVal = Number(this.ctx.shell.getVariable(page.conditions.variableId)) || 0;
        if (vVal < page.conditions.variableVal) pass = false;
      }

      if (pass) return page;
    }
    return null;
  }

  // -------------------------------------------------------------
  // Turn-Based Battle Overlay (§3.3)
  // -------------------------------------------------------------

  public startBattle(
    troopId: string,
    options: {
      canEscape?: boolean;
      canLose?: boolean;
      onResult: (res: 'win' | 'lose' | 'escape') => void;
    }
  ): void {
    if (!this.ctx || !this.rootElement) return;

    this.activeBattle = new BattleSystem(this.ctx.shell, troopId, {
      canEscape: options.canEscape,
      canLose: options.canLose,
      onResult: (result) => {
        this.endBattle(result, options.onResult);
      },
    });

    this.renderBattleOverlay();
  }

  private renderBattleOverlay(): void {
    if (!this.rootElement || !this.activeBattle) return;

    const overlay = document.createElement('div');
    overlay.className = 'ese-rpg-battle-overlay';
    overlay.style.cssText = `
      position: absolute; inset: 0; z-index: 20;
      background: rgba(10, 14, 24, 0.95); backdrop-filter: blur(8px);
      display: flex; flex-direction: column; justify-content: space-between;
      padding: 24px; color: #fff;
    `;
    this.battleOverlay = overlay;

    // Top: Enemies Section
    const enemySection = document.createElement('div');
    enemySection.className = 'ese-battle-enemies';
    enemySection.style.cssText = 'display: flex; justify-content: center; gap: 32px; padding: 20px 0;';

    this.activeBattle.enemies.forEach((enemy, idx) => {
      const card = document.createElement('div');
      card.className = `ese-enemy-card-${idx}`;
      card.style.cssText = `
        background: rgba(255,255,255,0.06); border: 2px solid #e91e63;
        border-radius: 12px; padding: 16px; text-align: center; width: 140px;
        box-shadow: 0 4px 20px rgba(233,30,99,0.25);
      `;
      card.innerHTML = `
        <div style="font-size: 32px; margin-bottom: 8px;">👾</div>
        <div style="font-weight: bold; color: #ff80ab;">${enemy.name}</div>
        <div style="font-size: 13px; color: #bbb; margin-top: 6px;">HP: <span class="hp-val">${enemy.hp}</span> / ${enemy.maxHp}</div>
        <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; overflow: hidden; margin-top: 6px;">
          <div class="hp-bar" style="height: 100%; width: ${(enemy.hp / enemy.maxHp) * 100}%; background: #e91e63;"></div>
        </div>
      `;
      enemySection.appendChild(card);
    });
    overlay.appendChild(enemySection);

    // Middle: Battle Log
    const logBox = document.createElement('div');
    logBox.className = 'ese-battle-log';
    logBox.style.cssText = 'background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; height: 80px; overflow-y: auto; font-size: 14px; color: #90caf9;';
    logBox.innerHTML = this.activeBattle.log.map((l) => `<div>${l}</div>`).join('');
    overlay.appendChild(logBox);

    // Bottom: Party & Command Actions
    const bottomSection = document.createElement('div');
    bottomSection.style.cssText = 'display: flex; gap: 20px; align-items: stretch;';

    // Party HP/MP
    const partyBox = document.createElement('div');
    partyBox.style.cssText = 'flex: 1; background: rgba(255,255,255,0.05); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px;';
    this.activeBattle.actors.forEach((act) => {
      partyBox.innerHTML += `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: bold; color: #64b5f6;">${act.name}</span>
          <span style="font-size: 13px; color: #81c784;">HP: ${act.hp}/${act.maxHp} | MP: ${act.mp}/${act.maxMp}</span>
        </div>
      `;
    });
    bottomSection.appendChild(partyBox);

    // Action Commands
    const actionBox = document.createElement('div');
    actionBox.style.cssText = 'width: 280px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;';

    const btnStyle = 'background: #1976d2; border: none; border-radius: 6px; color: #fff; font-size: 15px; font-weight: bold; padding: 12px; cursor: pointer; transition: 0.2s;';

    const atkBtn = document.createElement('button');
    atkBtn.innerText = 'Attack';
    atkBtn.style.cssText = btnStyle;
    atkBtn.onclick = () => {
      if (!this.activeBattle) return;
      this.activeBattle.executePlayerAttack(0, 0);
      if (!this.activeBattle.isFinished) {
        this.activeBattle.executeEnemyTurns();
      }
      this.refreshBattleOverlay();
    };

    const skillBtn = document.createElement('button');
    skillBtn.innerText = 'Skill';
    skillBtn.style.cssText = btnStyle + 'background: #7b1fa2;';
    skillBtn.onclick = () => {
      if (!this.activeBattle) return;
      this.activeBattle.executePlayerSkill(0, 'slash', 0);
      if (!this.activeBattle.isFinished) {
        this.activeBattle.executeEnemyTurns();
      }
      this.refreshBattleOverlay();
    };

    const escapeBtn = document.createElement('button');
    escapeBtn.innerText = 'Escape';
    escapeBtn.style.cssText = btnStyle + 'background: #e65100;';
    escapeBtn.onclick = () => {
      if (!this.activeBattle) return;
      this.activeBattle.escape();
      this.refreshBattleOverlay();
    };

    actionBox.append(atkBtn, skillBtn, escapeBtn);
    bottomSection.appendChild(actionBox);

    overlay.appendChild(bottomSection);
    this.rootElement.appendChild(overlay);
  }

  private refreshBattleOverlay(): void {
    if (!this.battleOverlay || !this.activeBattle) return;
    const logBox = this.battleOverlay.querySelector('.ese-battle-log');
    if (logBox) {
      logBox.innerHTML = this.activeBattle.log.map((l) => `<div>${l}</div>`).join('');
      logBox.scrollTop = logBox.scrollHeight;
    }

    // Refresh enemies HP bars
    this.activeBattle.enemies.forEach((enemy, idx) => {
      const card = this.battleOverlay!.querySelector(`.ese-enemy-card-${idx}`);
      if (card) {
        const hpVal = card.querySelector('.hp-val');
        const hpBar = card.querySelector('.hp-bar') as HTMLElement;
        if (hpVal) hpVal.textContent = String(enemy.hp);
        if (hpBar) hpBar.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
      }
    });
  }

  private endBattle(result: 'win' | 'lose' | 'escape', callback: (res: 'win' | 'lose' | 'escape') => void): void {
    setTimeout(() => {
      if (this.battleOverlay && this.battleOverlay.parentNode) {
        this.battleOverlay.parentNode.removeChild(this.battleOverlay);
        this.battleOverlay = null;
      }
      this.activeBattle = null;
      callback(result);
    }, 1200);
  }

  private showRpgInventoryModal(): void {
    if (!this.ctx || !this.rootElement) return;
    const items = this.ctx.shell.state.items.rpg;

    const modalBackdrop = document.createElement('div');
    modalBackdrop.style.cssText = `
      position: absolute; inset: 0; z-index: 50;
      background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
      display: flex; justify-content: center; align-items: center; color: #fff;
    `;

    const box = document.createElement('div');
    box.style.cssText = 'background: #181d2e; border: 1px solid #3d496e; border-radius: 12px; width: 440px; padding: 20px;';
    box.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; color: #64b5f6;">RPG Inventory</h3>
        <button id="close-rpg-bag" style="background: none; border: none; color: #aaa; font-size: 18px; cursor: pointer;">✕</button>
      </div>
      <div id="rpg-bag-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow-y: auto;"></div>
    `;

    const list = box.querySelector('#rpg-bag-list')!;
    if (items.length === 0) {
      list.innerHTML = '<div style="color: #999;">No equipment or RPG items.</div>';
    } else {
      items.forEach((item) => {
        const entity = this.ctx?.shell.getEntity(item.id);
        const facet = entity?.facets?.rpg;
        const entry = document.createElement('div');
        entry.style.cssText = 'padding: 8px 12px; background: rgba(255,255,255,0.05); border-radius: 6px; display: flex; justify-content: space-between; align-items: center;';
        entry.innerHTML = `
          <div>
            <div style="font-weight: bold; color: #ffd54f;">${entity?.base?.name || item.id} (x${item.count})</div>
            <div style="font-size: 12px; color: #aaa;">[${facet?.type?.toUpperCase() || item.type.toUpperCase()}] ${entity?.base?.desc || ''}</div>
          </div>
        `;
        list.appendChild(entry);
      });
    }

    box.querySelector('#close-rpg-bag')?.addEventListener('click', () => {
      modalBackdrop.remove();
    });

    modalBackdrop.appendChild(box);
    this.rootElement.appendChild(modalBackdrop);
  }
}
