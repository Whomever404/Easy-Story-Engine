import { describe, it, expect } from 'vitest';
import { FlowchartEditor } from '../src/editor/FlowchartEditor';
import { BlockEditor } from '../src/editor/BlockEditor';
import { WebEditor } from '../src/editor/WebEditor';
import type { ProjectData, StoryGraph } from '../src/engine/types';

describe('Editor Views', () => {
  const dummyGraph: StoryGraph = {
    id: 'ch1',
    chapter: '1',
    title: 'Chapter 1: The Encounter',
    startNodeId: 'n1',
    nodes: {
      n1: { id: 'n1', title: 'Prologue Dialogue', type: 'dialogue', position: { x: 50, y: 50 }, data: { text: 'Hello' } },
      n2: { id: 'n2', title: 'Enter Dungeon', type: 'switch_mode', position: { x: 300, y: 50 }, data: { targetModeId: 'rpg', params: { mapId: 'town' } } },
    },
  };

  const sampleProject: ProjectData = {
    manifest: {
      format: 'esproj',
      formatVersion: 3,
      engine: '>=0.9.0',
      name: 'Editor Project',
      id: 'com.editor.test',
      created: 1,
      modified: 1,
      startMode: 'avg',
      startEvent: 'ch1',
      modes: ['avg', 'rpg', 'debate'],
      plugins: [],
    },
    system: {
      startMode: 'avg',
      startEvent: 'ch1',
      gameTitle: 'Editor Project',
      version: '1.0',
      initialParty: [],
      initialGold: 100,
      terms: {},
      audioPolicy: 'continue',
    },
    characters: {
      phoenix: {
        id: 'phoenix',
        name: 'Phoenix',
        sprites: {
          portrait: { normal: 'p1.png', joy: 'p2.png', anger: 'p3.png', sorrow: 'p4.png' },
        },
      },
    },
    entities: {},
    globals: [],
    triggers: {},
    achievements: {},
    messages: {},
    storyGraphs: { ch1: dummyGraph },
    commonEvents: {},
    maps: {
      map1: {
        id: 'map1',
        name: 'Town',
        width: 10,
        height: 10,
        tileSize: 32,
        data: new Array(100).fill(0),
        regions: new Array(100).fill(0),
        collision: new Array(100).fill(false),
        events: [],
      },
    },
    debates: {},
    title: { titleText: 'Editor Project', buttons: [] },
    assets: {},
    plugins: [],
  };

  it('FlowchartEditor adds nodes and connects them', () => {
    const container = document.createElement('div');
    const editor = new FlowchartEditor(container, dummyGraph);

    const newNode = editor.addNode('switch_mode', 'Switch to Debate', 550, 50);
    expect(newNode.type).toBe('switch_mode');
    expect(dummyGraph.nodes[newNode.id]).toBeDefined();

    editor.connectNodes('n2', newNode.id, 'Dungeon Clear');
    expect(dummyGraph.nodes['n2'].branches?.length).toBe(1);
    expect(dummyGraph.nodes['n2'].branches![0].targetNodeId).toBe(newNode.id);
  });

  it('BlockEditor manages sequential command blocks', () => {
    const container = document.createElement('div');
    const commands: any[] = [
      { code: 'show_text', parameters: { text: 'First' } },
      { code: 'show_text', parameters: { text: 'Second' } },
    ];
    const editor = new BlockEditor(container, commands);

    expect(commands.length).toBe(2);
    expect(container.textContent).toContain('First');
    expect(container.textContent).toContain('Second');
  });

  it('WebEditor mounts and displays tabs', () => {
    const container = document.createElement('div');
    const editor = new WebEditor(container, sampleProject);

    expect(container.textContent).toContain('EASY STORY ENGINE');
    expect(container.textContent).toContain('Flowchart');
    expect(container.textContent).toContain('Mindmap');
    expect(container.textContent).toContain('Playtest');
  });
});
