import type { StoryGraph, StoryNode } from '../engine/types';

export class FlowchartEditor {
  private container: HTMLElement;
  private graph: StoryGraph;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private selectedNodeId: string | null = null;
  private isDragging: boolean = false;
  private dragOffset = { x: 0, y: 0 };
  private panOffset = { x: 0, y: 0 };
  private isPanning: boolean = false;
  private panStart = { x: 0, y: 0 };
  private zoom: number = 1;

  public onNodeSelect?: (node: StoryNode | null) => void;
  public onGraphChange?: () => void;

  constructor(container: HTMLElement, graph: StoryGraph) {
    this.container = container;
    this.graph = graph;

    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'width: 100%; height: 100%; display: block; cursor: default; touch-action: none;';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    this.setupEvents();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  public setGraph(graph: StoryGraph): void {
    this.graph = graph;
    this.selectedNodeId = null;
    this.render();
  }

  public resize(): void {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width || 800;
    this.canvas.height = rect.height || 600;
    this.render();
  }

  private setupEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e));

    // Touch support for Android / touchscreens (§4.13.2)
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.onMouseDown({ clientX: touch.clientX, clientY: touch.clientY, button: 0 } as any);
      }
    });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as any);
      }
    });

    this.canvas.addEventListener('touchend', () => this.onMouseUp());
  }

  private screenToWorld(sx: number, sy: number) {
    return {
      x: (sx - this.panOffset.x) / this.zoom,
      y: (sy - this.panOffset.y) / this.zoom,
    };
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldPos = this.screenToWorld(mouseX, mouseY);

    // Check hit test on nodes
    let clickedNodeId: string | null = null;
    for (const [id, node] of Object.entries(this.graph.nodes)) {
      if (
        worldPos.x >= node.position.x &&
        worldPos.x <= node.position.x + 180 &&
        worldPos.y >= node.position.y &&
        worldPos.y <= node.position.y + 80
      ) {
        clickedNodeId = id;
        break;
      }
    }

    if (clickedNodeId) {
      this.selectedNodeId = clickedNodeId;
      this.isDragging = true;
      const node = this.graph.nodes[clickedNodeId];
      this.dragOffset = {
        x: worldPos.x - node.position.x,
        y: worldPos.y - node.position.y,
      };
      if (this.onNodeSelect) this.onNodeSelect(node);
    } else {
      // Pan
      this.selectedNodeId = null;
      if (this.onNodeSelect) this.onNodeSelect(null);
      this.isPanning = true;
      this.panStart = { x: mouseX - this.panOffset.x, y: mouseY - this.panOffset.y };
    }

    this.render();
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (this.isDragging && this.selectedNodeId) {
      const worldPos = this.screenToWorld(mouseX, mouseY);
      const node = this.graph.nodes[this.selectedNodeId];
      node.position.x = Math.round(worldPos.x - this.dragOffset.x);
      node.position.y = Math.round(worldPos.y - this.dragOffset.y);
      if (this.onGraphChange) this.onGraphChange();
      this.render();
    } else if (this.isPanning) {
      this.panOffset.x = mouseX - this.panStart.x;
      this.panOffset.y = mouseY - this.panStart.y;
      this.render();
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.isPanning = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    this.zoom = Math.max(0.4, Math.min(2.5, this.zoom * delta));
    this.render();
  }

  public addNode(type: StoryNode['type'], title: string, x: number = 200, y: number = 200): StoryNode {
    const id = `node_${Date.now()}`;
    const newNode: StoryNode = {
      id,
      title,
      type,
      position: { x, y },
      data: type === 'switch_mode' ? { targetModeId: 'rpg', params: {} } : {},
      branches: [],
    };
    this.graph.nodes[id] = newNode;
    this.selectedNodeId = id;
    if (this.onGraphChange) this.onGraphChange();
    if (this.onNodeSelect) this.onNodeSelect(newNode);
    this.render();
    return newNode;
  }

  public connectNodes(fromId: string, toId: string, label: string = 'Next'): void {
    const fromNode = this.graph.nodes[fromId];
    if (!fromNode) return;

    if (!fromNode.branches) fromNode.branches = [];
    fromNode.branches.push({ label, targetNodeId: toId });
    fromNode.next = toId;

    if (this.onGraphChange) this.onGraphChange();
    this.render();
  }

  public render(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.panOffset.x, this.panOffset.y);
    ctx.scale(this.zoom, this.zoom);

    // 1. Draw Grid
    this.drawGrid();

    // 2. Draw Connections / Edges
    this.drawEdges();

    // 3. Draw Nodes
    for (const [id, node] of Object.entries(this.graph.nodes)) {
      this.drawNode(node, id === this.selectedNodeId);
    }

    ctx.restore();
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    const gridSize = 40;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    const startX = Math.floor(-this.panOffset.x / this.zoom / gridSize) * gridSize - 200;
    const endX = startX + (this.canvas.width / this.zoom) + 400;
    const startY = Math.floor(-this.panOffset.y / this.zoom / gridSize) * gridSize - 200;
    const endY = startY + (this.canvas.height / this.zoom) + 400;

    for (let x = startX; x < endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    for (let y = startY; y < endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }
  }

  private drawEdges(): void {
    const ctx = this.ctx;
    ctx.lineWidth = 2.5;

    for (const [fromId, node] of Object.entries(this.graph.nodes)) {
      const fromX = node.position.x + 180;
      const fromY = node.position.y + 40;

      // Draw branch connections
      if (node.branches) {
        node.branches.forEach((b) => {
          const target = this.graph.nodes[b.targetNodeId];
          if (!target) return;

          const toX = target.position.x;
          const toY = target.position.y + 40;

          const cpX1 = fromX + (toX - fromX) * 0.5;
          const cpX2 = cpX1;

          ctx.strokeStyle = '#29b6f6';
          ctx.beginPath();
          ctx.moveTo(fromX, fromY);
          ctx.bezierCurveTo(cpX1, fromY, cpX2, toY, toX, toY);
          ctx.stroke();

          // Arrow head
          ctx.fillStyle = '#29b6f6';
          ctx.beginPath();
          ctx.moveTo(toX, toY);
          ctx.lineTo(toX - 8, toY - 5);
          ctx.lineTo(toX - 8, toY + 5);
          ctx.closePath();
          ctx.fill();

          // Label
          if (b.label) {
            ctx.fillStyle = '#aaa';
            ctx.font = '11px sans-serif';
            ctx.fillText(b.label, (fromX + toX) / 2, (fromY + toY) / 2 - 6);
          }
        });
      }
    }
  }

  private drawNode(node: StoryNode, isSelected: boolean): void {
    const ctx = this.ctx;
    const w = 180;
    const h = 80;
    const x = node.position.x;
    const y = node.position.y;

    // Header color based on node type (§6.1, §6.2)
    let headerColor = '#1976d2'; // Default dialogue
    let typeTag = '对话剧情';
    if (node.type === 'switch_mode') {
      headerColor = '#e91e63'; // Mode Switch (special node §6.2)
      typeTag = `切换模式 -> ${node.data?.targetModeId?.toUpperCase() || 'RPG'}`;
    } else if (node.type === 'battle') {
      headerColor = '#f57c00';
      typeTag = '回合战斗';
    } else if (node.type === 'debate') {
      headerColor = '#7b1fa2';
      typeTag = '法庭辩论';
    } else if (node.type === 'choice') {
      headerColor = '#00897b';
      typeTag = '分支选项';
    } else if (node.type === 'event') {
      headerColor = '#5c6bc0';
      typeTag = '事件序列';
    }

    // Card background
    ctx.fillStyle = '#1e2438';
    ctx.strokeStyle = isSelected ? '#ffd54f' : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = isSelected ? 3 : 1;
    this.roundRect(ctx, x, y, w, h, 8, true, true);

    // Card header
    ctx.fillStyle = headerColor;
    this.roundRect(ctx, x, y, w, 24, { tl: 8, tr: 8, br: 0, bl: 0 }, true, false);

    // Type tag text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(typeTag, x + 10, y + 16);

    // Node Title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(node.title, x + 10, y + 46);

    // Node preview snippet
    const snippet = node.data?.text || node.data?.params?.mapId || '';
    ctx.fillStyle = '#9e9e9e';
    ctx.font = '11px sans-serif';
    const truncated = snippet.length > 20 ? snippet.slice(0, 18) + '...' : snippet;
    ctx.fillText(truncated, x + 10, y + 66);
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: any, fill: boolean, stroke: boolean): void {
    let r = { tl: 0, tr: 0, br: 0, bl: 0 };
    if (typeof radius === 'number') {
      r = { tl: radius, tr: radius, br: radius, bl: radius };
    } else {
      r = radius;
    }
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + w - r.tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    ctx.lineTo(x + w, y + h - r.br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    ctx.lineTo(x + r.bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }
}
