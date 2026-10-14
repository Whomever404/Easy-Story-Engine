import type {
  EngineShell,
  RpgActor,
  RpgEnemy,
  RpgTroop,
  RpgSkill,
} from '../../types';

export interface BattleMemberState {
  id: string;
  name: string;
  isActor: boolean;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  tp: number;
  maxTp: number;
  atk: number;
  def: number;
  mat: number;
  mdf: number;
  agi: number;
  skills: string[];
  states: string[];
}

export type BattleActionResult = {
  user: string;
  target: string;
  actionName: string;
  damage: number;
  isCrit: boolean;
  isMiss: boolean;
  message: string;
};

export class BattleSystem {
  private shell: EngineShell;
  private troop: RpgTroop;
  private canEscape: boolean;
  private canLose: boolean;
  private onResult: (res: 'win' | 'lose' | 'escape') => void;

  public actors: BattleMemberState[] = [];
  public enemies: BattleMemberState[] = [];
  public log: string[] = [];
  public isFinished: boolean = false;

  constructor(
    shell: EngineShell,
    troopId: string,
    options: {
      canEscape?: boolean;
      canLose?: boolean;
      onResult: (res: 'win' | 'lose' | 'escape') => void;
    }
  ) {
    this.shell = shell;
    this.canEscape = options.canEscape !== false;
    this.canLose = options.canLose === true;
    this.onResult = options.onResult;

    const troopData = (this.shell.projectData as any).troops?.[troopId] || {
      id: troopId,
      name: 'Wild Monsters',
      members: [{ enemyId: 'goblin', x: 200, y: 150 }],
    };
    this.troop = troopData;

    this.initCombatants();
  }

  private initCombatants(): void {
    // Init actors from party
    const party = this.shell.projectData.system?.initialParty || ['hero'];
    for (const actorId of party) {
      const actorData = (this.shell.projectData as any).actors?.[actorId] || {
        id: actorId,
        name: this.shell.getCharacter(actorId)?.name || 'Hero',
        hp: 120,
        maxHp: 120,
        mp: 30,
        maxMp: 30,
        tp: 0,
        maxTp: 100,
        atk: 25,
        def: 12,
        mat: 15,
        mdf: 10,
        agi: 10,
        skills: ['slash', 'heal'],
      };

      this.actors.push({
        id: actorData.id,
        name: actorData.name,
        isActor: true,
        hp: actorData.hp,
        maxHp: actorData.maxHp,
        mp: actorData.mp,
        maxMp: actorData.maxMp,
        tp: actorData.tp || 0,
        maxTp: actorData.maxTp || 100,
        atk: actorData.atk,
        def: actorData.def,
        mat: actorData.mat,
        mdf: actorData.mdf,
        agi: actorData.agi || 10,
        skills: actorData.skills || [],
        states: [],
      });
    }

    // Init enemies from troop
    for (const member of this.troop.members) {
      const enemyData = (this.shell.projectData as any).enemies?.[member.enemyId] || {
        id: member.enemyId,
        name: 'Goblin Scout',
        hp: 80,
        maxHp: 80,
        mp: 10,
        maxMp: 10,
        atk: 18,
        def: 8,
        mat: 5,
        mdf: 5,
        exp: 25,
        gold: 30,
        actions: [{ skillId: 'attack', rating: 5 }],
      };

      this.enemies.push({
        id: enemyData.id,
        name: enemyData.name,
        isActor: false,
        hp: enemyData.hp,
        maxHp: enemyData.maxHp,
        mp: enemyData.mp,
        maxMp: enemyData.maxMp,
        tp: 0,
        maxTp: 100,
        atk: enemyData.atk,
        def: enemyData.def,
        mat: enemyData.mat,
        mdf: enemyData.mdf,
        agi: 8,
        skills: ['attack'],
        states: [],
      });
    }

    this.log.push(`Combat started against ${this.troop.name}!`);
  }

  public evaluateDamageFormula(formula: string, a: BattleMemberState, b: BattleMemberState): number {
    try {
      const fn = new Function('a', 'b', `return ${formula};`);
      const val = fn(a, b);
      return Math.max(1, Math.round(val));
    } catch {
      return Math.max(1, Math.round(a.atk * 2 - b.def));
    }
  }

  public executePlayerAttack(actorIndex: number, targetEnemyIndex: number): BattleActionResult {
    const actor = this.actors[actorIndex];
    const enemy = this.enemies[targetEnemyIndex];
    if (!actor || !enemy || enemy.hp <= 0) {
      return { user: '', target: '', actionName: '', damage: 0, isCrit: false, isMiss: true, message: 'Invalid target.' };
    }

    const isCrit = Math.random() < 0.1;
    const baseDamage = Math.max(1, actor.atk * 2 - enemy.def);
    const damage = Math.round(baseDamage * (isCrit ? 1.5 : 1));

    enemy.hp = Math.max(0, enemy.hp - damage);
    actor.tp = Math.min(actor.maxTp, actor.tp + 10);

    const msg = `${actor.name} attacks ${enemy.name} for ${damage} damage!${isCrit ? ' (Critical Hit!)' : ''}`;
    this.log.push(msg);

    this.checkBattleStatus();
    return {
      user: actor.name,
      target: enemy.name,
      actionName: 'Attack',
      damage,
      isCrit,
      isMiss: false,
      message: msg,
    };
  }

  public executePlayerSkill(actorIndex: number, skillId: string, targetEnemyIndex: number): BattleActionResult {
    const actor = this.actors[actorIndex];
    const enemy = this.enemies[targetEnemyIndex];
    const skillData = (this.shell.projectData as any).skills?.[skillId] || {
      id: skillId,
      name: skillId,
      mpCost: 5,
      damageFormula: 'a.atk * 3 - b.def',
    };

    if (actor.mp < (skillData.mpCost || 0)) {
      const failMsg = `${actor.name} does not have enough MP!`;
      this.log.push(failMsg);
      return { user: actor.name, target: '', actionName: skillData.name, damage: 0, isCrit: false, isMiss: true, message: failMsg };
    }

    actor.mp -= skillData.mpCost || 0;
    const formula = skillData.damageFormula || 'a.atk * 2.5 - b.def';
    const damage = this.evaluateDamageFormula(formula, actor, enemy);
    enemy.hp = Math.max(0, enemy.hp - damage);

    const msg = `${actor.name} used ${skillData.name} on ${enemy.name} for ${damage} damage!`;
    this.log.push(msg);

    this.checkBattleStatus();
    return {
      user: actor.name,
      target: enemy.name,
      actionName: skillData.name,
      damage,
      isCrit: false,
      isMiss: false,
      message: msg,
    };
  }

  public executeEnemyTurns(): BattleActionResult[] {
    const results: BattleActionResult[] = [];
    if (this.isFinished) return results;

    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;

      const livingActors = this.actors.filter((a) => a.hp > 0);
      if (livingActors.length === 0) break;

      const target = livingActors[Math.floor(Math.random() * livingActors.length)];
      const damage = Math.max(1, Math.round(enemy.atk * 1.5 - target.def));
      target.hp = Math.max(0, target.hp - damage);

      const msg = `${enemy.name} attacks ${target.name} for ${damage} damage!`;
      this.log.push(msg);

      results.push({
        user: enemy.name,
        target: target.name,
        actionName: 'Attack',
        damage,
        isCrit: false,
        isMiss: false,
        message: msg,
      });
    }

    this.checkBattleStatus();
    return results;
  }

  public escape(): boolean {
    if (!this.canEscape) {
      this.log.push("Cannot escape this encounter!");
      return false;
    }

    const success = Math.random() < 0.65;
    if (success) {
      this.isFinished = true;
      this.log.push("Escaped successfully!");
      this.onResult('escape');
      return true;
    } else {
      this.log.push("Escape failed!");
      this.executeEnemyTurns();
      return false;
    }
  }

  private checkBattleStatus(): void {
    const enemiesAlive = this.enemies.some((e) => e.hp > 0);
    const actorsAlive = this.actors.some((a) => a.hp > 0);

    if (!enemiesAlive) {
      this.isFinished = true;
      this.log.push("Victory! All enemies defeated!");
      this.onResult('win');
    } else if (!actorsAlive) {
      this.isFinished = true;
      this.log.push("Defeat! The party has fallen!");
      this.onResult(this.canLose ? 'lose' : 'lose');
    }
  }
}
