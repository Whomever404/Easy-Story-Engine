import type {
  EngineShell,
  MessageScript,
  MessageItem,
  ReplyOption,
  ConversationThread,
} from '../types';
import { TextParser } from '../interpreter/CommandInterpreter';

export class PhoneMessagingSystem {
  private shell: EngineShell;
  private container: HTMLElement;
  private rootElement: HTMLElement | null = null;
  private isOpen: boolean = false;
  private activeThreadId: string | null = null;

  constructor(shell: EngineShell, container: HTMLElement) {
    this.shell = shell;
    this.container = container;
    this.setupUI();
    this.registerEvents();
  }

  private registerEvents(): void {
    this.shell.on('check_messages', () => {
      this.checkTriggers();
    });

    this.shell.on('phone.trigger_script', (data: any) => {
      if (data?.scriptId) {
        this.deliverScript(data.scriptId);
      }
    });

    this.shell.on('overlay.phone.toggle', (data: any) => {
      this.toggle(data?.show);
    });
  }

  // -------------------------------------------------------------
  // Data-Driven Triggers & Delivery (§4.8.1)
  // -------------------------------------------------------------

  public checkTriggers(): void {
    const scripts = this.shell.projectData.messages;
    if (!scripts) return;

    const state = this.shell.state.msgState;
    const now = Date.now();

    for (const [scriptId, script] of Object.entries(scripts)) {
      // 1. Check trigger once
      if (script.triggerOnce && state.lastTriggerTimes[scriptId]) {
        continue;
      }

      // 2. Check cooldown
      if (script.cooldownSec && state.lastTriggerTimes[scriptId]) {
        const elapsed = (now - state.lastTriggerTimes[scriptId]) / 1000;
        if (elapsed < script.cooldownSec) continue;
      }

      // 3. Check prerequisite read messages
      if (script.requiredReadMessageIds && script.requiredReadMessageIds.length > 0) {
        const allRead = script.requiredReadMessageIds.every((id) => state.readMessageIds.includes(id));
        if (!allRead) continue;
      }

      // 4. Evaluate trigger
      if (this.shell.evaluateTrigger(script.trigger)) {
        this.deliverScript(scriptId);
      }
    }
  }

  public deliverScript(scriptId: string): void {
    const script: MessageScript | undefined = this.shell.projectData.messages[scriptId];
    if (!script) return;

    const state = this.shell.state.msgState;
    state.lastTriggerTimes[scriptId] = Date.now();

    const charId = script.characterId;
    const char = this.shell.getCharacter(charId);
    const title = char?.name || charId;

    if (!state.threads[charId]) {
      state.threads[charId] = {
        id: charId,
        characterId: charId,
        title,
        avatar: char?.sprites?.face?.normal,
        unreadCount: 0,
        messages: [],
      };
    }

    const thread = state.threads[charId];

    for (const rawMsg of script.messages) {
      const msg: MessageItem = {
        ...rawMsg,
        timestamp: Date.now(),
        content: TextParser.interpolate(rawMsg.content, this.shell),
      };

      thread.messages.push(msg);
      thread.unreadCount++;

      // Unlock gallery if attached
      if (msg.unlockGalleryId) {
        this.shell.unlockGallery(msg.unlockGalleryId);
      }

      // Show toast notification
      this.showToastNotification(title, msg.content);
      this.shell.playSe('blip');
    }

    this.updateBadge();
    if (this.isOpen) {
      this.renderThreadList();
      if (this.activeThreadId === charId) {
        this.renderActiveChat();
      }
    }
  }

  // -------------------------------------------------------------
  // Reply Handling (§4.8.3)
  // -------------------------------------------------------------

  public sendReply(threadId: string, reply: ReplyOption): void {
    const state = this.shell.state.msgState;
    const thread = state.threads[threadId];
    if (!thread) return;

    // Add player message
    thread.messages.push({
      id: `reply_${Date.now()}`,
      senderId: 'player',
      type: 'text',
      content: reply.text,
      timestamp: Date.now(),
    });

    state.repliedMessageIds.push(reply.id);

    // Apply affection change
    if (reply.affectionDelta) {
      this.shell.changeAffection(reply.affectionDelta.characterId, reply.affectionDelta.delta);
    }

    // Execute event commands
    if (reply.eventCommands && reply.eventCommands.length > 0) {
      this.shell.executeCommands(reply.eventCommands);
    }

    this.shell.playSe('confirm');

    // Chain next message if defined
    if (reply.nextMessageId && this.shell.projectData.messages[reply.nextMessageId]) {
      setTimeout(() => {
        this.deliverScript(reply.nextMessageId!);
      }, 800);
    }

    this.renderActiveChat();
  }

  // -------------------------------------------------------------
  // UI & Overlay (§4.8, §4.5.4)
  // -------------------------------------------------------------

  private setupUI(): void {
    // 1. Toast Notification Element
    const toast = document.createElement('div');
    toast.className = 'ese-phone-toast';
    toast.style.cssText = `
      position: absolute; top: 18px; right: 20px; z-index: 900;
      background: rgba(18, 22, 36, 0.92); border: 1px solid #42a5f5;
      border-radius: 10px; padding: 12px 18px; color: #fff;
      display: none; align-items: center; gap: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5); backdrop-filter: blur(8px);
      cursor: pointer; max-width: 320px; animation: slide-in 0.3s ease;
    `;
    toast.onclick = () => {
      this.toggle(true);
      toast.style.display = 'none';
    };
    this.container.appendChild(toast);

    // 2. Phone Floating Open Button (bottom right)
    const floatBtn = document.createElement('button');
    floatBtn.className = 'ese-phone-float-btn';
    floatBtn.style.cssText = `
      position: absolute; bottom: 20px; right: 20px; z-index: 100;
      width: 52px; height: 52px; border-radius: 50%;
      background: linear-gradient(135deg, #2196f3, #1565c0);
      border: 2px solid rgba(255,255,255,0.4); box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      color: #fff; font-size: 22px; cursor: pointer; display: flex;
      justify-content: center; align-items: center; transition: transform 0.2s;
    `;
    floatBtn.innerHTML = '📱<span class="phone-badge" style="position: absolute; top: -4px; right: -4px; background: #f44336; color: #fff; border-radius: 10px; padding: 2px 6px; font-size: 11px; font-weight: bold; display: none;">0</span>';
    floatBtn.onclick = () => this.toggle();
    this.container.appendChild(floatBtn);

    // 3. Simulated Phone Window
    const phone = document.createElement('div');
    phone.className = 'ese-phone-window';
    phone.style.cssText = `
      position: absolute; top: 50%; right: 40px; transform: translateY(-50%);
      width: 360px; height: 600px; max-height: 85vh; z-index: 950;
      background: #111420; border: 3px solid #2d3753; border-radius: 28px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.8); display: none; flex-direction: column;
      overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    // Phone Top Header (Notch / Speaker)
    phone.innerHTML = `
      <div style="background: #181d2e; padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; color: #fff;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="phone-back-btn" style="background: none; border: none; color: #64b5f6; font-size: 18px; cursor: pointer; display: none;">◀</button>
          <span id="phone-header-title" style="font-weight: bold; font-size: 16px;">手机短信</span>
        </div>
        <button id="phone-close-btn" style="background: none; border: none; color: #aaa; font-size: 18px; cursor: pointer;">✕</button>
      </div>
      <div id="phone-body" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;"></div>
    `;

    phone.querySelector('#phone-close-btn')?.addEventListener('click', () => this.toggle(false));
    phone.querySelector('#phone-back-btn')?.addEventListener('click', () => {
      this.activeThreadId = null;
      this.renderThreadList();
    });

    this.rootElement = phone;
    this.container.appendChild(phone);
  }

  public toggle(show?: boolean): void {
    if (!this.rootElement) return;
    this.isOpen = show !== undefined ? show : !this.isOpen;
    this.rootElement.style.display = this.isOpen ? 'flex' : 'none';

    if (this.isOpen) {
      if (this.activeThreadId) {
        this.renderActiveChat();
      } else {
        this.renderThreadList();
      }
    }
  }

  private showToastNotification(sender: string, text: string): void {
    const toast = this.container.querySelector('.ese-phone-toast') as HTMLElement;
    if (!toast) return;

    toast.innerHTML = `
      <div style="font-size: 24px;">💬</div>
      <div>
        <div style="font-weight: bold; color: #64b5f6; font-size: 13px;">${sender}</div>
        <div style="font-size: 12px; color: #eee; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;">${text}</div>
      </div>
    `;
    toast.style.display = 'flex';

    setTimeout(() => {
      toast.style.display = 'none';
    }, 4500);
  }

  private updateBadge(): void {
    const badge = this.container.querySelector('.phone-badge') as HTMLElement;
    if (!badge) return;

    let unread = 0;
    for (const t of Object.values(this.shell.state.msgState.threads)) {
      unread += t.unreadCount;
    }

    if (unread > 0) {
      badge.textContent = String(unread);
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }

  private renderThreadList(): void {
    if (!this.rootElement) return;
    const body = this.rootElement.querySelector('#phone-body') as HTMLElement;
    const backBtn = this.rootElement.querySelector('#phone-back-btn') as HTMLElement;
    const title = this.rootElement.querySelector('#phone-header-title') as HTMLElement;

    if (backBtn) backBtn.style.display = 'none';
    if (title) title.textContent = '手机短信';

    const threads = Object.values(this.shell.state.msgState.threads);
    body.innerHTML = '';

    const list = document.createElement('div');
    list.style.cssText = 'flex: 1; overflow-y: auto; display: flex; flex-direction: column;';

    if (threads.length === 0) {
      list.innerHTML = '<div style="color: #777; padding: 40px; text-align: center;">暂无短信消息。</div>';
    } else {
      threads.forEach((t) => {
        const item = document.createElement('div');
        item.style.cssText = `
          padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex; align-items: center; gap: 12px; cursor: pointer; transition: background 0.2s;
        `;
        item.onmouseenter = () => (item.style.background = 'rgba(255,255,255,0.05)');
        item.onmouseleave = () => (item.style.background = 'transparent)');

        const lastMsg = t.messages[t.messages.length - 1]?.content || '';
        item.innerHTML = `
          <div style="width: 44px; height: 44px; border-radius: 50%; background: #283593; display: flex; justify-content: center; align-items: center; font-size: 20px;">👤</div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: 600; color: #fff; font-size: 15px;">${t.title}</span>
              ${t.unreadCount > 0 ? `<span style="background: #f44336; color: #fff; font-size: 10px; font-weight: bold; border-radius: 10px; padding: 2px 6px;">${t.unreadCount}</span>` : ''}
            </div>
            <div style="color: #aaa; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 4px;">${lastMsg}</div>
          </div>
        `;

        item.onclick = () => {
          this.activeThreadId = t.id;
          t.unreadCount = 0;
          this.updateBadge();
          this.renderActiveChat();
        };

        list.appendChild(item);
      });
    }

    body.appendChild(list);
  }

  private renderActiveChat(): void {
    if (!this.rootElement || !this.activeThreadId) return;
    const body = this.rootElement.querySelector('#phone-body') as HTMLElement;
    const backBtn = this.rootElement.querySelector('#phone-back-btn') as HTMLElement;
    const title = this.rootElement.querySelector('#phone-header-title') as HTMLElement;

    const thread = this.shell.state.msgState.threads[this.activeThreadId];
    if (!thread) return;

    if (backBtn) backBtn.style.display = 'inline-block';
    if (title) title.textContent = thread.title;

    body.innerHTML = `
      <div id="phone-chat-scroll" style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px;"></div>
      <div id="phone-reply-bar" style="border-top: 1px solid rgba(255,255,255,0.1); background: #181d2e; padding: 10px; display: flex; flex-direction: column; gap: 8px;"></div>
    `;

    const chatScroll = body.querySelector('#phone-chat-scroll')!;
    const replyBar = body.querySelector('#phone-reply-bar')!;

    thread.messages.forEach((msg) => {
      const isPlayer = msg.senderId === 'player';
      const bubble = document.createElement('div');
      bubble.style.cssText = `
        max-width: 75%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.4;
        ${isPlayer ? 'align-self: flex-end; background: #1976d2; color: #fff; border-bottom-right-radius: 4px;' : 'align-self: flex-start; background: #283149; color: #eee; border-bottom-left-radius: 4px;'}
      `;
      bubble.textContent = msg.content;
      chatScroll.appendChild(bubble);
    });

    // Mark messages as read
    thread.messages.forEach((m) => {
      if (!this.shell.state.msgState.readMessageIds.includes(m.id)) {
        this.shell.state.msgState.readMessageIds.push(m.id);
      }
    });

    // Check if the last message has unreplied options
    const lastMsg = thread.messages[thread.messages.length - 1];
    if (lastMsg && lastMsg.replies && lastMsg.replies.length > 0) {
      lastMsg.replies.forEach((rep) => {
        const btn = document.createElement('button');
        btn.innerText = rep.text;
        btn.style.cssText = 'background: rgba(33, 150, 243, 0.2); border: 1px solid #2196f3; color: #64b5f6; padding: 8px 12px; border-radius: 6px; font-size: 13px; text-align: left; cursor: pointer; transition: 0.2s;';
        btn.onclick = () => this.sendReply(thread.id, rep);
        replyBar.appendChild(btn);
      });
    }

    setTimeout(() => {
      chatScroll.scrollTop = chatScroll.scrollHeight;
    }, 50);
  }
}
