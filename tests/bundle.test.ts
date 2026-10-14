import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Bundle.js & index.html execution for file:// protocol', () => {
  it('loads bundle.js and mounts WebEditor on #app', () => {
    const bundlePath = path.resolve(__dirname, '../bundle.js');
    expect(fs.existsSync(bundlePath)).toBe(true);

    const bundleCode = fs.readFileSync(bundlePath, 'utf-8');

    // Create container matching index.html
    document.body.innerHTML = '<div id="app"></div>';

    // Execute bundle code in this window
    window.eval(bundleCode);

    const app = document.getElementById('app');
    expect(app).not.toBeNull();
    // Verify WebEditor was mounted
    expect(app!.innerHTML).toContain('ese-web-editor-app');
    expect(app!.textContent).toContain('EASY STORY ENGINE');
    expect(app!.textContent).toContain('Flowchart');
    expect(app!.textContent).toContain('Playtest');
  });
});
