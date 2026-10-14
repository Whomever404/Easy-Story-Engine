import type { ProjectData } from '../engine/types';

export const sampleProjectData: ProjectData = {
  manifest: {
    format: 'esproj',
    formatVersion: 3,
    engine: '>=0.9.0',
    name: 'The Case of the Midnight Rain',
    id: 'com.ese.demo.midnightrain',
    created: 1730000000,
    modified: 1730000000,
    startMode: 'avg',
    startEvent: 'ch1.prologue',
    modes: ['avg', 'rpg', 'debate'],
    plugins: [],
    checksum: 'demo_checksum_ok',
  },
  system: {
    startMode: 'avg',
    startEvent: 'ch1.prologue',
    gameTitle: 'The Case of the Midnight Rain',
    version: '1.0.0',
    initialParty: ['detective'],
    initialGold: 150,
    terms: { hp: 'HP', mp: 'MP', gold: 'Gold' },
    audioPolicy: 'continue',
  },
  characters: {
    detective: {
      id: 'detective',
      name: 'Detective Ren',
      title: 'Ace Investigator',
      initialAffection: 0,
      sprites: {
        portrait: {
          normal: 'assets/images/ren_normal.png',
          joy: 'assets/images/ren_joy.png',
          anger: 'assets/images/ren_anger.png',
          sorrow: 'assets/images/ren_sorrow.png',
        },
      },
      traits: [
        {
          id: 'observation',
          name: 'Observation (观察力)',
          modeMapping: {
            avg: { presentHintLevel: 1 },
            rpg: { hitRateBonus: 0.05 },
            debate: { pressCountBonus: 1 },
          },
        },
      ],
    },
    assistant: {
      id: 'assistant',
      name: 'Maya',
      title: 'Spirit Medium Assistant',
      initialAffection: 25,
      sprites: {
        portrait: {
          normal: 'assets/images/maya_normal.png',
          joy: 'assets/images/maya_joy.png',
          anger: 'assets/images/maya_anger.png',
          sorrow: 'assets/images/maya_sorrow.png',
        },
        face: {
          normal: 'assets/images/maya_face.png',
          joy: 'assets/images/maya_face_joy.png',
          anger: 'assets/images/maya_face_ang.png',
          sorrow: 'assets/images/maya_face_sor.png',
        },
      },
    },
    suspect: {
      id: 'suspect',
      name: 'Mr. Vance',
      title: 'Antiques Dealer',
      sprites: {
        portrait: {
          normal: 'assets/images/vance_norm.png',
          joy: 'assets/images/vance_joy.png',
          anger: 'assets/images/vance_ang.png',
          sorrow: 'assets/images/vance_sor.png',
        },
      },
    },
    guard: {
      id: 'guard',
      name: 'Officer Drake',
      sprites: {
        portrait: {
          normal: 'assets/images/drake_norm.png',
          joy: 'assets/images/drake_joy.png',
          anger: 'assets/images/drake_ang.png',
          sorrow: 'assets/images/drake_sor.png',
        },
      },
    },
  },
  entities: {
    wet_umbrella: {
      id: 'wet_umbrella',
      base: {
        name: 'Dripping Umbrella',
        icon: 'umbrella.png',
        desc: 'A soaked umbrella recovered from the coffee shop alleyway.',
        storyTags: ['evidence', 'rain'],
      },
      facets: {
        avg: {
          category: 'evidence',
          unlockFlags: ['knows_umbrella_found'],
          presentReactions: {
            suspect: { text: "H-Hey! Where did you dig up that drenched umbrella?!" },
          },
        },
        rpg: {
          type: 'weapon',
          atk: 5,
          price: 20,
          slot: 'weapon',
        },
        debate: {
          contradictionIds: ['s3'],
          pressResponse: "Look closely! The umbrella is still dripping wet with rainwater!",
        },
      },
    },
    herbal_tea: {
      id: 'herbal_tea',
      base: {
        name: 'Soothing Herbal Tea',
        icon: 'tea.png',
        desc: 'Warm chamomile tea that lifts the spirits.',
        storyTags: ['gift', 'drink'],
      },
      facets: {
        avg: {
          category: 'gift',
          effectValue: 20,
          targetCharacterId: 'assistant',
        },
        rpg: {
          type: 'item',
          hpRecovery: 60,
          price: 25,
          consumable: true,
        },
      },
    },
    iron_sword: {
      id: 'iron_sword',
      base: {
        name: 'Town Guard Sword',
        icon: 'sword.png',
        desc: 'A well-balanced steel blade standard issue to city guards.',
        storyTags: ['weapon'],
      },
      facets: {
        rpg: {
          type: 'weapon',
          atk: 18,
          price: 80,
          slot: 'weapon',
        },
      },
    },
  },
  globals: [
    {
      key: 'rpg.gold',
      name: 'Gold Currency',
      type: 'number',
      default: 150,
      hidden: false,
      domain: 'rpg',
      exposeToTriggers: true,
    },
    {
      key: 'plot.suspicion',
      name: 'Suspect Guilt Meter',
      type: 'number',
      default: 0,
      hidden: true,
      domain: 'debate',
      exposeToTriggers: true,
    },
  ],
  triggers: {
    has_tea: {
      items: [{ id: 'herbal_tea', domain: 'avg', count: 1 }],
    },
  },
  achievements: {
    ach_prologue: {
      id: 'ach_prologue',
      name: 'A Rain of Mysteries',
      desc: 'Begin your investigation in Easy Story Engine.',
      secret: false,
      trigger: { switches: [{ key: 'game_started', value: true }] },
    },
    ach_first_contradiction: {
      id: 'ach_first_contradiction',
      name: 'Truth Unveiled (异议あり!)',
      desc: 'Point out the critical contradiction in Mr. Vance testimony.',
      secret: false,
      trigger: { switches: [{ key: 'debate_cleared', value: true }] },
    },
    ach_rpg_battle: {
      id: 'ach_rpg_battle',
      name: 'Town Square Protector',
      desc: 'Defeat the ambush creature in RPG mode.',
      secret: false,
      trigger: { switches: [{ key: 'battle_won', value: true }] },
    },
  },
  messages: {
    maya_opening_msg: {
      id: 'maya_opening_msg',
      characterId: 'assistant',
      trigger: { switches: [{ key: 'game_started', value: true }] },
      triggerOnce: true,
      messages: [
        {
          id: 'msg_1',
          senderId: 'assistant',
          type: 'text',
          content: 'Ren! I brewed some \\C[#64b5f6]Herbal Tea\\C[#ffffff] for you. Also, be sure to check the alleyway!',
          replies: [
            {
              id: 'rep_1',
              text: 'Thanks Maya! You are the best.',
              affectionDelta: { characterId: 'assistant', delta: 10 },
            },
            {
              id: 'rep_2',
              text: 'Let us stay focused on the case.',
            },
          ],
        },
      ],
    },
  },
  storyGraphs: {
    ch1: {
      id: 'ch1',
      chapter: '1',
      title: 'Chapter 1: The Midnight Rain',
      startNodeId: 'prologue',
      nodes: {
        prologue: {
          id: 'prologue',
          title: 'Detective Office',
          type: 'event',
          position: { x: 50, y: 150 },
          data: {
            commands: [
              {
                code: 'control_switches',
                parameters: { key: 'game_started', value: true },
              },
              {
                code: 'unlock_achievement',
                parameters: { achievementId: 'ach_prologue' },
              },
              {
                code: 'give_item',
                parameters: { itemId: 'herbal_tea', amount: 1, domain: 'avg' },
              },
              {
                code: 'give_item',
                parameters: { itemId: 'wet_umbrella', amount: 1, domain: 'avg' },
              },
              {
                code: 'show_text',
                parameters: {
                  characterId: 'assistant',
                  characterName: 'Maya',
                  text: 'Detective \\N[detective]! The suspect Mr. Vance insists he stayed inside the cafe and never stepped out in the storm!',
                  emotion: 'normal',
                },
              },
              {
                code: 'show_choices',
                parameters: {
                  prompt: 'How would you like to proceed?',
                  choices: [
                    {
                      label: '1. Investigate the Crime Scene in RPG Mode',
                      commands: [
                        {
                          code: 'switch_mode',
                          parameters: { targetModeId: 'rpg', params: { mapId: 'town_square' } },
                        },
                      ],
                    },
                    {
                      label: '2. Confront Mr. Vance in Courtroom Debate',
                      commands: [
                        {
                          code: 'switch_mode',
                          parameters: { targetModeId: 'debate', params: { debateId: 'trial_stolen_umbrella' } },
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    },
  },
  commonEvents: {
    debate_victory: {
      id: 'debate_victory',
      name: 'Debate Victory Event',
      commands: [
        {
          code: 'control_switches',
          parameters: { key: 'debate_cleared', value: true },
        },
        {
          code: 'switch_mode',
          parameters: { targetModeId: 'avg' },
        },
        {
          code: 'show_text',
          parameters: {
            characterId: 'suspect',
            characterName: 'Mr. Vance',
            text: 'I... I confess! I took the umbrella because it was pouring rain outside! You broke my alibi completely!',
            emotion: 'sorrow',
          },
        },
        {
          code: 'show_text',
          parameters: {
            characterId: 'assistant',
            characterName: 'Maya',
            text: 'We did it! Case closed! Easy Story Engine handled the multi-mode transition smoothly!',
            emotion: 'joy',
          },
        },
      ],
    },
  },
  maps: {
    town_square: {
      id: 'town_square',
      name: 'Old Town Square',
      width: 16,
      height: 12,
      tileSize: 32,
      data: new Array(16 * 12).fill(0),
      regions: new Array(16 * 12).fill(0),
      collision: new Array(16 * 12).fill(false),
      events: [
        {
          id: 'guard_npc',
          name: 'Captain Drake',
          x: 4,
          y: 4,
          pages: [
            {
              conditions: {},
              trigger: 'action',
              commands: [
                {
                  code: 'show_text',
                  parameters: {
                    characterId: 'guard',
                    characterName: 'Captain Drake',
                    text: 'Detective! Take this forged steel sword before you enter the forest alley.',
                  },
                },
                {
                  code: 'change_items',
                  parameters: { itemId: 'iron_sword', amount: 1, domain: 'rpg' },
                },
              ],
            },
          ],
        },
        {
          id: 'alley_exit',
          name: 'To Courtroom',
          x: 10,
          y: 8,
          pages: [
            {
              conditions: {},
              trigger: 'action',
              commands: [
                {
                  code: 'show_text',
                  parameters: {
                    text: 'Evidence collected. Proceeding to courtroom cross-examination!',
                  },
                },
                {
                  code: 'switch_mode',
                  parameters: { targetModeId: 'debate', params: { debateId: 'trial_stolen_umbrella' } },
                },
              ],
            },
          ],
        },
      ],
    },
  },
  debates: {
    trial_stolen_umbrella: {
      id: 'trial_stolen_umbrella',
      title: 'Testimony: Whereabouts During the Storm',
      witnessId: 'suspect',
      penalty: 25,
      maxPressure: 100,
      sentences: [
        {
          id: 's1',
          speakerId: 'suspect',
          text: 'I stayed inside the warmth of the coffee shop from 8 PM until 10 PM sharp.',
          pressResponseText: 'Are you sure about the timing? Yes, the grandfather clock was right above my seat.',
        },
        {
          id: 's2',
          speakerId: 'suspect',
          text: 'The weather was completely pleasant and dry when I strolled back home.',
          pressResponseText: 'I wore my lightest clothes; there was no rain whatsoever.',
        },
        {
          id: 's3',
          speakerId: 'suspect',
          text: 'I never touched or carried an umbrella throughout the whole evening!',
          contradictionEvidenceId: 'wet_umbrella',
          pressResponseText: 'Why would anyone carry an umbrella on a dry night?',
          breakthroughStoryLabel: 'debate_victory',
        },
        {
          id: 's4',
          speakerId: 'suspect',
          text: 'After that, I rode my bicycle peacefully back to my flat.',
          pressResponseText: 'My bicycle is stored safely in my apartment lobby.',
        },
      ],
      onVictoryEvent: 'debate_victory',
    },
  },
  title: {
    titleText: 'The Case of the Midnight Rain',
    bgmTrack: 'title_theme',
    buttons: [
      { id: 'btn_new', label: 'Start New Game', action: 'new_game' },
      { id: 'btn_cont', label: 'Continue Journey', action: 'continue' },
      { id: 'btn_ach', label: 'Hall of Achievements', action: 'achievements' },
      { id: 'btn_gal', label: 'CG Gallery', action: 'gallery' },
    ],
  },
  assets: {},
  plugins: [],
};
