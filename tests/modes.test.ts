import { describe, it, expect } from 'vitest';
import { AvgMode } from '../src/engine/modes/avg/AvgMode';
import { RpgMode } from '../src/engine/modes/rpg/RpgMode';
import { DebateMode } from '../src/engine/modes/debate/DebateMode';
import { BattleSystem } from '../src/engine/modes/rpg/BattleSystem';
import { EngineShell } from '../src/engine/core/EngineShell';
import type { ProjectData } from '../src/engine/types';

describe('AvgMode', () => {
  it('initializes and handles serialization', () => {
    const avg = new AvgMode();
    expect(avg.id).toBe('avg');
    expect(avg.capabilities.itemDomain).toBe('avg');
    expect(avg.capabilities.supportsOverlay).toBe(true);

    avg.deserialize({
      speakerName: 'Detective',
      fullText: 'Case closed.',
      emotion: 'joy',
    });
    const serialized = avg.serialize() as any;
    expect(serialized.speakerName).toBe('Detective');
    expect(serialized.fullText).toBe('Case closed.');
    expect(serialized.emotion).toBe('joy');
  });
});

describe('RpgMode & BattleSystem', () => {
  const dummyProject: ProjectData = {
    manifest: {
      format: 'esproj',
      formatVersion: 3,
      engine: '>=0.9.0',
      name: 'RPG Test',
      id: 'rpg.test',
      created: 1,
      modified: 1,
      startMode: 'rpg',
      startEvent: '',
      modes: ['rpg'],
      plugins: [],
    },
    system: {
      startMode: 'rpg',
      startEvent: '',
      gameTitle: 'RPG Test',
      version: '1.0',
      initialParty: ['hero'],
      initialGold: 200,
      terms: {},
      audioPolicy: 'continue',
    },
    characters: {
      hero: { id: 'hero', name: 'Hero' },
    },
    entities: {},
    globals: [],
    triggers: {},
    achievements: {},
    messages: {},
    storyGraphs: {},
    commonEvents: {},
    maps: {},
    debates: {},
    title: { titleText: 'RPG', buttons: [] },
    assets: {},
    plugins: [],
  };

  it('runs battle turns and calculates damage correctly', () => {
    const container = document.createElement('div');
    const shell = new EngineShell(dummyProject, container);

    let finishedResult = '';
    const battle = new BattleSystem(shell, 'troop_test', {
      canEscape: true,
      onResult: (res) => {
        finishedResult = res;
      },
    });

    expect(battle.actors.length).toBeGreaterThan(0);
    expect(battle.enemies.length).toBeGreaterThan(0);

    const initialEnemyHp = battle.enemies[0].hp;
    const res = battle.executePlayerAttack(0, 0);

    expect(res.damage).toBeGreaterThan(0);
    expect(battle.enemies[0].hp).toBeLessThan(initialEnemyHp);

    battle.executeEnemyTurns();
    expect(battle.log.length).toBeGreaterThan(1);
  });

  it('serializes and deserializes player coordinates', () => {
    const rpg = new RpgMode();
    rpg.deserialize({
      currentMapId: 'dungeon_1',
      playerX: 12,
      playerY: 8,
      playerDir: 'up',
    });

    const ser = rpg.serialize() as any;
    expect(ser.currentMapId).toBe('dungeon_1');
    expect(ser.playerX).toBe(12);
    expect(ser.playerY).toBe(8);
    expect(ser.playerDir).toBe('up');
  });
});

describe('DebateMode', () => {
  it('manages debate script and sentence navigation', () => {
    const debate = new DebateMode();
    expect(debate.id).toBe('debate');
    expect(debate.capabilities.itemDomain).toBe('avg');

    debate.deserialize({
      currentDebateId: 'trial_01',
      currentSentenceIndex: 2,
      currentPressure: 75,
    });

    const ser = debate.serialize() as any;
    expect(ser.currentDebateId).toBe('trial_01');
    expect(ser.currentSentenceIndex).toBe(2);
    expect(ser.currentPressure).toBe(75);
  });
});
