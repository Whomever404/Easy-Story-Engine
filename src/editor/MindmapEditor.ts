import type { StoryGraph, StoryNode } from '../engine/types';

export class MindmapEditor {
  private container: HTMLElement;
  private graph: StoryGraph;
  public onSelectNode?: (nodeId: string) => void;

  constructor(container: HTMLElement, graph: StoryGraph) {
    this.container = container;
    this.graph = graph;
    this.render();
  }

  public setGraph(graph: StoryGraph): void {
    this.graph = graph;
    this.render();
  }

  public render(): void {
    this.container.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'ese-mindmap-view';
    root.style.cssText = `
      width: 100%; height: 100%; overflow: auto; padding: 40px;
      display: flex; flex-direction: column; align-items: center; gap: 32px;
      background: #141824; color: #fff; font-family: sans-serif;
    `;

    // Root Chapter Center Node
    const centerNode = document.createElement('div');
    centerNode.style.cssText = `
      background: linear-gradient(135deg, #1976d2, #0d47a1);
      border: 3px solid #64b5f6; border-radius: 16px; padding: 18px 36px;
      font-size: 20px; font-weight: bold; box-shadow: 0 10px 30px rgba(25, 118, 210, 0.4);
      text-align: center;
    `;
    centerNode.innerHTML = `
      <div>${this.graph.title || '章节主轴'}</div>
      <div style="font-size: 12px; color: #bbdefb; margin-top: 4px;">章节 ID: ${this.graph.id}</div>
    `;
    root.appendChild(centerNode);

    // Radiating Children Grid / Tree
    const treeGrid = document.createElement('div');
    treeGrid.style.cssText = `
      display: flex; flex-wrap: wrap; justify-content: center; gap: 24px;
      max-width: 1000px;
    `;

    for (const [id, node] of Object.entries(this.graph.nodes)) {
      const card = document.createElement('div');
      card.style.cssText = `
        background: #1e2438; border: 1px solid rgba(255,255,255,0.15);
        border-radius: 10px; padding: 16px; width: 220px; cursor: pointer;
        transition: transform 0.2s, border-color 0.2s; box-shadow: 0 6px 18px rgba(0,0,0,0.4);
      `;
      card.onmouseenter = () => {
        card.style.borderColor = '#64b5f6';
        card.style.transform = 'translateY(-4px)';
      };
      card.onmouseleave = () => {
        card.style.borderColor = 'rgba(255,255,255,0.15)';
        card.style.transform = 'none';
      };

      const tagColor = node.type === 'switch_mode' ? '#e91e63' : node.type === 'battle' ? '#f57c00' : '#2196f3';
      const typeLabel = node.type === 'switch_mode' ? '切换模式' : node.type === 'battle' ? '回合战斗' : node.type === 'debate' ? '法庭辩论' : node.type === 'choice' ? '分支选项' : '剧情对话';

      card.innerHTML = `
        <div style="display: inline-block; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: ${tagColor}; margin-bottom: 8px;">
          ${typeLabel}
        </div>
        <div style="font-weight: bold; font-size: 15px; margin-bottom: 6px;">${node.title}</div>
        <div style="font-size: 12px; color: #aaa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${node.data?.text || node.data?.targetModeId || '事件节点'}
        </div>
      `;

      card.onclick = () => {
        if (this.onSelectNode) this.onSelectNode(id);
      };

      treeGrid.appendChild(card);
    }

    root.appendChild(treeGrid);
    this.container.appendChild(root);
  }
}
