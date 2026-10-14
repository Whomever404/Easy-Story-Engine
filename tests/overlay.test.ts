import { describe, it, expect } from 'vitest';
import { EngineShell } from '../src/engine/core/EngineShell';
import { PhoneMessagingSystem } from '../src/engine/overlay/PhoneMessagingSystem';
import { SystemOverlay } from '../src/engine/overlay/SystemOverlay';
import type { ProjectData } from '../src/engine/types';

describe('PhoneMessagingSystem & Overlays', () => {
  const dummyProject: ProjectData = {
    manifest: {
      format: 'esproj',
      formatVersion: 3,
      engine: '>=0.9.0',
      name: 'Overlay Test',
      id: 'overlay.test',
      created: 1,
      modified: 1,
      startMode: 'avg',
      startEvent: '',
      modes: ['avg'],
      plugins: [],
    },
    system: {
      startMode: 'avg',
      startEvent: '',
      gameTitle: 'Overlay Test',
      version: '1.0',
      initialParty: [],
      initialGold: 0,
      terms: {},
      audioPolicy: 'continue',
    },
    characters: {
      assistant: { id: 'assistant', name: 'Maya', initialAffection: 20 },
    },
    entities: {},
    globals: [],
    triggers: {},
    achievements: {
      ach_first_msg: {
        id: 'ach_first_msg',
        name: 'First Ping',
        desc: 'Receive your first phone message',
        secret: false,
        trigger: { switches: [{ key: 'got_msg', value: true }] },
      },
    },
    messages: {
      intro_msg: {
        id: 'intro_msg',
        characterId: 'assistant',
        trigger: { switches: [{ key: 'trigger_phone', value: true }] },
        triggerOnce: true,
        messages: [
          {
            id: 'm1',
            senderId: 'assistant',
            type: 'text',
            content: 'Boss! Check the evidence bag when you have time.',
            replies: [
              {
                id: 'r1',
                text: 'Will do right away!',
                affectionDelta: { characterId: 'assistant', delta: 5 },
              },
            ],
          },
        ],
      },
    },
    storyGraphs: {},
    commonEvents: {},
    maps: {},
    debates: {},
    title: { titleText: 'Overlay Test', buttons: [] },
    assets: {},
    plugins: [],
  };

  it('delivers phone message when trigger condition is satisfied', () => {
    const container = document.createElement('div');
    const shell = new EngineShell(dummyProject, container);
    const phone = new PhoneMessagingSystem(shell, container);

    expect(Object.keys(shell.state.msgState.threads).length).toBe(0);

    // Switch ON the trigger
    shell.setSwitch('trigger_phone', true);
    phone.checkTriggers();

    expect(shell.state.msgState.threads['assistant']).toBeDefined();
    expect(shell.state.msgState.threads['assistant'].messages.length).toBe(1);
    expect(shell.state.msgState.threads['assistant'].messages[0].content).toContain('evidence bag');

    // Send player reply
    const replyOption = shell.state.msgState.threads['assistant'].messages[0].replies![0];
    phone.sendReply('assistant', replyOption);

    // Check affection updated
    expect(shell.getAffection('assistant')).toBe(25);
    expect(shell.state.msgState.repliedMessageIds).toContain('r1');
  });

  it('unlocks achievement and handles banner', () => {
    const container = document.createElement('div');
    const shell = new EngineShell(dummyProject, container);
    new SystemOverlay(shell, container);

    expect(shell.state.achievements.includes('ach_first_msg')).toBe(false);

    shell.setSwitch('got_msg', true);
    shell.checkTriggers();

    expect(shell.state.achievements.includes('ach_first_msg')).toBe(true);
  });
});
