import type { TilemapData, MapEvent } from '../engine/types';

export class TilemapEditor {
  private container: HTMLElement;
  private mapData: TilemapData;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentTool: 'draw' | 'collision' | 'region' | 'event' = 'draw';
  private currentTileIndex: number = 0;
  private currentRegion: number = 1;
  private isMouseDown: boolean = false;
  private selectedEvent: MapEvent | null = null;
  public onChange?: () => void;

  constructor(container: HTMLElement, mapData: TilemapData) {
    this.container = container;
    this.mapData = mapData;

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;

    this.setupUI();
    this.render();
  }

  public setMap(mapData: TilemapData): void {
    this.mapData = mapData;
    this.selectedEvent = null;
    this.render();
  }

  private setupUI(): void {
    this.container.innerHTML = '';
    const root = document.createElement('div');
    root.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column; background: #121522; color: #fff; font-family: sans-serif;';

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'padding: 10px 16px; background: #181d2e; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; gap: 12px; align-items: center;';

    const btnStyle = (active: boolean) => `
      padding: 6px 14px; font-size: 12px; font-weight: bold; border-radius: 6px; border: none; cursor: pointer;
      background: ${active ? '#1976d2' : '#22293d'}; color: #fff;
    `;

    const drawBtn = document.createElement('button');
    drawBtn.innerText = '🎨 Ground Tiles';
    drawBtn.style.cssText = btnStyle(this.currentTool === 'draw');
    drawBtn.onclick = () => {
      this.currentTool = 'draw';
      this.setupUI();
    };

    const colBtn = document.createElement('button');
    colBtn.innerText = '⛔ Collision (碰撞层)';
    colBtn.style.cssText = btnStyle(this.currentTool === 'collision');
    colBtn.onclick = () => {
      this.currentTool = 'collision';
      this.setupUI();
    };

    const regBtn = document.createElement('button');
    regBtn.innerText = '🏷️ Region (区域层)';
    regBtn.style.cssText = btnStyle(this.currentTool === 'region');
    regBtn.onclick = () => {
      this.currentTool = 'region';
      this.setupUI();
    };

    const evBtn = document.createElement('button');
    evBtn.innerText = '⚡ Place Event (事件)';
    evBtn.style.cssText = btnStyle(this.currentTool === 'event');
    evBtn.onclick = () => {
      this.currentTool = 'event';
      this.setupUI();
    };

    toolbar.append(drawBtn, colBtn, regBtn, evBtn);
    root.appendChild(toolbar);

    // Canvas viewport
    const viewport = document.createElement('div');
    viewport.style.cssText = 'flex: 1; overflow: auto; display: flex; justify-content: center; align-items: center; padding: 20px;';

    this.canvas.width = this.mapData.width * this.mapData.tileSize;
    this.canvas.height = this.mapData.height * this.mapData.tileSize;
    this.canvas.style.cssText = 'border: 2px solid #3d496e; box-shadow: 0 10px 30px rgba(0,0,0,0.6); background: #161a29; cursor: crosshair;';

    this.canvas.onmousedown = (e) => {
      this.isMouseDown = true;
      this.handleCanvasClick(e);
    };
    this.canvas.onmousemove = (e) => {
      if (this.isMouseDown && this.currentTool !== 'event') {
        this.handleCanvasClick(e);
      }
    };
    window.onmouseup = () => {
      this.isMouseDown = false;
    };

    viewport.appendChild(this.canvas);
    root.appendChild(viewport);
    this.container.appendChild(root);
  }

  private handleCanvasClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / this.mapData.tileSize);
    const y = Math.floor((e.clientY - rect.top) / this.mapData.tileSize);

    if (x < 0 || x >= this.mapData.width || y < 0 || y >= this.mapData.height) return;
    const idx = y * this.mapData.width + x;

    if (this.currentTool === 'draw') {
      this.mapData.data[idx] = this.currentTileIndex;
    } else if (this.currentTool === 'collision') {
      this.mapData.collision[idx] = !this.mapData.collision[idx];
    } else if (this.currentTool === 'region') {
      this.mapData.regions[idx] = this.currentRegion;
    } else if (this.currentTool === 'event') {
      const existing = this.mapData.events.find((ev) => ev.x === x && ev.y === y);
      if (!existing) {
        this.mapData.events.push({
          id: `ev_${Date.now()}`,
          name: 'New Event',
          x,
          y,
          pages: [
            {
              conditions: {},
              trigger: 'action',
              commands: [{ code: 'show_text', parameters: { text: 'Hello from map event!' } }],
            },
          ],
        });
      }
    }

    if (this.onChange) this.onChange();
    this.render();
  }

  public render(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const ts = this.mapData.tileSize;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Draw tiles
    for (let y = 0; y < this.mapData.height; y++) {
      for (let x = 0; x < this.mapData.width; x++) {
        const idx = y * this.mapData.width + x;
        const isSolid = this.mapData.collision[idx];

        ctx.fillStyle = (x + y) % 2 === 0 ? '#1f2538' : '#252c42';
        ctx.fillRect(x * ts, y * ts, ts, ts);

        // Tile grid outline
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.strokeRect(x * ts, y * ts, ts, ts);

        // Collision overlay
        if (isSolid) {
          ctx.fillStyle = 'rgba(244, 67, 54, 0.45)';
          ctx.fillRect(x * ts, y * ts, ts, ts);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('✕', x * ts + ts / 2, y * ts + ts / 2 + 4);
        }

        // Region code overlay
        const reg = this.mapData.regions[idx];
        if (reg > 0) {
          ctx.fillStyle = '#ffb74d';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`R${reg}`, x * ts + 2, y * ts + 12);
        }
      }
    }

    // 2. Draw Events
    for (const ev of this.mapData.events) {
      ctx.fillStyle = '#ff9800';
      ctx.beginPath();
      ctx.arc(ev.x * ts + ts / 2, ev.y * ts + ts / 2, ts / 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ev.name, ev.x * ts + ts / 2, ev.y * ts - 2);
    }
  }
}
