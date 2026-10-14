import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '../src/engine/core/EventBus';
import { TriggerEngine } from '../src/engine/core/TriggerEngine';
import { EntityRegistry } from '../src/engine/core/EntityRegistry';
import { SaveManager } from '../src/engine/core/SaveManager';
import { TextParser } from '../src/engine/interpreter/CommandInterpreter';
import { EngineShell } from '../src/engine/core/EngineShell';
import type { ProjectData, GameModeModule, ModeContext } from '../src/engine/types';

describe('EventBus', () => {
  it('should register listeners and emit events', () => {
    const bus = new EventBus();
    let received = '';
    bus.on('test', (data) => {
      received = data;
    });
    bus.emit('test', 'hello');
    expect(received).toBe('hello');
  });

  it('should support once listeners', () => {
    const bus = new EventBus();
    let count = 0;
    bus.once('ping', () => {
      count++;
    });
    bus.emit('ping');
    bus.emit('ping');
    expect(count).toBe(1);
  });
});

describe('TriggerEngine', () => {
  const dummyState: any = {
    switches: { flag1: true, flag2: false },
    variables: { score: 100, name: 'Alice' },
    customGlobals: { 'rpg.gold': 500 },
    items: {
      avg: [{ id: 'gift1', count: 2 }],
      rpg: [{ id: 'sword', count: 1 }],
    },
    affection: { char1: 75 },
  };

  it('evaluates switches', () => {
    expect(TriggerEngine.evaluate({ switches: [{ key: 'flag1', value: true }] }, dummyState)).toBe(true);
    expect(TriggerEngine.evaluate({ switches: [{ key: 'flag2', value: true }] }, dummyState)).toBe(false);
  });

  it('evaluates variables and custom globals', () => {
    expect(TriggerEngine.evaluate({ variables: [{ key: 'score', op: '>=', value: 80 }] }, dummyState)).toBe(true);
    expect(TriggerEngine.evaluate({ customGlobals: [{ key: 'rpg.gold', op: '>=', value: 500 }] }, dummyState)).toBe(true);
    expect(TriggerEngine.evaluate({ customGlobals: [{ key: 'rpg.gold', op: '<', value: 100 }] }, dummyState)).toBe(false);
  });

  it('evaluates items and affection', () => {
    expect(TriggerEngine.evaluate({ items: [{ id: 'gift1', domain: 'avg', count: 2 }] }, dummyState)).toBe(true);
    expect(TriggerEngine.evaluate({ affection: [{ characterId: 'char1', min: 70 }] }, dummyState)).toBe(true);
    expect(TriggerEngine.evaluate({ affection: [{ characterId: 'char1', min: 80 }] }, dummyState)).toBe(false);
  });
});

describe('EntityRegistry & Facets', () => {
  it('handles multi-facets and reveals', () => {
    const registry = new EntityRegistry();
    registry.registerEntity({
      id: 'rusty_key',
      base: { name: 'Rusty Key', icon: 'key.png', desc: 'An old key', storyTags: ['key'] },
      facets: {
        avg: { category: 'evidence', unlockFlags: ['door_unlocked'] },
        rpg: { type: 'item', price: 10, consumable: true },
      },
    });

    expect(registry.getAvgFacet('rusty_key')?.category).toBe('evidence');
    expect(registry.getRpgFacet('rusty_key')?.price).toBe(10);
    expect(registry.getDebateFacet('rusty_key')).toBeNull();

    registry.revealFacet('rusty_key', 'debate');
    expect(registry.isFacetRevealed('rusty_key', 'debate')).toBe(true);
  });
});

describe('TextParser', () => {
  it('interpolates variables, names, globals and tokenizes control codes', () => {
    const mockShell: any = {
      getVariable: (k: string) => (k === 'chapter' ? 1 : undefined),
      getCharacter: (k: string) => (k === 'hero' ? { name: 'Hero' } : undefined),
      getGlobal: (k: string) => (k === 'rpg.gold' ? 300 : undefined),
    };

    const text = 'Hello \\N[hero], Welcome to Chapter \\V[chapter]! You have \\G[rpg.gold] gold. \\C[#ff0000]Red Text\\S[2]Fast!';
    const interpolated = TextParser.interpolate(text, mockShell);
    expect(interpolated).toContain('Hello Hero');
    expect(interpolated).toContain('Chapter 1');
    expect(interpolated).toContain('300 gold');

    const tokens = TextParser.tokenize(interpolated);
    expect(tokens.some((t) => t.type === 'color' && t.value === '#ff0000')).toBe(true);
    expect(tokens.some((t) => t.type === 'speed' && t.value === 2)).toBe(true);
  });
});

describe('EngineShell Lifecycle', () => {
  const dummyProject: ProjectData = {
    manifest: {
      format: 'esproj',
      formatVersion: 3,
      engine: '>=0.9.0',
      name: 'Test Game',
      id: 'test.game',
      created: 1,
      modified: 1,
      startMode: 'mock_avg',
      startEvent: '',
      modes: ['mock_avg', 'mock_rpg'],
      plugins: [],
    },
    system: {
      startMode: 'mock_avg',
      startEvent: '',
      gameTitle: 'Test Game',
      version: '1.0',
      initialParty: [],
      initialGold: 100,
      terms: {},
      audioPolicy: 'continue',
    },
    characters: {
      c1: { id: 'c1', name: 'Char1', initialAffection: 10 },
    },
    entities: {},
    globals: [{ key: 'custom.val', name: 'Custom', type: 'number', default: 42, hidden: false, exposeToTriggers: true }],
    triggers: {},
    achievements: {},
    messages: {},
    storyGraphs: {},
    commonEvents: {},
    maps: {},
    debates: {},
    title: { titleText: 'Test', buttons: [] },
    assets: {},
    plugins: [],
  };

  it('switches modes and preserves context', () => {
    const container = document.createElement('div');
    const shell = new EngineShell(dummyProject, container);

    let avgEntered = false;
    let rpgEntered = false;

    const mockAvg: GameModeModule = {
      id: 'mock_avg',
      capabilities: { supportsOverlay: true, itemDomain: 'avg' },
      onEnter: () => {
        avgEntered = true;
      },
      onExit: () => {},
      update: () => {},
      render: () => {},
      serialize: () => ({ avgScene: 'hall' }),
      deserialize: () => {},
    };

    const mockRpg: GameModeModule = {
      id: 'mock_rpg',
      capabilities: { supportsOverlay: false, itemDomain: 'rpg' },
      onEnter: () => {
        rpgEntered = true;
      },
      onExit: () => {},
      update: () => {},
      render: () => {},
      serialize: () => ({ mapId: 'town' }),
      deserialize: () => {},
    };

    shell.registerMode(mockAvg);
    shell.registerMode(mockRpg);

    shell.switchMode('mock_avg');
    expect(avgEntered).toBe(true);
    expect(shell.getCurrentMode()?.id).toBe('mock_avg');

    shell.switchMode('mock_rpg');
    expect(rpgEntered).toBe(true);
    expect(shell.getCurrentMode()?.id).toBe('mock_rpg');
    expect(shell.state.modeContexts['mock_avg']).toEqual({ avgScene: 'hall' });
  });
});
