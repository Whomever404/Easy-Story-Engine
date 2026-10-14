import type {
  GameModeModule,
  ModeContext,
  GameModeCapabilities,
  ItemAdapter,
  AvgItemFacet,
} from '../../types';

export interface AvgDialogueState {
  speakerId?: string;
  speakerName?: string;
  text: string;
  emotion: string;
  background?: string;
  choices?: any[];
  timeLimit?: number;
}

export class AvgMode implements GameModeModule {
  public id = 'avg';
  public capabilities: GameModeCapabilities = {
    supportsOverlay: true,
    itemDomain: 'avg',
  };

  private ctx: ModeContext | null = null;
  private rootElement: HTMLElement | null = null;

  // State
  private background: string = '';
  private currentSpeakerId: string = '';
  private currentSpeakerName: string = '';
  private displayedText: string = '';
  private fullText: string = '';
  private currentEmotion: string = 'normal';
  private typewriterTimer: any = null;
  private typewriterIndex: number = 0;
  private isTyping: boolean = false;
  private isAutoPlay: boolean = false;
  private autoPlayTimer: any = null;
  private backlog: { speaker: string; text: string }[] = [];
  private activeChoices: any[] = [];
  private choiceTimer: any = null;
  private choiceTimeRemaining: number = 0;

  // Active dialogue callback
  private onDialogueFinish?: () => void;
  private onChoiceSelect?: (choice: any) => void;

  public itemAdapter: ItemAdapter = {
    canUse: (_itemId: string, item: any) => {
      return item?.category === 'gift';
    },
    useEffect: (itemId: string, item: any, ctx: ModeContext) => {
      if (item.category === 'gift' && item.targetCharacterId) {
        const delta = item.effectValue || 10;
        ctx.shell.changeAffection(item.targetCharacterId, delta);
        ctx.shell.removeItem(itemId, 1, 'avg');
        ctx.shell.playSe('confirm');
      }
    },
    presentReaction: (itemId: string, targetNpc: string) => {
      const facet = this.ctx?.shell.entityRegistry.getAvgFacet(itemId);
      if (facet && facet.presentReactions && facet.presentReactions[targetNpc]) {
        return facet.presentReactions[targetNpc];
      }
      return null;
    },
  };

  public onEnter(ctx: ModeContext): void {
    this.ctx = ctx;
    this.setupUI(ctx.container);
    this.registerEventListeners();
  }

  public onExit(_ctx: ModeContext): void {
    this.clearTimers();
    if (this.rootElement && this.rootElement.parentNode) {
      this.rootElement.parentNode.removeChild(this.rootElement);
    }
    this.rootElement = null;
    this.ctx = null;
  }

  public update(_dt: number): void {
    // Timer updates handled via interval/RAF
  }

  public render(): void {
    // DOM-based reactive rendering updates element styles/content
  }

  public serialize(): object {
    return {
      background: this.background,
      speakerId: this.currentSpeakerId,
      speakerName: this.currentSpeakerName,
      fullText: this.fullText,
      displayedText: this.displayedText,
      emotion: this.currentEmotion,
      backlog: this.backlog,
    };
  }

  public deserialize(data: any): void {
    if (!data) return;
    this.background = data.background || '';
    this.currentSpeakerId = data.speakerId || '';
    this.currentSpeakerName = data.speakerName || '';
    this.fullText = data.fullText || '';
    this.displayedText = data.displayedText || '';
    this.currentEmotion = data.emotion || 'normal';
    this.backlog = data.backlog || [];
    this.updateDisplay();
  }

  // -------------------------------------------------------------
  // UI Construction & DOM Handling
  // -------------------------------------------------------------

  private setupUI(container: HTMLElement): void {
    const root = document.createElement('div');
    root.className = 'ese-avg-viewport';
    root.style.cssText = `
      position: absolute; inset: 0; width: 100%; height: 100%;
      display: flex; flex-direction: column; justify-content: flex-end;
      overflow: hidden; background-color: #12131a; background-size: cover;
      background-position: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      user-select: none;
    `;
    this.rootElement = root;

    // Background layer
    const bgLayer = document.createElement('div');
    bgLayer.className = 'ese-avg-bg';
    bgLayer.style.cssText = 'position: absolute; inset: 0; background-size: cover; background-position: center; transition: opacity 0.4s ease; z-index: 1;';
    root.appendChild(bgLayer);

    // Character Portrait Layer
    const portraitLayer = document.createElement('div');
    portraitLayer.className = 'ese-avg-portrait-container';
    portraitLayer.style.cssText = 'position: absolute; bottom: 120px; left: 50%; transform: translateX(-50%); z-index: 2; pointer-events: none; transition: transform 0.3s ease;';
    const portraitImg = document.createElement('img');
    portraitImg.className = 'ese-avg-portrait';
    portraitImg.style.cssText = 'max-height: 520px; display: none; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));';
    portraitLayer.appendChild(portraitImg);
    root.appendChild(portraitLayer);

    // Dialogue Box
    const dialogueBox = document.createElement('div');
    dialogueBox.className = 'ese-avg-dialogue-box';
    dialogueBox.style.cssText = `
      position: relative; z-index: 5; margin: 0 20px 20px 20px;
      padding: 18px 24px; min-height: 120px;
      background: rgba(18, 22, 36, 0.88); backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6); color: #fff; cursor: pointer;
    `;

    // Speaker Name Tag
    const nameTag = document.createElement('div');
    nameTag.className = 'ese-avg-nametag';
    nameTag.style.cssText = `
      display: inline-block; padding: 4px 14px; margin-bottom: 8px;
      font-size: 15px; font-weight: 600; color: #64b5f6;
      background: rgba(33, 150, 243, 0.15); border-radius: 6px;
      border-left: 3px solid #2196f3;
    `;
    dialogueBox.appendChild(nameTag);

    // Content Text
    const textContent = document.createElement('div');
    textContent.className = 'ese-avg-text';
    textContent.style.cssText = 'font-size: 17px; line-height: 1.6; min-height: 54px; letter-spacing: 0.5px;';
    dialogueBox.appendChild(textContent);

    // Control buttons bar (Skip, Auto, Log, Items, Present, Characters)
    const ctrlBar = document.createElement('div');
    ctrlBar.className = 'ese-avg-controls';
    ctrlBar.style.cssText = 'position: absolute; top: -38px; right: 0; display: flex; gap: 8px; z-index: 6;';

    const btnStyle = `
      padding: 4px 10px; font-size: 12px; background: rgba(20, 24, 38, 0.85);
      border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #ddd;
      cursor: pointer; transition: all 0.2s;
    `;

    const autoBtn = document.createElement('button');
    autoBtn.innerText = 'AUTO';
    autoBtn.style.cssText = btnStyle;
    autoBtn.onclick = (e) => {
      e.stopPropagation();
      this.toggleAutoPlay();
      autoBtn.style.color = this.isAutoPlay ? '#4caf50' : '#ddd';
      autoBtn.style.borderColor = this.isAutoPlay ? '#4caf50' : 'rgba(255,255,255,0.2)';
    };

    const skipBtn = document.createElement('button');
    skipBtn.innerText = 'SKIP';
    skipBtn.style.cssText = btnStyle;
    skipBtn.onclick = (e) => {
      e.stopPropagation();
      this.completeTypingImmediately();
      this.advanceDialogue();
    };

    const logBtn = document.createElement('button');
    logBtn.innerText = 'LOG';
    logBtn.style.cssText = btnStyle;
    logBtn.onclick = (e) => {
      e.stopPropagation();
      this.showBacklogModal();
    };

    const bagBtn = document.createElement('button');
    bagBtn.innerText = 'ITEMS';
    bagBtn.style.cssText = btnStyle;
    bagBtn.onclick = (e) => {
      e.stopPropagation();
      this.showInventoryModal();
    };

    const presentBtn = document.createElement('button');
    presentBtn.innerText = 'PRESENT';
    presentBtn.style.cssText = btnStyle + 'background: #d32f2f; color: #fff; border-color: #f44336; font-weight: bold;';
    presentBtn.onclick = (e) => {
      e.stopPropagation();
      this.showPresentModal();
    };

    ctrlBar.append(autoBtn, skipBtn, logBtn, bagBtn, presentBtn);
    dialogueBox.appendChild(ctrlBar);

    dialogueBox.onclick = () => {
      if (this.isTyping) {
        this.completeTypingImmediately();
      } else {
        this.advanceDialogue();
      }
    };

    root.appendChild(dialogueBox);

    // Choices Container Layer
    const choicesOverlay = document.createElement('div');
    choicesOverlay.className = 'ese-avg-choices-overlay';
    choicesOverlay.style.cssText = `
      position: absolute; inset: 0; z-index: 10;
      display: none; flex-direction: column; justify-content: center; align-items: center;
      background: rgba(0, 0, 0, 0.45); backdrop-filter: blur(4px);
    `;
    root.appendChild(choicesOverlay);

    container.appendChild(root);
  }

  private registerEventListeners(): void {
    if (!this.ctx) return;

    this.ctx.shell.on('interpreter.show_text', (data: any) => {
      this.handleShowText(data);
    });

    this.ctx.shell.on('interpreter.show_choices', (data: any) => {
      this.handleShowChoices(data);
    });

    this.ctx.shell.on('avg.set_background', (data: any) => {
      this.setBackground(data.url || data.background);
    });

    this.ctx.shell.on('avg.set_emotion', (data: any) => {
      this.setEmotion(data.emotion);
    });
  }

  // -------------------------------------------------------------
  // Dialogue Execution
  // -------------------------------------------------------------

  public setBackground(url: string): void {
    this.background = url;
    if (this.rootElement) {
      const bg = this.rootElement.querySelector('.ese-avg-bg') as HTMLElement;
      if (bg) {
        bg.style.backgroundImage = url ? `url('${url}')` : 'none';
      }
    }
  }

  public setEmotion(emotion: string): void {
    this.currentEmotion = emotion;
    this.updatePortrait();
  }

  private handleShowText(data: any): void {
    this.currentSpeakerId = data.characterId || '';
    this.currentSpeakerName = data.characterName || (this.ctx?.shell.getCharacter(data.characterId)?.name) || '';
    this.fullText = data.text || '';
    this.currentEmotion = data.emotion || 'normal';
    this.onDialogueFinish = data.onFinish;

    // Add to backlog
    this.backlog.push({
      speaker: this.currentSpeakerName,
      text: this.fullText,
    });

    this.startTypewriter(this.fullText);
    this.updateDisplay();
  }

  private startTypewriter(text: string): void {
    this.clearTypingTimer();
    this.displayedText = '';
    this.typewriterIndex = 0;
    this.isTyping = true;

    this.typewriterTimer = setInterval(() => {
      if (this.typewriterIndex < text.length) {
        this.displayedText += text[this.typewriterIndex];
        this.typewriterIndex++;
        this.updateTextDisplay();
        // Trigger subtle voice blip SE
        if (this.typewriterIndex % 3 === 0 && this.ctx) {
          this.ctx.shell.playSe('blip', { volume: 0.15 });
        }
      } else {
        this.completeTypingImmediately();
      }
    }, 28);
  }

  private completeTypingImmediately(): void {
    this.clearTypingTimer();
    this.displayedText = this.fullText;
    this.isTyping = false;
    this.updateTextDisplay();

    if (this.isAutoPlay) {
      this.autoPlayTimer = setTimeout(() => {
        this.advanceDialogue();
      }, 1500);
    }
  }

  private advanceDialogue(): void {
    if (this.isTyping) return;
    if (this.onDialogueFinish) {
      const cb = this.onDialogueFinish;
      this.onDialogueFinish = undefined;
      cb();
    }
  }

  private toggleAutoPlay(): void {
    this.isAutoPlay = !this.isAutoPlay;
    if (this.isAutoPlay && !this.isTyping) {
      this.advanceDialogue();
    }
  }

  private updateDisplay(): void {
    if (!this.rootElement) return;

    const nameTag = this.rootElement.querySelector('.ese-avg-nametag') as HTMLElement;
    if (nameTag) {
      nameTag.innerText = this.currentSpeakerName;
      nameTag.style.display = this.currentSpeakerName ? 'inline-block' : 'none';
    }

    this.updatePortrait();
    this.updateTextDisplay();
  }

  private updatePortrait(): void {
    if (!this.rootElement) return;
    const img = this.rootElement.querySelector('.ese-avg-portrait') as HTMLImageElement;
    if (!img) return;

    const charData = this.ctx?.shell.getCharacter(this.currentSpeakerId);
    let portraitUrl: string | undefined;

    if (charData?.sprites?.portrait) {
      const emotions = charData.sprites.portrait;
      portraitUrl = emotions[this.currentEmotion] || emotions['normal'];
    }

    if (portraitUrl) {
      img.src = portraitUrl;
      img.style.display = 'block';
    } else {
      img.style.display = 'none';
    }
  }

  private updateTextDisplay(): void {
    if (!this.rootElement) return;
    const textEl = this.rootElement.querySelector('.ese-avg-text') as HTMLElement;
    if (textEl) {
      textEl.innerText = this.displayedText;
    }
  }

  // -------------------------------------------------------------
  // Choices & Timers (§2.1)
  // -------------------------------------------------------------

  private handleShowChoices(data: any): void {
    if (!this.rootElement) return;
    const overlay = this.rootElement.querySelector('.ese-avg-choices-overlay') as HTMLElement;
    if (!overlay) return;

    this.activeChoices = data.choices || [];
    this.onChoiceSelect = data.onSelect;

    overlay.innerHTML = '';
    overlay.style.display = 'flex';

    if (data.prompt) {
      const promptEl = document.createElement('div');
      promptEl.style.cssText = 'color: #fff; font-size: 18px; margin-bottom: 16px; font-weight: 500;';
      promptEl.innerText = data.prompt;
      overlay.appendChild(promptEl);
    }

    // Timer display if timeLimit specified
    let timerBar: HTMLElement | null = null;
    if (data.timeLimit && data.timeLimit > 0) {
      this.choiceTimeRemaining = data.timeLimit;
      const timerContainer = document.createElement('div');
      timerContainer.style.cssText = 'width: 320px; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; margin-bottom: 20px; overflow: hidden;';
      timerBar = document.createElement('div');
      timerBar.style.cssText = 'height: 100%; width: 100%; background: #ff9800; transition: width 0.1s linear;';
      timerContainer.appendChild(timerBar);
      overlay.appendChild(timerContainer);

      const total = data.timeLimit;
      this.choiceTimer = setInterval(() => {
        this.choiceTimeRemaining -= 0.1;
        if (timerBar) {
          const pct = Math.max(0, (this.choiceTimeRemaining / total) * 100);
          timerBar.style.width = `${pct}%`;
        }
        if (this.choiceTimeRemaining <= 0) {
          clearInterval(this.choiceTimer);
          // Auto select first choice or dismiss
          this.selectChoice(this.activeChoices[0]);
        }
      }, 100);
    }

    const list = document.createElement('div');
    list.style.cssText = 'display: flex; flex-direction: column; gap: 12px; width: 380px; max-width: 90%;';

    this.activeChoices.forEach((c) => {
      const btn = document.createElement('button');
      btn.innerText = c.label || c.text;
      btn.style.cssText = `
        padding: 14px 20px; background: rgba(30, 36, 56, 0.95);
        border: 1px solid rgba(100, 181, 246, 0.4); border-radius: 8px;
        color: #fff; font-size: 16px; text-align: left; cursor: pointer;
        transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      btn.onmouseenter = () => {
        btn.style.background = 'rgba(41, 121, 255, 0.8)';
        btn.style.borderColor = '#90caf9';
        btn.style.transform = 'translateX(6px)';
        this.ctx?.shell.playSe('cursor');
      };
      btn.onmouseleave = () => {
        btn.style.background = 'rgba(30, 36, 56, 0.95)';
        btn.style.borderColor = 'rgba(100, 181, 246, 0.4)';
        btn.style.transform = 'none';
      };
      btn.onclick = () => {
        this.ctx?.shell.playSe('confirm');
        this.selectChoice(c);
      };
      list.appendChild(btn);
    });

    overlay.appendChild(list);
  }

  private selectChoice(choice: any): void {
    if (this.choiceTimer) {
      clearInterval(this.choiceTimer);
      this.choiceTimer = null;
    }
    if (this.rootElement) {
      const overlay = this.rootElement.querySelector('.ese-avg-choices-overlay') as HTMLElement;
      if (overlay) overlay.style.display = 'none';
    }
    if (this.onChoiceSelect) {
      const cb = this.onChoiceSelect;
      this.onChoiceSelect = undefined;
      cb(choice);
    }
  }

  // -------------------------------------------------------------
  // Modals: Backlog, Inventory, Present (§2.2, §2.3)
  // -------------------------------------------------------------

  private showBacklogModal(): void {
    this.createModal('Dialogue Backlog (History)', (body) => {
      const scroll = document.createElement('div');
      scroll.style.cssText = 'max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 8px;';
      if (this.backlog.length === 0) {
        scroll.innerHTML = '<div style="color: #999;">No previous dialogues.</div>';
      } else {
        this.backlog.forEach((item) => {
          const entry = document.createElement('div');
          entry.style.cssText = 'padding: 8px 12px; background: rgba(255,255,255,0.05); border-radius: 6px;';
          entry.innerHTML = `
            <div style="font-weight: bold; color: #64b5f6; margin-bottom: 4px;">${item.speaker || 'Narrator'}</div>
            <div style="color: #eee; font-size: 14px;">${item.text}</div>
          `;
          scroll.appendChild(entry);
        });
      }
      body.appendChild(scroll);
    });
  }

  private showInventoryModal(): void {
    if (!this.ctx) return;
    const items = this.ctx.shell.state.items.avg;

    this.createModal('AVG Inventory (Items & Evidence)', (body) => {
      const list = document.createElement('div');
      list.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; max-height: 380px; overflow-y: auto;';

      if (items.length === 0) {
        list.innerHTML = '<div style="color: #999; grid-column: 1/-1;">Bag is empty.</div>';
      } else {
        items.forEach((item) => {
          const entity = this.ctx?.shell.getEntity(item.id);
          const facet = entity?.facets?.avg;
          const card = document.createElement('div');
          card.style.cssText = 'padding: 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;';
          card.innerHTML = `
            <div style="font-weight: bold; color: #ffb74d;">${entity?.base?.name || item.id} (x${item.count})</div>
            <div style="font-size: 12px; color: #90caf9; margin: 4px 0;">[${facet?.category?.toUpperCase() || item.category?.toUpperCase()}]</div>
            <div style="font-size: 13px; color: #ccc; margin-bottom: 8px;">${entity?.base?.desc || ''}</div>
          `;

          // If it's a gift and can be gifted
          if (facet?.category === 'gift') {
            const giftBtn = document.createElement('button');
            giftBtn.innerText = 'Give as Gift';
            giftBtn.style.cssText = 'padding: 4px 8px; font-size: 12px; background: #4caf50; border: none; border-radius: 4px; color: #fff; cursor: pointer;';
            giftBtn.onclick = () => {
              this.itemAdapter.useEffect?.(item.id, facet, this.ctx!);
              this.closeModal();
            };
            card.appendChild(giftBtn);
          }

          list.appendChild(card);
        });
      }
      body.appendChild(list);
    });
  }

  public showPresentModal(): void {
    if (!this.ctx) return;
    const items = this.ctx.shell.state.items.avg.filter((it) => it.count > 0);

    this.createModal('Present Item / Evidence (出示证物)', (body) => {
      const hint = document.createElement('div');
      hint.style.cssText = 'color: #ff9800; font-size: 13px; margin-bottom: 12px;';
      hint.innerText = `Presenting to: ${this.currentSpeakerName || 'Current Target'}. Select evidence to reveal truth or advance plot!`;
      body.appendChild(hint);

      const list = document.createElement('div');
      list.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; max-height: 350px; overflow-y: auto;';

      if (items.length === 0) {
        list.innerHTML = '<div style="color: #999; grid-column: 1/-1;">No items or evidence in bag to present.</div>';
      } else {
        items.forEach((item) => {
          const entity = this.ctx?.shell.getEntity(item.id);
          const facet: AvgItemFacet | undefined = entity?.facets?.avg;
          const card = document.createElement('div');
          card.style.cssText = 'padding: 10px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; cursor: pointer; transition: 0.2s;';
          card.onmouseenter = () => (card.style.borderColor = '#f44336');
          card.onmouseleave = () => (card.style.borderColor = 'rgba(255,255,255,0.2)');
          card.innerHTML = `
            <div style="font-weight: bold; color: #ffca28;">${entity?.base?.name || item.id}</div>
            <div style="font-size: 11px; color: #81d4fa;">${facet?.category || item.category}</div>
            <div style="font-size: 12px; color: #ddd; margin-top: 4px;">${entity?.base?.desc || ''}</div>
          `;

          card.onclick = () => {
            this.handlePresentItem(item.id, facet);
            this.closeModal();
          };
          list.appendChild(card);
        });
      }
      body.appendChild(list);
    });
  }

  private handlePresentItem(itemId: string, facet?: AvgItemFacet): void {
    if (!this.ctx) return;
    const targetNpc = this.currentSpeakerId;
    const reaction = this.itemAdapter.presentReaction?.(itemId, targetNpc);

    // If evidence unlocks flags
    if (facet?.unlockFlags && facet.unlockFlags.length > 0) {
      facet.unlockFlags.forEach((flag) => {
        this.ctx?.shell.setSwitch(flag, true);
      });
    }

    if (reaction?.text) {
      this.ctx.shell.playSe('confirm');
      this.handleShowText({
        characterId: targetNpc,
        characterName: this.currentSpeakerName,
        text: reaction.text,
        emotion: 'joy',
      });
    } else {
      // Default fallback reaction
      this.ctx.shell.playSe('blip');
      this.handleShowText({
        characterId: targetNpc,
        characterName: this.currentSpeakerName,
        text: `"...Showing me ${this.ctx.shell.getEntity(itemId)?.base.name || itemId}? What about it?"`,
        emotion: 'normal',
      });
    }

    this.ctx.shell.emit('avg.item_presented', { itemId, targetNpc, reaction });
  }

  private createModal(title: string, renderBody: (body: HTMLElement) => void): void {
    if (!this.rootElement) return;
    this.closeModal();

    const backdrop = document.createElement('div');
    backdrop.className = 'ese-avg-modal-backdrop';
    backdrop.style.cssText = `
      position: absolute; inset: 0; z-index: 50;
      background: rgba(0,0,0,0.65); backdrop-filter: blur(8px);
      display: flex; justify-content: center; align-items: center;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      width: 500px; max-width: 90%; background: #1a1e2d; border: 1px solid rgba(255,255,255,0.2);
      border-radius: 12px; padding: 20px; box-shadow: 0 12px 40px rgba(0,0,0,0.6);
      display: flex; flex-direction: column; color: #fff;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;';
    header.innerHTML = `<h3 style="margin: 0; font-size: 18px; color: #64b5f6;">${title}</h3>`;

    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✕';
    closeBtn.style.cssText = 'background: none; border: none; color: #bbb; font-size: 18px; cursor: pointer;';
    closeBtn.onclick = () => this.closeModal();
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.style.cssText = 'flex: 1;';
    renderBody(body);

    modal.append(header, body);
    backdrop.appendChild(modal);
    this.rootElement.appendChild(backdrop);
  }

  private closeModal(): void {
    if (!this.rootElement) return;
    const existing = this.rootElement.querySelector('.ese-avg-modal-backdrop');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }

  private clearTypingTimer(): void {
    if (this.typewriterTimer) {
      clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearTypingTimer();
    if (this.autoPlayTimer) {
      clearTimeout(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
    if (this.choiceTimer) {
      clearInterval(this.choiceTimer);
      this.choiceTimer = null;
    }
  }
}
