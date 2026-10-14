import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { sampleProjectData } from '../src/demo/sampleProject';
import { EsprojProtocol } from '../src/project/EsprojProtocol';
import { EngineShell } from '../src/engine/core/EngineShell';
import { AvgMode } from '../src/engine/modes/avg/AvgMode';
import { RpgMode } from '../src/engine/modes/rpg/RpgMode';
import { DebateMode } from '../src/engine/modes/debate/DebateMode';
import { PhoneMessagingSystem } from '../src/engine/overlay/PhoneMessagingSystem';
import { BattleSystem } from '../src/engine/modes/rpg/BattleSystem';

describe('Demo Project & End-to-End Game Flow', () => {
  it('exports sample project to demo-project directory on disk and reads back', () => {
    const dirMap = EsprojProtocol.exportToDirectoryMap(sampleProjectData);
    const demoDir = path.resolve(__dirname, '../demo-project');

    for (const [relPath, content] of Object.entries(dirMap)) {
      const fullPath = path.resolve(demoDir, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf-8');
    }

    expect(fs.existsSync(path.resolve(demoDir, 'manifest.json'))).toBe(true);
    expect(fs.existsSync(path.resolve(demoDir, 'data/system.json'))).toBe(true);
    expect(fs.existsSync(path.resolve(demoDir, 'data/characters.json'))).toBe(true);
    expect(fs.existsSync(path.resolve(demoDir, 'data/database/entities.json'))).toBe(true);
    expect(fs.existsSync(path.resolve(demoDir, 'data/maps/town_square.json'))).toBe(true);
    expect(fs.existsSync(path.resolve(demoDir, 'data/modes/debate_trial_stolen_umbrella.json'))).toBe(true);

    // Reconstruct
    const fileMap: Record<string, string> = {};
    const readDir = (dir: string, base: string = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const ent of entries) {
        const rel = base ? `${base}/${ent.name}` : ent.name;
        if (ent.isDirectory()) {
          readDir(path.resolve(dir, ent.name), rel);
        } else {
          fileMap[rel] = fs.readFileSync(path.resolve(dir, ent.name), 'utf-8');
        }
      }
    };
    readDir(demoDir);

    const reloaded = EsprojProtocol.importFromDirectoryMap(fileMap);
    expect(reloaded.manifest.name).toBe('午夜之雨案');
    expect(reloaded.manifest.startMode).toBe('avg');
    expect(reloaded.characters['assistant'].name).toBe('真宵');
  });

  it('runs complete multi-mode narrative cycle: AVG -> RPG -> Debate -> Victory', async () => {
    const container = document.createElement('div');
    const shell = new EngineShell(sampleProjectData, container);

    const avg = new AvgMode();
    const rpg = new RpgMode();
    const debate = new DebateMode();

    shell.registerMode(avg);
    shell.registerMode(rpg);
    shell.registerMode(debate);

    const phone = new PhoneMessagingSystem(shell, container);

    // 1. Start Engine in configured startMode ('avg')
    shell.start();
    expect(shell.getCurrentMode()?.id).toBe('avg');
    expect(shell.getSwitch('game_started')).toBe(true);
    expect(shell.state.achievements).toContain('ach_prologue');

    // 2. Player receives items
    expect(shell.hasItem('wet_umbrella', 1, 'avg')).toBe(true);
    expect(shell.hasItem('herbal_tea', 1, 'avg')).toBe(true);

    // 3. Maya Phone message triggered
    phone.checkTriggers();
    expect(shell.state.msgState.threads['assistant']).toBeDefined();
    const firstMsg = shell.state.msgState.threads['assistant'].messages[0];
    expect(firstMsg.content).toContain('舒缓草药茶');

    // Reply to Maya
    const reply1 = firstMsg.replies![0];
    phone.sendReply('assistant', reply1);
    expect(shell.getAffection('assistant')).toBe(35); // 25 + 10

    // 4. Gift herbal tea to Maya
    const teaFacet = shell.entityRegistry.getAvgFacet('herbal_tea');
    expect(teaFacet?.category).toBe('gift');
    avg.itemAdapter.useEffect?.('herbal_tea', teaFacet, { shell, container } as any);
    expect(shell.getAffection('assistant')).toBe(55); // 35 + 20
    expect(shell.hasItem('herbal_tea', 1, 'avg')).toBe(false);

    // 5. Switch to RPG Mode to explore crime scene
    shell.switchMode('rpg', { mapId: 'town_square' });
    expect(shell.getCurrentMode()?.id).toBe('rpg');
    expect(shell.state.modeContexts['avg']).toBeDefined(); // serialized AVG state

    // 6. Simulate RPG Encounter & Battle
    let battleResult = '';
    const battle = new BattleSystem(shell, 'troop_1', {
      canEscape: false,
      onResult: (res) => {
        battleResult = res;
      },
    });

    // Player attacks until victory
    while (!battle.isFinished) {
      battle.executePlayerAttack(0, 0);
      if (!battle.isFinished) {
        battle.executeEnemyTurns();
      }
    }
    expect(battleResult).toBe('win');

    // 7. Switch to Courtroom Debate Mode
    shell.switchMode('debate', { debateId: 'trial_stolen_umbrella' });
    expect(shell.getCurrentMode()?.id).toBe('debate');

    // 8. Cross-examination & Press
    debate.pressCurrentSentence();

    // Navigate to contradiction sentence s3 ("I never touched or carried an umbrella")
    debate.navigateSentence(1); // s2
    debate.navigateSentence(1); // s3

    // 9. Present wet_umbrella on contradiction sentence
    (debate as any).presentEvidence('wet_umbrella');
    await new Promise((r) => setTimeout(r, 800));

    // 10. Verify Breakthrough & Story Resolution
    expect(shell.getSwitch('debate_cleared')).toBe(true);
    expect(shell.state.achievements).toContain('ach_first_contradiction');
    expect(shell.getCurrentMode()?.id).toBe('avg');

    // 11. Cross-Mode Save & Load Verification (§4.14)
    const saveOk = await shell.saveGame(1, 'Post-Trial Epilogue');
    expect(saveOk).toBe(true);

    const savesList = await shell.getSaves();
    expect(savesList.length).toBeGreaterThan(0);
    expect(savesList[0].slot).toBe(1);

    // Mutate state then reload
    shell.setVariable('test_temp', 999);
    const loadOk = await shell.loadGame(1);
    expect(loadOk).toBe(true);
    expect(shell.getVariable('test_temp')).toBeUndefined();
    expect(shell.getSwitch('debate_cleared')).toBe(true);

    shell.stop();
  });
});
