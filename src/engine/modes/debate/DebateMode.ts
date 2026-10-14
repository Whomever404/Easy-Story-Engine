import type {
  GameModeModule,
  ModeContext,
  GameModeCapabilities,
  DebateScript,
  TestimonySentence,
  ItemAdapter,
} from '../../types';

export class DebateMode implements GameModeModule {
  public id = 'debate';
  public capabilities: GameModeCapabilities = {
    supportsOverlay: true,
    itemDomain: 'avg',
  };

  private ctx: ModeContext | null = null;
  private rootElement: HTMLElement | null = null;

  // Active debate script
  private currentDebateId: string = 'debate_01';
  private currentScript: DebateScript | null = null;
  private currentSentenceIndex: number = 0;
  private currentPressure: number = 100;
  private maxPressure: number = 100;
  private isShowingPressResponse: boolean = false;
  private pressResponseText: string = '';

  public itemAdapter: ItemAdapter = {
    canUse: () => false,
  };

  public onEnter(ctx: ModeContext): void {
    this.ctx = ctx;
    this.setupUI(ctx.container);
    this.loadDebate(ctx.data?.debateId || this.currentDebateId);
  }

  public onExit(_ctx: ModeContext): void {
    if (this.rootElement && this.rootElement.parentNode) {
      this.rootElement.parentNode.removeChild(this.rootElement);
    }
    this.rootElement = null;
    this.ctx = null;
  }

  public update(_dt: number): void {}

  public render(): void {}

  public serialize(): object {
    return {
      currentDebateId: this.currentDebateId,
      currentSentenceIndex: this.currentSentenceIndex,
      currentPressure: this.currentPressure,
    };
  }

  public deserialize(data: any): void {
    if (!data) return;
    this.currentDebateId = data.currentDebateId || 'debate_01';
    this.currentSentenceIndex = data.currentSentenceIndex || 0;
    this.currentPressure = data.currentPressure ?? 100;
    if (this.ctx) {
      this.loadDebate(this.currentDebateId);
    }
  }

  // -------------------------------------------------------------
  // UI Setup & Rendering
  // -------------------------------------------------------------

  private setupUI(container: HTMLElement): void {
    const root = document.createElement('div');
    root.className = 'ese-debate-viewport';
    root.style.cssText = `
      position: absolute; inset: 0; width: 100%; height: 100%;
      background: linear-gradient(180deg, #101420 0%, #1d233a 100%);
      display: flex; flex-direction: column; justify-content: space-between;
      padding: 24px; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      user-select: none; overflow: hidden;
    `;
    this.rootElement = root;

    // 1. Top Bar: Title & Pressure Bar (Health)
    const topBar = document.createElement('div');
    topBar.style.cssText = `
      display: flex; justify-content: space-between; align-items: center;
      background: rgba(18, 22, 36, 0.85); padding: 12px 20px;
      border: 1px solid rgba(255,255,255,0.12); border-radius: 10px;
    `;
    topBar.innerHTML = `
      <div>
        <span style="font-size: 13px; color: #ff9800; font-weight: bold; letter-spacing: 1px;">证言陈述与交叉质询</span>
        <h2 id="debate-title" style="margin: 4px 0 0 0; font-size: 20px; color: #64b5f6;">法庭辩论质询</h2>
      </div>
      <div style="width: 240px; text-align: right;">
        <div style="font-size: 13px; color: #eee; margin-bottom: 4px;">辩护信心 / 压制条</div>
        <div style="width: 100%; height: 10px; background: rgba(255,255,255,0.15); border-radius: 5px; overflow: hidden;">
          <div id="debate-pressure-bar" style="width: 100%; height: 100%; background: #4caf50; transition: width 0.3s ease, background-color 0.3s ease;"></div>
        </div>
      </div>
    `;
    root.appendChild(topBar);

    // 2. Middle: Witness Podium & Statement Area
    const middleSection = document.createElement('div');
    middleSection.style.cssText = 'flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;';

    const witnessBox = document.createElement('div');
    witnessBox.style.cssText = 'text-align: center; margin-bottom: 20px;';
    witnessBox.innerHTML = `
      <div style="font-size: 64px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));">🧑‍⚖️</div>
      <div id="debate-witness-name" style="font-weight: bold; color: #ffd54f; font-size: 18px; margin-top: 6px;">证人席</div>
    `;
    middleSection.appendChild(witnessBox);

    // Sentence Box
    const sentenceCard = document.createElement('div');
    sentenceCard.className = 'ese-debate-statement-card';
    sentenceCard.style.cssText = `
      width: 680px; max-width: 90%; background: rgba(24, 30, 48, 0.95);
      border: 2px solid #3d496e; border-radius: 12px; padding: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6); position: relative;
    `;
    sentenceCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 13px; color: #90caf9;">
        <span>陈述句 <span id="debate-sentence-num">1/5</span></span>
        <span id="debate-contradiction-indicator" style="display: none; color: #f44336; font-weight: bold;">[矛盾突破点]</span>
      </div>
      <div id="debate-sentence-text" style="font-size: 20px; line-height: 1.5; color: #fff; min-height: 60px;"></div>
    `;
    middleSection.appendChild(sentenceCard);
    root.appendChild(middleSection);

    // 3. Bottom: Control Buttons (Prev, Press, Present Evidence, Next)
    const bottomBar = document.createElement('div');
    bottomBar.style.cssText = 'display: flex; justify-content: center; gap: 16px; padding: 12px 0;';

    const navBtnStyle = 'padding: 12px 24px; font-size: 15px; font-weight: bold; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(30, 36, 56, 0.9); color: #fff; cursor: pointer; transition: 0.2s;';

    const prevBtn = document.createElement('button');
    prevBtn.innerText = '◀ 上一句证词';
    prevBtn.style.cssText = navBtnStyle;
    prevBtn.onclick = () => this.navigateSentence(-1);

    const pressBtn = document.createElement('button');
    pressBtn.innerText = '等一下！追问 (HOLD IT!)';
    pressBtn.style.cssText = navBtnStyle + 'background: #0288d1; border-color: #29b6f6;';
    pressBtn.onclick = () => this.pressCurrentSentence();

    const presentBtn = document.createElement('button');
    presentBtn.innerText = '异议！出示证物 (OBJECTION!)';
    presentBtn.style.cssText = navBtnStyle + 'background: #d32f2f; border-color: #f44336; font-size: 16px;';
    presentBtn.onclick = () => this.openEvidenceModal();

    const nextBtn = document.createElement('button');
    nextBtn.innerText = '下一句证词 ▶';
    nextBtn.style.cssText = navBtnStyle;
    nextBtn.onclick = () => this.navigateSentence(1);

    bottomBar.append(prevBtn, pressBtn, presentBtn, nextBtn);
    root.appendChild(bottomBar);

    container.appendChild(root);
  }

  // -------------------------------------------------------------
  // Debate Execution & Navigation (§5)
  // -------------------------------------------------------------

  public loadDebate(debateId: string): void {
    this.currentDebateId = debateId;
    let script: DebateScript | undefined = this.ctx?.shell.projectData.debates[debateId];

    if (!script) {
      // Default demo debate
      script = {
        id: debateId,
        title: 'The Stolen Artifact Testimony',
        witnessId: 'suspect',
        penalty: 25,
        maxPressure: 100,
        sentences: [
          {
            id: 's1',
            speakerId: 'suspect',
            text: 'I was sitting in the coffee shop from 8 PM until 10 PM yesterday evening.',
            pressResponseText: 'Are you certain of that time? Yes, I looked at the coffee shop wall clock multiple times.',
          },
          {
            id: 's2',
            speakerId: 'suspect',
            text: 'The weather was completely clear outside, not a single drop of rain.',
            pressResponseText: 'I remember looking out the large window; the pavement was completely dry.',
          },
          {
            id: 's3',
            speakerId: 'suspect',
            text: 'I definitely did not carry an umbrella with me at any point.',
            contradictionEvidenceId: 'wet_umbrella',
            pressResponseText: "Why would I need an umbrella when it wasn't raining at all?",
            breakthroughStoryLabel: 'debate_victory',
          },
          {
            id: 's4',
            speakerId: 'suspect',
            text: 'I went straight back home on my bicycle afterwards.',
            pressResponseText: 'My bicycle was parked right in front of the café door.',
          },
        ],
      };
    }

    this.currentScript = script;
    this.maxPressure = script.maxPressure || 100;
    this.currentPressure = Math.min(this.currentPressure, this.maxPressure);
    this.currentSentenceIndex = 0;
    this.isShowingPressResponse = false;

    this.updateUI();
  }

  private updateUI(): void {
    if (!this.rootElement || !this.currentScript) return;

    const titleEl = this.rootElement.querySelector('#debate-title');
    if (titleEl) titleEl.textContent = this.currentScript.title;

    const witnessEl = this.rootElement.querySelector('#debate-witness-name');
    if (witnessEl) {
      const char = this.ctx?.shell.getCharacter(this.currentScript.witnessId);
      witnessEl.textContent = char?.name || this.currentScript.witnessId;
    }

    const sentences = this.currentScript.sentences;
    const cur = sentences[this.currentSentenceIndex];

    const numEl = this.rootElement.querySelector('#debate-sentence-num');
    if (numEl) numEl.textContent = `${this.currentSentenceIndex + 1} / ${sentences.length}`;

    const textEl = this.rootElement.querySelector('#debate-sentence-text');
    if (textEl && cur) {
      textEl.textContent = this.isShowingPressResponse ? `[Testimony Follow-up]: ${this.pressResponseText}` : cur.text;
    }

    const barEl = this.rootElement.querySelector('#debate-pressure-bar') as HTMLElement;
    if (barEl) {
      const pct = Math.max(0, (this.currentPressure / this.maxPressure) * 100);
      barEl.style.width = `${pct}%`;
      barEl.style.backgroundColor = pct > 50 ? '#4caf50' : pct > 25 ? '#ff9800' : '#f44336';
    }
  }

  public navigateSentence(delta: number): void {
    if (!this.currentScript) return;
    this.isShowingPressResponse = false;
    const total = this.currentScript.sentences.length;
    this.currentSentenceIndex = (this.currentSentenceIndex + delta + total) % total;
    this.ctx?.shell.playSe('cursor');
    this.updateUI();
  }

  public pressCurrentSentence(): void {
    if (!this.currentScript) return;
    const cur = this.currentScript.sentences[this.currentSentenceIndex];
    if (!cur) return;

    this.ctx?.shell.playSe('confirm');
    this.showObjectionFlash('HOLD IT!', '#0288d1');

    this.isShowingPressResponse = true;
    this.pressResponseText = cur.pressResponseText || 'Witness has nothing further to add.';
    this.updateUI();
  }

  // -------------------------------------------------------------
  // Evidence Present & Breakthrough (§5)
  // -------------------------------------------------------------

  private openEvidenceModal(): void {
    if (!this.ctx || !this.rootElement) return;
    const items = this.ctx.shell.state.items.avg.filter((it) => it.count > 0);

    const backdrop = document.createElement('div');
    backdrop.className = 'ese-debate-evidence-modal';
    backdrop.style.cssText = `
      position: absolute; inset: 0; z-index: 50;
      background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);
      display: flex; justify-content: center; align-items: center; color: #fff;
    `;

    const box = document.createElement('div');
    box.style.cssText = 'background: #191f33; border: 2px solid #f44336; border-radius: 12px; width: 500px; max-width: 90%; padding: 20px;';
    box.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
        <h3 style="margin: 0; color: #f44336;">选择证物出示 (出示证物)</h3>
        <button id="close-evidence-modal" style="background: none; border: none; color: #aaa; font-size: 18px; cursor: pointer;">✕</button>
      </div>
      <div id="evidence-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; max-height: 320px; overflow-y: auto;"></div>
    `;

    const list = box.querySelector('#evidence-list')!;
    if (items.length === 0) {
      list.innerHTML = '<div style="color: #999; grid-column: 1/-1;">法庭纪录为空，当前未持有任何可出示的证物！</div>';
    } else {
      items.forEach((it) => {
        const entity = this.ctx?.shell.getEntity(it.id);
        const card = document.createElement('div');
        card.style.cssText = `
          padding: 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15);
          border-radius: 8px; cursor: pointer; transition: 0.2s;
        `;
        card.onmouseenter = () => (card.style.borderColor = '#f44336');
        card.onmouseleave = () => (card.style.borderColor = 'rgba(255,255,255,0.15)');
        card.innerHTML = `
          <div style="font-weight: bold; color: #ffd54f;">${entity?.base?.name || it.id}</div>
          <div style="font-size: 11px; color: #64b5f6; margin: 2px 0;">[证物]</div>
          <div style="font-size: 12px; color: #ddd;">${entity?.base?.desc || ''}</div>
        `;
        card.onclick = () => {
          backdrop.remove();
          this.presentEvidence(it.id);
        };
        list.appendChild(card);
      });
    }

    box.querySelector('#close-evidence-modal')?.addEventListener('click', () => {
      backdrop.remove();
    });

    backdrop.appendChild(box);
    this.rootElement.appendChild(backdrop);
  }

  private presentEvidence(evidenceId: string): void {
    if (!this.currentScript || !this.ctx) return;
    const curSentence = this.currentScript.sentences[this.currentSentenceIndex];

    this.showObjectionFlash('OBJECTION!', '#d32f2f');

    if (curSentence && curSentence.contradictionEvidenceId === evidenceId) {
      // Correct! Breakthrough!
      this.ctx.shell.playSe('breakthrough');
      setTimeout(() => {
        this.handleBreakthrough(curSentence);
      }, 700);
    } else {
      // Wrong evidence presented on this sentence
      this.ctx.shell.playSe('buzzer');
      const penalty = this.currentScript.penalty || 25;
      this.currentPressure = Math.max(0, this.currentPressure - penalty);
      this.updateUI();

      if (this.currentPressure <= 0) {
        setTimeout(() => {
          this.handleDebateDefeat();
        }, 600);
      }
    }
  }

  private handleBreakthrough(sentence: TestimonySentence): void {
    if (!this.ctx) return;
    this.ctx.shell.unlockAchievement('ach_first_contradiction');

    if (sentence.breakthroughStoryLabel) {
      this.ctx.shell.jumpToLabel(sentence.breakthroughStoryLabel);
    } else if (sentence.breakthroughEventId && this.ctx.shell.projectData.commonEvents[sentence.breakthroughEventId]) {
      this.ctx.shell.executeCommands(this.ctx.shell.projectData.commonEvents[sentence.breakthroughEventId].commands);
    } else {
      // Default victory jump
      if (this.currentScript?.onVictoryEvent) {
        this.ctx.shell.jumpToLabel(this.currentScript.onVictoryEvent);
      } else {
        this.ctx.shell.switchMode('avg');
      }
    }
  }

  private handleDebateDefeat(): void {
    if (!this.ctx) return;
    if (this.currentScript?.onDefeatEvent) {
      this.ctx.shell.jumpToLabel(this.currentScript.onDefeatEvent);
    } else {
      alert('The testimony could not be unraveled. Court adjourned.');
      this.ctx.shell.switchMode('avg');
    }
  }

  private showObjectionFlash(text: string, color: string): void {
    if (!this.rootElement) return;
    const banner = document.createElement('div');
    banner.style.cssText = `
      position: absolute; inset: 0; z-index: 100;
      background: ${color}; display: flex; justify-content: center; align-items: center;
      font-size: 54px; font-weight: 900; font-style: italic; color: #fff;
      letter-spacing: 4px; text-shadow: 0 6px 20px rgba(0,0,0,0.8);
      pointer-events: none; animation: flash-fade 0.7s forwards;
    `;
    banner.innerText = text;
    this.rootElement.appendChild(banner);

    setTimeout(() => {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, 700);
  }
}
