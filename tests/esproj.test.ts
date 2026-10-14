import { describe, it, expect } from 'vitest';
import { EsprojProtocol } from '../src/project/EsprojProtocol';
import { ProjectValidator } from '../src/project/Validation';
import type { ProjectData, CharacterData } from '../src/engine/types';

describe('ProjectValidator', () => {
  it('enforces four base emotions (喜怒哀乐) constraint (§4.12)', () => {
    const invalidChar: CharacterData = {
      id: 'char_incomplete',
      name: 'Hero',
      sprites: {
        portrait: {
          normal: 'hero_normal.png',
          joy: 'hero_joy.png',
          // missing anger and sorrow
        } as any,
      },
    };

    const errors = ProjectValidator.validateCharacterEmotions(invalidChar);
    expect(errors.length).toBe(2);
    expect(errors.some((e) => e.field.includes('anger'))).toBe(true);
    expect(errors.some((e) => e.field.includes('sorrow'))).toBe(true);

    const validChar: CharacterData = {
      id: 'char_valid',
      name: 'Hero',
      sprites: {
        portrait: {
          normal: 'hero_normal.png',
          joy: 'hero_joy.png',
          anger: 'hero_anger.png',
          sorrow: 'hero_sorrow.png',
        },
      },
    };

    const validErrors = ProjectValidator.validateCharacterEmotions(validChar);
    expect(validErrors.length).toBe(0);
  });
});

describe('EsprojProtocol Roundtrip', () => {
  const sampleProject: ProjectData = {
    manifest: {
      format: 'esproj',
      formatVersion: 3,
      engine: '>=0.9.0',
      name: 'Detective Tale',
      id: 'com.ese.detective',
      created: 1730000000,
      modified: 1730000000,
      startMode: 'avg',
      startEvent: 'ch1.intro',
      modes: ['avg', 'rpg', 'debate'],
      plugins: [],
    },
    system: {
      startMode: 'avg',
      startEvent: 'ch1.intro',
      gameTitle: 'Detective Tale',
      version: '1.0.0',
      initialParty: ['phoenix'],
      initialGold: 100,
      terms: { hp: 'HP', gold: 'Gold' },
      audioPolicy: 'continue',
    },
    characters: {
      phoenix: {
        id: 'phoenix',
        name: 'Phoenix',
        sprites: {
          portrait: {
            normal: 'p_norm.png',
            joy: 'p_joy.png',
            anger: 'p_ang.png',
            sorrow: 'p_sor.png',
          },
        },
      },
    },
    entities: {
      evidence_letter: {
        id: 'evidence_letter',
        base: { name: 'Threat Letter', icon: 'letter.png', desc: 'A letter found at crime scene', storyTags: ['doc'] },
        facets: {
          avg: { category: 'evidence', unlockFlags: ['letter_shown'] },
          debate: { contradictionIds: ['s3'], pressResponse: 'This letter was signed!' },
        },
      },
    },
    globals: [
      { key: 'plot.suspicion', name: 'Suspicion Level', type: 'number', default: 0, hidden: true, exposeToTriggers: true },
    ],
    triggers: {
      t1: { switches: [{ key: 'found_key', value: true }] },
    },
    achievements: {},
    messages: {},
    storyGraphs: {
      ch1: {
        id: 'ch1',
        chapter: '1',
        title: 'Prologue',
        startNodeId: 'node_1',
        nodes: {
          node_1: { id: 'node_1', title: 'Start', type: 'dialogue', position: { x: 100, y: 100 }, data: { text: 'Hello!' } },
        },
      },
    },
    commonEvents: {},
    maps: {},
    debates: {},
    title: { titleText: 'Detective Tale', buttons: [] },
    assets: {},
    plugins: [],
  };

  it('exports to directory map and imports back losslessly', () => {
    const dirMap = EsprojProtocol.exportToDirectoryMap(sampleProject);
    expect(dirMap['manifest.json']).toBeDefined();
    expect(dirMap['data/system.json']).toBeDefined();
    expect(dirMap['data/characters.json']).toBeDefined();
    expect(dirMap['data/database/entities.json']).toBeDefined();
    expect(dirMap['data/story/ch1.graph.json']).toBeDefined();

    const reconstructed = EsprojProtocol.importFromDirectoryMap(dirMap);
    expect(reconstructed.manifest.id).toBe('com.ese.detective');
    expect(reconstructed.characters['phoenix'].name).toBe('Phoenix');
    expect(reconstructed.entities['evidence_letter'].base.name).toBe('Threat Letter');
    expect(reconstructed.storyGraphs['ch1'].nodes['node_1'].data.text).toBe('Hello!');
  });

  it('exports to .esproj ZIP and imports back from ZIP container', async () => {
    const zipBytes = await EsprojProtocol.exportToZip(sampleProject);
    expect(zipBytes.byteLength).toBeGreaterThan(100);

    const { project: importedFromZip } = await EsprojProtocol.importFromZip(zipBytes);
    expect(importedFromZip.manifest.name).toBe('Detective Tale');
    expect(importedFromZip.manifest.startMode).toBe('avg');
    expect(importedFromZip.globals[0].key).toBe('plot.suspicion');
  });
});
