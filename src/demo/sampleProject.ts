import type { ProjectData } from '../engine/types';

export const sampleProjectData: ProjectData = {
  manifest: {
    format: 'esproj',
    formatVersion: 3,
    engine: '>=0.9.0',
    name: '午夜之雨案',
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
    gameTitle: '午夜之雨案',
    version: '1.0.0',
    initialParty: ['detective'],
    initialGold: 150,
    terms: { hp: '生命值', mp: '法力值', gold: '金币' },
    audioPolicy: 'continue',
  },
  characters: {
    detective: {
      id: 'detective',
      name: '任侦探',
      title: '王牌调查员',
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
          name: '敏锐观察力',
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
      name: '真宵',
      title: '见习灵媒助手',
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
      name: '凡斯先生',
      title: '古董店商人',
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
      name: '德雷克警长',
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
        name: '湿漉漉的雨伞',
        icon: 'umbrella.png',
        desc: '在咖啡馆后巷发现的一把浸满雨水的蓝色雨伞。',
        storyTags: ['evidence', 'rain'],
      },
      facets: {
        avg: {
          category: 'evidence',
          unlockFlags: ['knows_umbrella_found'],
          presentReactions: {
            suspect: { text: "这……这把还在滴水的雨伞，你从哪翻出来的？！" },
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
          pressResponse: "仔细看！这把伞上还滴着新鲜的暴雨雨水！",
        },
      },
    },
    herbal_tea: {
      id: 'herbal_tea',
      base: {
        name: '舒缓草药茶',
        icon: 'tea.png',
        desc: '温热清香的洋甘菊茶，能有效舒缓疲劳与情绪。',
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
        name: '城镇警卫佩剑',
        icon: 'sword.png',
        desc: '城市巡逻卫队标准配发的精钢长剑，锋利耐用。',
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
      name: '金币储备',
      type: 'number',
      default: 150,
      hidden: false,
      domain: 'rpg',
      exposeToTriggers: true,
    },
    {
      key: 'plot.suspicion',
      name: '嫌疑人罪证量表',
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
      name: '暴雨中的迷局',
      desc: '在 Easy Story Engine 中开启您的初次调查旅程。',
      secret: false,
      trigger: { switches: [{ key: 'game_started', value: true }] },
    },
    ach_first_contradiction: {
      id: 'ach_first_contradiction',
      name: '真相大白 (异议あり!)',
      desc: '在法庭辩论中成功指出凡斯先生证言的致命矛盾。',
      secret: false,
      trigger: { switches: [{ key: 'debate_cleared', value: true }] },
    },
    ach_rpg_battle: {
      id: 'ach_rpg_battle',
      name: '城镇广场守护者',
      desc: '在 RPG 模式下击退伏击的暗影魔物。',
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
          content: '任侦探！我刚泡好了 \\C[#64b5f6]舒缓草药茶\\C[#ffffff]！记得去后巷看看有没有可疑遗留物哦！',
          replies: [
            {
              id: 'rep_1',
              text: '谢谢真宵！有你在真是太靠谱了。',
              affectionDelta: { characterId: 'assistant', delta: 10 },
            },
            {
              id: 'rep_2',
              text: '收到，我们抓紧调查线索。',
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
      title: '第一章：午夜暴雨中的疑云',
      startNodeId: 'prologue',
      nodes: {
        prologue: {
          id: 'prologue',
          title: '侦探事务所',
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
                  characterName: '真宵',
                  text: '\\N[detective]！嫌疑人凡斯先生坚称昨晚一直坐在温暖的咖啡馆里避雨，绝对没有踏入暴风雨中半步！',
                  emotion: 'normal',
                },
              },
              {
                code: 'show_choices',
                parameters: {
                  prompt: '任侦探，我们接下来怎么行动？',
                  choices: [
                    {
                      label: '1. 前往小镇街区进行 RPG 现场搜查 (切换 RPG 模式)',
                      commands: [
                        {
                          code: 'switch_mode',
                          parameters: { targetModeId: 'rpg', params: { mapId: 'town_square' } },
                        },
                      ],
                    },
                    {
                      label: '2. 直接对凡斯先生进行法庭质询 (切换辩论模式)',
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
      name: '辩论胜利事件',
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
            characterName: '凡斯先生',
            text: '我……我招认！因为昨晚外面暴雨如注，我顺手牵羊拿走了那把伞！我的不在场证明被你彻底击碎了！',
            emotion: 'sorrow',
          },
        },
        {
          code: 'show_text',
          parameters: {
            characterId: 'assistant',
            characterName: '真宵',
            text: '太棒了任侦探！真相大白！Easy Story Engine 完美实现了多模式之间的丝滑串联！',
            emotion: 'joy',
          },
        },
      ],
    },
  },
  maps: {
    town_square: {
      id: 'town_square',
      name: '旧镇中心广场',
      width: 16,
      height: 12,
      tileSize: 32,
      data: new Array(16 * 12).fill(0),
      regions: new Array(16 * 12).fill(0),
      collision: new Array(16 * 12).fill(false),
      events: [
        {
          id: 'guard_npc',
          name: '德雷克警长',
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
                    characterName: '德雷克警长',
                    text: '任侦探！在去幽暗小巷调查前，带上这把城镇巡逻队的精钢佩剑防身吧。',
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
          name: '前往法庭',
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
                    text: '关键证物搜集完毕，即刻动身前往法庭对嫌疑人开展交叉质询！',
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
      title: '法庭证言：暴风雨当夜的行踪',
      witnessId: 'suspect',
      penalty: 25,
      maxPressure: 100,
      sentences: [
        {
          id: 's1',
          speakerId: 'suspect',
          text: '昨天晚上八点到十点，我一直老老实实坐在温暖的咖啡馆里。',
          pressResponseText: '你确定时间没有记错吗？当然，咖啡馆那个大挂钟就在我头顶上方！',
        },
        {
          id: 's2',
          speakerId: 'suspect',
          text: '我散步回公寓的时候，外面天气非常惬意干燥，地面连一滴水都没有。',
          pressResponseText: '我出门时穿的是最轻便的布鞋，要是下雨早就湿透了！',
        },
        {
          id: 's3',
          speakerId: 'suspect',
          text: '我整个晚上都绝对没有带过雨伞，更没碰过雨伞！',
          contradictionEvidenceId: 'wet_umbrella',
          pressResponseText: '既然外面滴雨未落，我带雨伞干什么？根本用不着！',
          breakthroughStoryLabel: 'debate_victory',
        },
        {
          id: 's4',
          speakerId: 'suspect',
          text: '在那之后，我就骑着心爱的自行车平平安安回到了家。',
          pressResponseText: '我的自行车现在还安全地停在公寓门厅里。',
        },
      ],
      onVictoryEvent: 'debate_victory',
    },
  },
  title: {
    titleText: '午夜之雨案',
    bgmTrack: 'title_theme',
    buttons: [
      { id: 'btn_new', label: '开始新游戏', action: 'new_game' },
      { id: 'btn_cont', label: '继续探案旅程', action: 'continue' },
      { id: 'btn_ach', label: '成就殿堂', action: 'achievements' },
      { id: 'btn_gal', label: 'CG 图库', action: 'gallery' },
    ],
  },
  assets: {},
  plugins: [],
};
