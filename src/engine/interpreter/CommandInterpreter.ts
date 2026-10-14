import type { EngineShell, EventCommand, Trigger } from '../types';

export interface TextToken {
  type: 'text' | 'color' | 'speed' | 'pause';
  value: any;
}

export class TextParser {
  /**
   * Parse control characters:
   * \V[n] : Variable n
   * \N[n] : Character Name n
   * \G[k] : Custom Global k
   * \C[c] : Color change
   * \S[s] : Speed change
   * \P[ms] : Pause milliseconds
   */
  public static interpolate(raw: string, shell: EngineShell): string {
    let result = raw;

    // \V[key]
    result = result.replace(/\\V\[([a-zA-Z0-9_.-]+)\]/g, (_, key) => {
      const val = shell.getVariable(key);
      return val !== undefined ? String(val) : '';
    });

    // \N[charId]
    result = result.replace(/\\N\[([a-zA-Z0-9_.-]+)\]/g, (_, charId) => {
      const c = shell.getCharacter(charId);
      return c ? c.name : charId;
    });

    // \G[key]
    result = result.replace(/\\G\[([a-zA-Z0-9_.-]+)\]/g, (_, key) => {
      const val = shell.getGlobal(key);
      return val !== undefined ? String(val) : '';
    });

    return result;
  }

  public static tokenize(interpolated: string): TextToken[] {
    const tokens: TextToken[] = [];
    let i = 0;
    let buffer = '';

    while (i < interpolated.length) {
      if (interpolated[i] === '\\' && i + 1 < interpolated.length) {
        const code = interpolated[i + 1].toUpperCase();
        const openBracket = interpolated.indexOf('[', i + 1);
        const closeBracket = interpolated.indexOf(']', openBracket);

        if (openBracket === i + 2 && closeBracket !== -1) {
          if (buffer) {
            tokens.push({ type: 'text', value: buffer });
            buffer = '';
          }
          const param = interpolated.substring(openBracket + 1, closeBracket);

          if (code === 'C') {
            tokens.push({ type: 'color', value: param });
          } else if (code === 'S') {
            tokens.push({ type: 'speed', value: Number(param) || 1 });
          } else if (code === 'P') {
            tokens.push({ type: 'pause', value: Number(param) || 500 });
          }
          i = closeBracket + 1;
          continue;
        }
      }
      buffer += interpolated[i];
      i++;
    }

    if (buffer) {
      tokens.push({ type: 'text', value: buffer });
    }

    return tokens;
  }
}

export class CommandInterpreter {
  private shell: EngineShell;
  private commands: EventCommand[] = [];
  private index: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private onCompleteCallback?: () => void;

  constructor(shell: EngineShell) {
    this.shell = shell;
  }

  public get currentIndex(): number {
    return this.index;
  }

  public set currentIndex(val: number) {
    this.index = val;
  }

  public start(commands: EventCommand[], startIndex: number = 0, onComplete?: () => void): void {
    this.commands = commands;
    this.index = startIndex;
    this.isRunning = true;
    this.isPaused = false;
    this.onCompleteCallback = onComplete;
    this.executeNext();
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.executeNext();
    }
  }

  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.commands = [];
    this.index = 0;
  }

  private finish(): void {
    this.isRunning = false;
    this.isPaused = false;
    const cb = this.onCompleteCallback;
    this.onCompleteCallback = undefined;
    if (cb) cb();
  }

  public executeNext(): void {
    if (!this.isRunning || this.isPaused) return;

    if (this.index >= this.commands.length) {
      this.finish();
      return;
    }

    const cmd = this.commands[this.index];
    this.index++;

    this.processCommand(cmd);
  }

  private processCommand(cmd: EventCommand): void {
    const { code, parameters } = cmd;

    switch (code) {
      case 'show_text': {
        this.pause();
        const rawText = parameters.text || '';
        const interpolated = TextParser.interpolate(rawText, this.shell);
        this.shell.emit('interpreter.show_text', {
          characterId: parameters.characterId,
          characterName: parameters.characterName,
          text: interpolated,
          emotion: parameters.emotion || 'normal',
          tokens: TextParser.tokenize(interpolated),
          onFinish: () => this.resume(),
        });
        break;
      }

      case 'show_choices': {
        this.pause();
        const choices = parameters.choices || [];
        const availableChoices = choices.filter((c: any) => {
          if (!c.condition) return true;
          return this.shell.evaluateTrigger(c.condition);
        });

        this.shell.emit('interpreter.show_choices', {
          prompt: parameters.prompt ? TextParser.interpolate(parameters.prompt, this.shell) : undefined,
          choices: availableChoices,
          timeLimit: parameters.timeLimit,
          onSelect: (selectedChoice: any) => {
            if (selectedChoice && selectedChoice.commands && selectedChoice.commands.length > 0) {
              // Execute child commands
              this.commands.splice(this.index, 0, ...selectedChoice.commands);
            }
            if (selectedChoice && selectedChoice.targetStoryLabel) {
              this.shell.jumpToLabel(selectedChoice.targetStoryLabel);
              return;
            }
            this.resume();
          },
        });
        break;
      }

      case 'conditional_branch': {
        const trigger: Trigger = parameters.condition;
        const pass = this.shell.evaluateTrigger(trigger);
        const branchCommands: EventCommand[] = pass ? (parameters.thenCommands || []) : (parameters.elseCommands || []);
        if (branchCommands.length > 0) {
          this.commands.splice(this.index, 0, ...branchCommands);
        }
        this.executeNext();
        break;
      }

      case 'control_switches': {
        this.shell.setSwitch(parameters.key, !!parameters.value);
        this.executeNext();
        break;
      }

      case 'control_variables': {
        const current = this.shell.getVariable(parameters.key);
        let newVal = parameters.value;
        if (parameters.op === 'add') {
          newVal = (Number(current) || 0) + Number(parameters.value);
        } else if (parameters.op === 'sub') {
          newVal = (Number(current) || 0) - Number(parameters.value);
        }
        this.shell.setVariable(parameters.key, newVal);
        this.executeNext();
        break;
      }

      case 'control_globals': {
        const current = this.shell.getGlobal(parameters.key);
        let newVal = parameters.value;
        if (parameters.op === 'add') {
          newVal = (Number(current) || 0) + Number(parameters.value);
        } else if (parameters.op === 'sub') {
          newVal = (Number(current) || 0) - Number(parameters.value);
        }
        this.shell.setGlobal(parameters.key, newVal);
        this.executeNext();
        break;
      }

      case 'switch_mode': {
        this.shell.switchMode(parameters.targetModeId, parameters.params);
        this.executeNext();
        break;
      }

      case 'give_item':
      case 'change_items': {
        const domain = parameters.domain || 'avg';
        const amount = Number(parameters.amount) || 1;
        if (amount > 0) {
          this.shell.giveItem(parameters.itemId, amount, domain);
        } else {
          this.shell.removeItem(parameters.itemId, Math.abs(amount), domain);
        }
        this.executeNext();
        break;
      }

      case 'reveal_facet': {
        this.shell.revealFacet(parameters.itemId, parameters.modeId);
        this.executeNext();
        break;
      }

      case 'change_affection': {
        this.shell.changeAffection(parameters.characterId, Number(parameters.delta) || 0);
        this.executeNext();
        break;
      }

      case 'play_bgm': {
        this.shell.playBgm(parameters.track, {
          volume: parameters.volume,
          loop: parameters.loop,
          fadeInDuration: parameters.fadeInDuration,
        });
        this.executeNext();
        break;
      }

      case 'stop_bgm': {
        this.shell.stopBgm(parameters.fadeOutDuration);
        this.executeNext();
        break;
      }

      case 'play_se': {
        this.shell.playSe(parameters.track, {
          volume: parameters.volume,
          pitch: parameters.pitch,
        });
        this.executeNext();
        break;
      }

      case 'call_common_event': {
        const def = this.shell.projectData.commonEvents[parameters.commonEventId];
        if (def && def.commands.length > 0) {
          this.commands.splice(this.index, 0, ...def.commands);
        }
        this.executeNext();
        break;
      }

      case 'jump_to_label': {
        this.shell.jumpToLabel(parameters.label);
        break;
      }

      case 'unlock_achievement': {
        this.shell.unlockAchievement(parameters.achievementId);
        this.executeNext();
        break;
      }

      case 'unlock_gallery': {
        this.shell.unlockGallery(parameters.assetId);
        this.executeNext();
        break;
      }

      case 'trigger_message': {
        this.shell.emit('phone.trigger_script', { scriptId: parameters.scriptId });
        this.executeNext();
        break;
      }

      case 'battle_processing': {
        this.pause();
        this.shell.emit('rpg.battle_processing', {
          troopId: parameters.troopId,
          canEscape: parameters.canEscape !== false,
          canLose: parameters.canLose === true,
          onResult: (result: 'win' | 'lose' | 'escape') => {
            if (result === 'win' && parameters.onWin) {
              this.commands.splice(this.index, 0, ...parameters.onWin);
            } else if (result === 'lose' && parameters.onLose) {
              this.commands.splice(this.index, 0, ...parameters.onLose);
            } else if (result === 'escape' && parameters.onEscape) {
              this.commands.splice(this.index, 0, ...parameters.onEscape);
            }
            this.resume();
          },
        });
        break;
      }

      case 'script_eval': {
        try {
          const fn = new Function('shell', 'cmd', parameters.code);
          fn(this.shell, cmd);
        } catch (e) {
          console.error('[CommandInterpreter] Script eval failed:', e);
        }
        this.executeNext();
        break;
      }

      default: {
        this.shell.emit(`command.${code}`, {
          parameters,
          onDone: () => this.resume(),
        });
        // If nothing caught, advance
        this.executeNext();
        break;
      }
    }
  }
}
