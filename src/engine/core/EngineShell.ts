import type {
  EngineShell as IEngineShell,
  GameModeModule,
  ModeContext,
  CoreState,
  ProjectData,
  CustomGlobalDef,
  Entity,
  CharacterData,
  ItemDomain,
  AudioPlaybackOptions,
  EventCommand,
  EngineEventCallback,
  Trigger,
  SaveData,
  SaveMeta,
} from '../types';
import { EventBus } from './EventBus';
import { TriggerEngine } from './TriggerEngine';
import { AudioManager } from './AudioManager';
import { EntityRegistry } from './EntityRegistry';
import { SaveManager } from './SaveManager';
import { CommandInterpreter } from '../interpreter/CommandInterpreter';

export class EngineShell implements IEngineShell {
  public state: CoreState;
  public entities: Record<string, Entity> = {};
  public characters: Record<string, CharacterData> = {};
  public projectData: ProjectData;
  public container: HTMLElement;

  private modes: Map<string, GameModeModule> = new Map();
  private currentMode: GameModeModule | null = null;
  private currentStoryLabel: string = '';

  private eventBus: EventBus;
  private audioManager: AudioManager;
  public entityRegistry: EntityRegistry;
  private saveManager: SaveManager;
  public interpreter: CommandInterpreter;

  private isRunning: boolean = false;
  private lastTime: number = 0;
  private animFrameId: number | null = null;

  constructor(projectData: ProjectData, container: HTMLElement) {
    this.projectData = projectData;
    this.container = container;
    this.eventBus = new EventBus();
    this.audioManager = new AudioManager(projectData.system?.audioPolicy || 'continue');
    this.entityRegistry = new EntityRegistry(projectData.entities);
    this.saveManager = new SaveManager();
    this.interpreter = new CommandInterpreter(this);

    this.characters = projectData.characters || {};
    this.entities = projectData.entities || {};

    this.state = this.createInitialState();
    this.initCustomGlobals();
  }

  private createInitialState(): CoreState {
    const initialState: CoreState = {
      switches: {},
      variables: {},
      customGlobals: {},
      items: {
        avg: [],
        rpg: [],
      },
      affection: {},
      gallery: [],
      achievements: [],
      msgState: {
        threads: {},
        readMessageIds: [],
        repliedMessageIds: [],
        lastTriggerTimes: {},
        activeNotification: null,
      },
      modeContexts: {},
      playtime: 0,
    };

    // Initialize character affections
    if (this.projectData.characters) {
      for (const [id, char] of Object.entries(this.projectData.characters)) {
        if (char.initialAffection !== undefined) {
          initialState.affection[id] = char.initialAffection;
        }
      }
    }

    // Initialize RPG initial party gold
    if (this.projectData.system?.initialGold !== undefined) {
      initialState.customGlobals['rpg.gold'] = this.projectData.system.initialGold;
    }

    return initialState;
  }

  private initCustomGlobals(): void {
    if (this.projectData.globals) {
      for (const def of this.projectData.globals) {
        this.registerGlobal(def);
      }
    }
  }

  // -------------------------------------------------------------
  // Mode Management (§1.2)
  // -------------------------------------------------------------

  public registerMode(mode: GameModeModule): void {
    this.modes.set(mode.id, mode);
  }

  public getMode(id: string): GameModeModule | undefined {
    return this.modes.get(id);
  }

  public getCurrentMode(): GameModeModule | undefined {
    return this.currentMode || undefined;
  }

  public switchMode(targetModeId: string, params?: any): void {
    const targetMode = this.modes.get(targetModeId);
    if (!targetMode) {
      console.error(`[EngineShell] Cannot switch to unregistered mode: ${targetModeId}`);
      return;
    }

    const prevMode = this.currentMode;
    const ctx: ModeContext = {
      shell: this,
      data: params,
      container: this.container,
    };

    if (prevMode) {
      // Serialize exiting mode's context
      try {
        const modeState = prevMode.serialize();
        this.state.modeContexts[prevMode.id] = modeState;
        prevMode.onExit(ctx);
      } catch (e) {
        console.error(`[EngineShell] Error in mode onExit (${prevMode.id}):`, e);
      }
    }

    this.currentMode = targetMode;

    // Restore saved context if exists and no fresh params provided
    if (this.state.modeContexts[targetModeId] && !params) {
      try {
        targetMode.deserialize(this.state.modeContexts[targetModeId]);
      } catch (e) {
        console.error(`[EngineShell] Error in mode deserialize (${targetModeId}):`, e);
      }
    }

    try {
      targetMode.onEnter(ctx);
    } catch (e) {
      console.error(`[EngineShell] Error in mode onEnter (${targetModeId}):`, e);
    }

    this.emit('mode.switched', { from: prevMode?.id, to: targetModeId, params });
  }

  // -------------------------------------------------------------
  // Variables & Custom Globals (§4.15)
  // -------------------------------------------------------------

  public registerGlobal(def: CustomGlobalDef): void {
    if (this.state.customGlobals[def.key] === undefined) {
      this.state.customGlobals[def.key] = def.default;
    }
  }

  public getGlobal(key: string): any {
    return this.state.customGlobals[key];
  }

  public setGlobal(key: string, value: any): void {
    this.state.customGlobals[key] = value;
    this.emit('global.changed', { key, value });
    this.checkTriggers();
  }

  public getSwitch(key: string): boolean {
    return !!this.state.switches[key];
  }

  public setSwitch(key: string, val: boolean): void {
    this.state.switches[key] = val;
    this.emit('switch.changed', { key, val });
    this.checkTriggers();
  }

  public getVariable(key: string): any {
    return this.state.variables[key];
  }

  public setVariable(key: string, val: any): void {
    this.state.variables[key] = val;
    this.emit('variable.changed', { key, val });
    this.checkTriggers();
  }

  // -------------------------------------------------------------
  // Dual-Domain Inventory & Facets (§4, §4.5)
  // -------------------------------------------------------------

  public getEntity(itemId: string): Entity | undefined {
    return this.entityRegistry.getEntity(itemId) || this.entities[itemId];
  }

  public giveItem(itemId: string, count: number = 1, domain: ItemDomain = 'avg'): void {
    if (domain === 'avg') {
      let item = this.state.items.avg.find((it) => it.id === itemId);
      const entity = this.entities[itemId];
      const category = entity?.facets?.avg?.category || 'trinket';
      if (!item) {
        item = { id: itemId, count: 0, category, obtainedIn: this.currentMode?.id };
        this.state.items.avg.push(item);
      }
      item.count += count;
    } else if (domain === 'rpg') {
      let item = this.state.items.rpg.find((it) => it.id === itemId);
      const entity = this.entities[itemId];
      const type = entity?.facets?.rpg?.type || 'item';
      if (!item) {
        item = { id: itemId, count: 0, type, obtainedIn: this.currentMode?.id };
        this.state.items.rpg.push(item);
      }
      item.count += count;
    }

    this.emit('item.obtained', { itemId, count, domain });
    this.checkTriggers();
  }

  public removeItem(itemId: string, count: number = 1, domain: ItemDomain = 'avg'): void {
    if (domain === 'avg') {
      const item = this.state.items.avg.find((it) => it.id === itemId);
      if (item) {
        item.count = Math.max(0, item.count - count);
      }
    } else if (domain === 'rpg') {
      const item = this.state.items.rpg.find((it) => it.id === itemId);
      if (item) {
        item.count = Math.max(0, item.count - count);
      }
    }

    this.emit('item.removed', { itemId, count, domain });
    this.checkTriggers();
  }

  public hasItem(itemId: string, count: number = 1, domain: ItemDomain = 'avg'): boolean {
    if (domain === 'avg') {
      const item = this.state.items.avg.find((it) => it.id === itemId);
      return !!item && item.count >= count;
    } else if (domain === 'rpg') {
      const item = this.state.items.rpg.find((it) => it.id === itemId);
      return !!item && item.count >= count;
    }
    return false;
  }

  public revealFacet(itemId: string, modeId: string): void {
    this.entityRegistry.revealFacet(itemId, modeId);
    this.emit('facet.revealed', { itemId, modeId });
  }

  // -------------------------------------------------------------
  // Affection & Characters (§2.4, §4.12)
  // -------------------------------------------------------------

  public getAffection(characterId: string): number {
    return this.state.affection[characterId] ?? 0;
  }

  public changeAffection(characterId: string, delta: number): void {
    const cur = this.getAffection(characterId);
    const updated = cur + delta;
    this.state.affection[characterId] = updated;
    this.emit('affection.changed', { characterId, delta, current: updated });
    this.checkTriggers();
  }

  public getCharacter(characterId: string): CharacterData | undefined {
    return this.characters[characterId];
  }

  // -------------------------------------------------------------
  // Audio (§4.11)
  // -------------------------------------------------------------

  public playBgm(track: string, options?: AudioPlaybackOptions): void {
    this.audioManager.playBgm(track, options);
  }

  public stopBgm(fadeOutDuration?: number): void {
    this.audioManager.stopBgm(fadeOutDuration);
  }

  public playSe(track: string, options?: AudioPlaybackOptions): void {
    this.audioManager.playSe(track, options);
  }

  public playBgs(track: string, options?: AudioPlaybackOptions): void {
    this.audioManager.playBgs(track, options);
  }

  public stopBgs(): void {
    this.audioManager.stopBgs();
  }

  // -------------------------------------------------------------
  // Event Bus & Story Execution (§1.1, §3.2, §7)
  // -------------------------------------------------------------

  public emit(event: string, payload?: any): void {
    this.eventBus.emit(event, payload);
  }

  public on(event: string, cb: EngineEventCallback): void {
    this.eventBus.on(event, cb);
  }

  public off(event: string, cb: EngineEventCallback): void {
    this.eventBus.off(event, cb);
  }

  public executeCommands(commands: EventCommand[], onComplete?: () => void): void {
    this.interpreter.start(commands, 0, onComplete);
  }

  public jumpToLabel(label: string): void {
    this.currentStoryLabel = label;
    this.emit('story.jump', { label });

    let targetGraphId = '';
    let targetNodeId = label;
    if (label.includes('.')) {
      const parts = label.split('.');
      targetGraphId = parts[0];
      targetNodeId = parts.slice(1).join('.');
    }

    // Check if label matches a node in storyGraphs
    for (const [graphId, graph] of Object.entries(this.projectData.storyGraphs || {})) {
      if (targetGraphId && graphId !== targetGraphId) continue;

      const node = graph.nodes[targetNodeId] || graph.nodes[label] || (targetNodeId === 'prologue' ? Object.values(graph.nodes)[0] : undefined);
      if (node) {
        if (node.type === 'switch_mode') {
          this.switchMode(node.data.targetModeId, node.data.params);
        } else if (node.type === 'event' && node.data.commands) {
          this.executeCommands(node.data.commands);
        } else if (node.type === 'dialogue') {
          this.executeCommands([
            {
              code: 'show_text',
              parameters: node.data,
            },
          ]);
        }
        return;
      }
    }

    // Check common events
    if (this.projectData.commonEvents[label]) {
      this.executeCommands(this.projectData.commonEvents[label].commands);
    }
  }

  // -------------------------------------------------------------
  // Triggers, Messaging & Achievements (§4.8, §4.9)
  // -------------------------------------------------------------

  public evaluateTrigger(trigger: Trigger): boolean {
    return TriggerEngine.evaluate(trigger, this.state, this.currentMode?.id);
  }

  public checkTriggers(): void {
    // Check achievements
    if (this.projectData.achievements) {
      for (const [id, ach] of Object.entries(this.projectData.achievements)) {
        if (!this.state.achievements.includes(id)) {
          if (this.evaluateTrigger(ach.trigger)) {
            this.unlockAchievement(id);
          }
        }
      }
    }

    // Check messages
    this.emit('check_messages');
  }

  public unlockAchievement(achievementId: string): void {
    if (this.state.achievements.includes(achievementId)) return;
    this.state.achievements.push(achievementId);
    const ach = this.projectData.achievements[achievementId];
    this.emit('achievement.unlocked', { id: achievementId, achievement: ach });
    this.playSe('victory');
  }

  public unlockGallery(assetId: string): void {
    if (this.state.gallery.includes(assetId)) return;
    this.state.gallery.push(assetId);
    this.emit('gallery.unlocked', { assetId });
  }

  // -------------------------------------------------------------
  // Save & Load (§4.14)
  // -------------------------------------------------------------

  public async saveGame(slot: number, chapterLabel: string = 'Current Chapter'): Promise<boolean> {
    if (this.currentMode) {
      this.state.modeContexts[this.currentMode.id] = this.currentMode.serialize();
    }

    const saveData: SaveData = {
      version: 3,
      meta: {
        slot,
        timestamp: Date.now(),
        playtime: this.state.playtime,
        chapterLabel,
        modeId: this.currentMode?.id || this.projectData.system.startMode,
      },
      core: JSON.parse(JSON.stringify(this.state)),
      resume: {
        modeId: this.currentMode?.id || this.projectData.system.startMode,
        storyLabel: this.currentStoryLabel,
        pendingCmdIndex: this.interpreter.currentIndex,
      },
    };

    const success = await this.saveManager.save(saveData);
    if (success) {
      this.emit('game.saved', { slot, meta: saveData.meta });
    }
    return success;
  }

  public async loadGame(slot: number): Promise<boolean> {
    const data = await this.saveManager.load(slot);
    if (!data) return false;

    this.state = data.core;
    this.currentStoryLabel = data.resume.storyLabel;

    // Restore target mode
    const targetModeId = data.resume.modeId;
    if (this.modes.has(targetModeId)) {
      this.switchMode(targetModeId, this.state.modeContexts[targetModeId]);
    }

    this.emit('game.loaded', { slot, meta: data.meta });
    return true;
  }

  public async getSaves(): Promise<SaveMeta[]> {
    return this.saveManager.listSaves();
  }

  // -------------------------------------------------------------
  // Overlays (§1.1, §4.8)
  // -------------------------------------------------------------

  public togglePhoneOverlay(show?: boolean): void {
    this.emit('overlay.phone.toggle', { show });
  }

  public toggleSystemMenu(show?: boolean): void {
    this.emit('overlay.system_menu.toggle', { show });
  }

  // -------------------------------------------------------------
  // Main Engine Loop & Lifecycle
  // -------------------------------------------------------------

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    // Start with configured mode and event from project settings (§1.2: 无主线预设)
    const { startMode, startEvent } = this.projectData.system;
    this.switchMode(startMode);
    if (startEvent) {
      this.jumpToLabel(startEvent);
    }

    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.state.playtime += dt;

    if (this.currentMode) {
      this.currentMode.update(dt);
      this.currentMode.render();
    }

    if (typeof requestAnimationFrame !== 'undefined') {
      this.animFrameId = requestAnimationFrame(this.loop);
    } else {
      setTimeout(this.loop, 16);
    }
  };
}
