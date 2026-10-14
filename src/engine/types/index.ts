/**
 * Easy Story Engine (ESE) - Type Definitions
 */

export type ItemDomain = 'avg' | 'rpg' | 'none';

export interface ModeContext {
  shell: EngineShell;
  data?: any;
  container: HTMLElement;
}

export interface ItemAdapter {
  canUse?(itemId: string, item: any): boolean;
  useEffect?(itemId: string, item: any, ctx: ModeContext): void;
  presentReaction?(itemId: string, targetNpc: string): { text?: string; eventId?: string } | null;
}

export interface GameModeCapabilities {
  supportsOverlay: boolean;
  itemDomain: ItemDomain;
}

export interface GameModeModule {
  id: string; // e.g. "avg" | "rpg" | "debate"
  onEnter(ctx: ModeContext): void;
  onExit(ctx: ModeContext): void;
  update(dt: number): void;
  render(): void;
  serialize(): object;
  deserialize(data: object): void;
  capabilities: GameModeCapabilities;
  hooks?: Record<string, Function[]>;
  itemAdapter?: ItemAdapter;
}

// -------------------------------------------------------------
// Core State & Custom Globals (§1.1, §4.15)
// -------------------------------------------------------------

export interface CustomGlobalDef {
  key: string;               // e.g. "rpg.gold", "debate.pressure", "avg.routePoints"
  name: string;              // Human readable name
  type: 'number' | 'string' | 'bool';
  default: any;
  hidden: boolean;           // Hidden from players (for secret plot checks)
  domain?: string;           // Module domain
  exposeToTriggers: boolean; // Available to Trigger system
}

export interface AvgInventoryItem {
  id: string;
  category: 'gift' | 'evidence' | 'trinket';
  count: number;
  obtainedIn?: string;
  revealedAt?: number;
}

export interface RpgInventoryItem {
  id: string;
  type: 'item' | 'weapon' | 'armor';
  count: number;
  equipped?: boolean;
  slot?: string;
  obtainedIn?: string;
}

export interface CoreState {
  switches: Record<string, boolean>;
  variables: Record<string, any>;
  customGlobals: Record<string, any>; // G[key]
  items: {
    avg: AvgInventoryItem[];
    rpg: RpgInventoryItem[];
  };
  affection: Record<string, number>; // characterId -> value
  gallery: string[];                 // unlocked asset/image IDs
  achievements: string[];            // unlocked achievement IDs
  msgState: MessageSystemState;
  modeContexts: Record<string, any>;
  playtime: number;
}

// -------------------------------------------------------------
// Entity & Facets (§4.5)
// -------------------------------------------------------------

export interface AvgItemFacet {
  category: 'gift' | 'evidence' | 'trinket';
  effectValue?: number; // e.g. Affection +N
  targetCharacterId?: string;
  unlockFlags?: string[]; // Switches turned ON when presented
  presentReactions?: Record<string, { text?: string; eventId?: string }>;
}

export interface RpgItemFacet {
  type: 'item' | 'weapon' | 'armor';
  price?: number;
  atk?: number;
  def?: number;
  mat?: number;
  mdf?: number;
  hpRecovery?: number;
  mpRecovery?: number;
  consumable?: boolean;
  effectScript?: string;
  slot?: 'weapon' | 'shield' | 'head' | 'body' | 'accessory';
}

export interface DebateEvidenceFacet {
  contradictionIds?: string[]; // Sentence IDs this evidence can contradict
  pressResponse?: string;
  breakthroughBonus?: number;
}

export interface Entity {
  id: string;
  base: {
    name: string;
    icon: string;
    desc: string;
    storyTags: string[];
  };
  facets: {
    avg?: AvgItemFacet;
    rpg?: RpgItemFacet;
    debate?: DebateEvidenceFacet;
  };
}

// -------------------------------------------------------------
// Character & Facial Emotions (§4.12)
// -------------------------------------------------------------

export type BaseEmotion = 'normal' | 'joy' | 'anger' | 'sorrow';

export interface EmotionSet {
  normal: string; // AssetId or URL
  joy: string;
  anger: string;
  sorrow: string;
  [custom: string]: string;
}

export interface CharacterSprites {
  portrait?: EmotionSet;
  face?: EmotionSet;
  walking?: string; // RPG walking sprite sheet
  battler?: string; // RPG battler image
}

export interface CharacterTrait {
  id: string;
  name: string;
  desc?: string;
  modeMapping: {
    avg?: { presentHintLevel?: number; [k: string]: any };
    rpg?: { hitRateBonus?: number; atkBonus?: number; [k: string]: any };
    debate?: { pressCountBonus?: number; [k: string]: any };
    [modeId: string]: any;
  };
}

export interface CharacterData {
  id: string;
  name: string;
  title?: string;
  bio?: string;
  sprites?: CharacterSprites;
  traits?: CharacterTrait[];
  initialAffection?: number;
}

// -------------------------------------------------------------
// Save & Load (§4.14)
// -------------------------------------------------------------

export interface SaveMeta {
  slot: number;
  timestamp: number;
  playtime: number;
  snapshot?: string;
  chapterLabel: string;
  modeId: string;
}

export interface SaveResume {
  modeId: string;
  storyLabel: string;
  pendingCmdIndex?: number;
  params?: any;
}

export interface SaveData {
  version: number;
  checksum?: string;
  meta: SaveMeta;
  core: CoreState;
  resume: SaveResume;
}

// -------------------------------------------------------------
// Trigger System (§4.8.1, §4.9)
// -------------------------------------------------------------

export type ComparisonOp = '==' | '!=' | '>' | '>=' | '<' | '<=';

export interface VariableCondition {
  key: string;
  op: ComparisonOp;
  value: any;
}

export interface SwitchCondition {
  key: string;
  value: boolean;
}

export interface ItemCondition {
  id: string;
  domain?: 'avg' | 'rpg';
  count?: number;
}

export interface AffectionCondition {
  characterId: string;
  min?: number;
  max?: number;
}

export interface Trigger {
  id?: string;
  logic?: 'AND' | 'OR';
  switches?: SwitchCondition[];
  variables?: VariableCondition[];
  customGlobals?: VariableCondition[];
  mode?: string;
  items?: ItemCondition[];
  affection?: AffectionCondition[];
  children?: Trigger[];
}

// -------------------------------------------------------------
// Messaging (Phone) System (§4.8)
// -------------------------------------------------------------

export type MessageContentType = 'text' | 'emoji' | 'image' | 'file';

export interface ReplyOption {
  id: string;
  text: string;
  affectionDelta?: { characterId: string; delta: number };
  eventCommands?: EventCommand[];
  nextMessageId?: string;
}

export interface MessageItem {
  id: string;
  senderId: string; // characterId or "player"
  type: MessageContentType;
  content: string; // text, emoji code, image assetId, or file description
  timestamp?: number;
  delayMs?: number;
  audioSe?: string;
  replies?: ReplyOption[];
  unlockGalleryId?: string;
  fileEventId?: string;
}

export interface ConversationThread {
  id: string;
  characterId: string;
  title: string;
  avatar?: string;
  unreadCount: number;
  messages: MessageItem[];
}

export interface MessageScript {
  id: string;
  characterId: string;
  trigger: Trigger;
  triggerOnce?: boolean;
  cooldownSec?: number;
  requiredReadMessageIds?: string[];
  messages: MessageItem[];
}

export interface MessageSystemState {
  threads: Record<string, ConversationThread>;
  readMessageIds: string[];
  repliedMessageIds: string[];
  lastTriggerTimes: Record<string, number>;
  activeNotification?: { characterId: string; text: string; time: number } | null;
}

// -------------------------------------------------------------
// Achievements (§4.9)
// -------------------------------------------------------------

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon?: string;
  secret: boolean;
  trigger: Trigger;
  reward?: {
    avgItemId?: string;
    rpgItemId?: string;
    variable?: [string, any];
  };
  progress?: {
    target: number;
    counterVar: string;
  };
  unlockedAt?: number;
}

// -------------------------------------------------------------
// Audio Management (§4.11)
// -------------------------------------------------------------

export type AudioCategory = 'bgm' | 'bgs' | 'se' | 'me';
export type AudioCrossModePolicy = 'follow' | 'continue' | 'crossfade';

export interface AudioPlaybackOptions {
  volume?: number; // 0.0 - 1.0
  pitch?: number;  // playbackRate
  fadeInDuration?: number; // seconds
  loop?: boolean;
  crossfadeDuration?: number;
}

// -------------------------------------------------------------
// Event Commands & Story Flow (§1.2, §3.2, §5, §6)
// -------------------------------------------------------------

export interface EventCommand {
  code: string;
  parameters: Record<string, any>;
  indent?: number;
}

export interface EventDefinition {
  id: string;
  name: string;
  commands: EventCommand[];
}

export interface StoryNode {
  id: string;
  title: string;
  type: 'dialogue' | 'event' | 'choice' | 'switch_mode' | 'condition' | 'battle' | 'debate';
  position: { x: number; y: number };
  data: any;
  next?: string;
  branches?: { label: string; condition?: Trigger; targetNodeId: string }[];
}

export interface StoryGraph {
  id: string;
  chapter: string;
  title: string;
  nodes: Record<string, StoryNode>;
  startNodeId: string;
}

// -------------------------------------------------------------
// RPG Specific Types (§3)
// -------------------------------------------------------------

export interface RpgActor {
  id: string;
  name: string;
  classId: string;
  level: number;
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
  luk: number;
  skills: string[]; // skill IDs
  equipment: {
    weapon?: string;
    shield?: string;
    head?: string;
    body?: string;
    accessory?: string;
  };
}

export interface RpgSkill {
  id: string;
  name: string;
  icon: string;
  desc: string;
  mpCost: number;
  tpCost: number;
  damageFormula: string; // e.g. "a.atk * 4 - b.def * 2"
  element?: string;
  hitRate: number;
  critRate: number;
  target: 'enemy_single' | 'enemy_all' | 'ally_single' | 'ally_all' | 'self';
  statusEffects?: { stateId: string; chance: number }[];
}

export interface RpgEnemy {
  id: string;
  name: string;
  battlerImage?: string;
  hp: number;
  maxHp: number;
  mp: number;
  atk: number;
  def: number;
  mat: number;
  mdf: number;
  exp: number;
  gold: number;
  dropItems?: { id: string; chance: number }[];
  actions: { skillId: string; rating: number; condition?: string }[];
}

export interface RpgTroop {
  id: string;
  name: string;
  members: { enemyId: string; x: number; y: number }[];
}

export interface MapEventPage {
  conditions: {
    switch1Id?: string;
    switch1Val?: boolean;
    variableId?: string;
    variableVal?: number;
  };
  trigger: 'action' | 'player_touch' | 'event_touch' | 'auto' | 'parallel';
  graphic?: { characterId?: string; spriteIndex?: number };
  commands: EventCommand[];
}

export interface MapEvent {
  id: string;
  x: number;
  y: number;
  name: string;
  pages: MapEventPage[];
}

export interface TilemapData {
  id: string;
  name: string;
  width: number;
  height: number;
  tileSize: number; // default 32
  tilesetId?: string;
  parallaxImage?: string;
  bgm?: { track: string; volume?: number };
  data: number[];       // Ground tile indices
  regions: number[];    // Region codes
  collision: boolean[]; // Collision flag per tile (true = solid)
  events: MapEvent[];
}

// -------------------------------------------------------------
// Debate Specific Types (§5)
// -------------------------------------------------------------

export interface TestimonySentence {
  id: string;
  speakerId: string;
  text: string;
  contradictionEvidenceId?: string; // Correct evidence to present here
  pressResponseText: string;        // Response when pressing this sentence
  breakthroughEventId?: string;     // Event to run on successful presentation
  breakthroughStoryLabel?: string;
}

export interface DebateScript {
  id: string;
  title: string;
  witnessId: string;
  sentences: TestimonySentence[];
  penalty: number;                  // HP penalty for wrong presentation
  maxPressure: number;              // Initial player tension/HP (e.g. 100)
  onVictoryEvent?: string;
  onDefeatEvent?: string;
  onTimeoutEvent?: string;
  timeLimitSec?: number;
}

// -------------------------------------------------------------
// Project Protocol & System Settings (§4.16)
// -------------------------------------------------------------

export interface SystemSettings {
  startMode: string;                 // e.g. "avg" | "rpg" | "debate"
  startEvent: string;                // e.g. "ch1.prologue"
  gameTitle: string;
  version: string;
  initialParty: string[];            // Character IDs in initial team
  initialGold: number;
  terms: Record<string, string>;     // HP, MP, Gold, etc.
  audioPolicy: AudioCrossModePolicy;
}

export interface TitleMenuButton {
  id: string;
  label: string;
  action: 'new_game' | 'continue' | 'settings' | 'achievements' | 'gallery' | 'exit' | 'jump_story' | string;
  targetStoryLabel?: string;
  enabled?: boolean;
}

export interface TitleClickableElement {
  id: string;
  name: string;
  type: 'title_text' | 'logo' | 'hotspot' | 'button';
  x: number;
  y: number;
  width?: number;
  height?: number;
  action: 'new_game' | 'continue' | 'settings' | 'achievements' | 'gallery' | 'jump_story' | 'play_se' | 'none';
  targetStoryLabel?: string;
  soundEffect?: string;
  tooltip?: string;
}

export interface TitleLayoutConfig {
  logoImage?: string;
  titleText: string;
  subtitleText?: string;
  bgImage?: string;
  bgmTrack?: string;
  cursorSe?: string;
  confirmSe?: string;
  buttons: TitleMenuButton[];
  clickableElements?: TitleClickableElement[];
  layoutTheme?: 'centered' | 'left_vertical' | 'bottom_horizontal' | 'custom_freeform';
}

export interface AssetRecord {
  id: string;
  path: string;
  category: 'image' | 'audio' | 'font';
  checksum?: string;
  tags?: string[];
}

export interface PluginMeta {
  id: string;
  name: string;
  file: string;
  type: 'module' | 'script' | 'lib';
  enabled: boolean;
  order: number;
  paramsSchema?: Record<string, any>;
  params?: Record<string, any>;
}

export interface ProjectManifest {
  format: 'esproj';
  formatVersion: number;
  engine: string;
  name: string;
  id: string;
  created: number;
  modified: number;
  startMode: string;
  startEvent: string;
  modes: string[];
  plugins: string[];
  checksum?: string;
  isTemplate?: boolean;
}

export interface ProjectData {
  manifest: ProjectManifest;
  system: SystemSettings;
  characters: Record<string, CharacterData>;
  entities: Record<string, Entity>;
  globals: CustomGlobalDef[];
  triggers: Record<string, Trigger>;
  achievements: Record<string, Achievement>;
  messages: Record<string, MessageScript>;
  storyGraphs: Record<string, StoryGraph>;
  commonEvents: Record<string, EventDefinition>;
  maps: Record<string, TilemapData>;
  debates: Record<string, DebateScript>;
  title: TitleLayoutConfig;
  assets: Record<string, AssetRecord>;
  plugins: PluginMeta[];
}

// -------------------------------------------------------------
// Engine Shell & Event Bus
// -------------------------------------------------------------

export type EngineEventCallback = (payload: any) => void;

export interface EngineShell {
  state: CoreState;
  entities: Record<string, Entity>;
  characters: Record<string, CharacterData>;
  projectData: ProjectData;
  container: HTMLElement;

  // Mode Management
  registerMode(mode: GameModeModule): void;
  getMode(id: string): GameModeModule | undefined;
  getCurrentMode(): GameModeModule | undefined;
  switchMode(targetModeId: string, params?: any): void;

  // Custom Globals & Variables
  registerGlobal(def: CustomGlobalDef): void;
  getGlobal(key: string): any;
  setGlobal(key: string, value: any): void;
  getSwitch(key: string): boolean;
  setSwitch(key: string, val: boolean): void;
  getVariable(key: string): any;
  setVariable(key: string, val: any): void;

  // Inventory & Facets
  entityRegistry: any;
  getEntity(itemId: string): Entity | undefined;
  giveItem(itemId: string, count?: number, domain?: ItemDomain): void;
  removeItem(itemId: string, count?: number, domain?: ItemDomain): void;
  hasItem(itemId: string, count?: number, domain?: ItemDomain): boolean;
  revealFacet(itemId: string, modeId: string): void;

  // Affection & Characters
  getAffection(characterId: string): number;
  changeAffection(characterId: string, delta: number): void;
  getCharacter(characterId: string): CharacterData | undefined;

  // Audio
  playBgm(track: string, options?: AudioPlaybackOptions): void;
  stopBgm(fadeOutDuration?: number): void;
  playSe(track: string, options?: AudioPlaybackOptions): void;
  playBgs(track: string, options?: AudioPlaybackOptions): void;
  stopBgs(): void;

  // Events & Story
  emit(event: string, payload?: any): void;
  on(event: string, cb: EngineEventCallback): void;
  off(event: string, cb: EngineEventCallback): void;
  executeCommands(commands: EventCommand[], onComplete?: () => void): void;
  jumpToLabel(label: string): void;

  // Triggers, Messages & Achievements
  evaluateTrigger(trigger: Trigger): boolean;
  unlockAchievement(achievementId: string): void;
  unlockGallery(assetId: string): void;

  // Save / Load
  saveGame(slot: number, chapterLabel?: string): Promise<boolean>;
  loadGame(slot: number): Promise<boolean>;
  getSaves(): Promise<SaveMeta[]>;

  // Overlay
  togglePhoneOverlay(show?: boolean): void;
  toggleSystemMenu(show?: boolean): void;
}
