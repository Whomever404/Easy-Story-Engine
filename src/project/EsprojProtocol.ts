import JSZip from 'jszip';
import type { ProjectData, ProjectManifest } from '../engine/types';
import { ProjectValidator } from './Validation';

export const CURRENT_ESPROJ_VERSION = 3;

export class EsprojProtocol {
  /**
   * Deconstructs ProjectData into directory JSON files as specified in §4.16.2
   */
  public static exportToDirectoryMap(data: ProjectData): Record<string, string> {
    const files: Record<string, string> = {};

    // 1. manifest.json (§4.16.3)
    const manifest: ProjectManifest = {
      ...data.manifest,
      format: 'esproj',
      formatVersion: CURRENT_ESPROJ_VERSION,
      modified: Date.now(),
    };
    files['manifest.json'] = JSON.stringify(manifest, null, 2);

    // 2. data/
    files['data/system.json'] = JSON.stringify(data.system, null, 2);
    files['data/characters.json'] = JSON.stringify(data.characters, null, 2);
    files['data/globals.json'] = JSON.stringify(data.globals, null, 2);
    files['data/triggers.json'] = JSON.stringify(data.triggers, null, 2);
    files['data/achievements.json'] = JSON.stringify(data.achievements, null, 2);
    files['data/messages.json'] = JSON.stringify(data.messages, null, 2);
    files['data/title.json'] = JSON.stringify(data.title, null, 2);

    // data/database/
    files['data/database/entities.json'] = JSON.stringify(data.entities, null, 2);

    // data/story/
    if (data.storyGraphs) {
      for (const [id, graph] of Object.entries(data.storyGraphs)) {
        files[`data/story/${id}.graph.json`] = JSON.stringify(graph, null, 2);
      }
    }

    // data/events/
    if (data.commonEvents) {
      for (const [id, event] of Object.entries(data.commonEvents)) {
        files[`data/events/${id}.json`] = JSON.stringify(event, null, 2);
      }
    }

    // data/maps/
    if (data.maps) {
      for (const [id, map] of Object.entries(data.maps)) {
        files[`data/maps/${id}.json`] = JSON.stringify(map, null, 2);
      }
    }

    // data/modes/
    if (data.debates) {
      for (const [id, debate] of Object.entries(data.debates)) {
        files[`data/modes/debate_${id}.json`] = JSON.stringify(debate, null, 2);
      }
    }

    // 3. assets/ & plugins/
    files['assets/index.json'] = JSON.stringify(data.assets || {}, null, 2);
    files['plugins/index.json'] = JSON.stringify(data.plugins || [], null, 2);

    return files;
  }

  /**
   * Reconstructs ProjectData from directory JSON files (§4.16.2)
   */
  public static importFromDirectoryMap(files: Record<string, string>): ProjectData {
    if (!files['manifest.json']) {
      throw new Error('Invalid project directory: manifest.json is missing');
    }

    let manifest = JSON.parse(files['manifest.json']) as ProjectManifest;
    if (manifest.formatVersion < CURRENT_ESPROJ_VERSION) {
      manifest = this.migrateManifest(manifest);
    }

    const system = files['data/system.json'] ? JSON.parse(files['data/system.json']) : { startMode: manifest.startMode, startEvent: manifest.startEvent };
    const characters = files['data/characters.json'] ? JSON.parse(files['data/characters.json']) : {};
    const globals = files['data/globals.json'] ? JSON.parse(files['data/globals.json']) : [];
    const triggers = files['data/triggers.json'] ? JSON.parse(files['data/triggers.json']) : {};
    const achievements = files['data/achievements.json'] ? JSON.parse(files['data/achievements.json']) : {};
    const messages = files['data/messages.json'] ? JSON.parse(files['data/messages.json']) : {};
    const title = files['data/title.json'] ? JSON.parse(files['data/title.json']) : { titleText: 'My Game', buttons: [] };

    const entities = files['data/database/entities.json'] ? JSON.parse(files['data/database/entities.json']) : {};

    const storyGraphs: Record<string, any> = {};
    const commonEvents: Record<string, any> = {};
    const maps: Record<string, any> = {};
    const debates: Record<string, any> = {};

    for (const [path, content] of Object.entries(files)) {
      if (path.startsWith('data/story/') && path.endsWith('.json')) {
        const id = path.replace('data/story/', '').replace('.graph.json', '').replace('.json', '');
        storyGraphs[id] = JSON.parse(content);
      } else if (path.startsWith('data/events/') && path.endsWith('.json')) {
        const id = path.replace('data/events/', '').replace('.json', '');
        commonEvents[id] = JSON.parse(content);
      } else if (path.startsWith('data/maps/') && path.endsWith('.json')) {
        const id = path.replace('data/maps/', '').replace('.json', '');
        maps[id] = JSON.parse(content);
      } else if (path.startsWith('data/modes/debate_') && path.endsWith('.json')) {
        const id = path.replace('data/modes/debate_', '').replace('.json', '');
        debates[id] = JSON.parse(content);
      }
    }

    const assets = files['assets/index.json'] ? JSON.parse(files['assets/index.json']) : {};
    const plugins = files['plugins/index.json'] ? JSON.parse(files['plugins/index.json']) : [];

    const project: ProjectData = {
      manifest,
      system,
      characters,
      entities,
      globals,
      triggers,
      achievements,
      messages,
      storyGraphs,
      commonEvents,
      maps,
      debates,
      title,
      assets,
      plugins,
    };

    return project;
  }

  /**
   * Packages project into a single .esproj ZIP file (§4.16.1)
   */
  public static async exportToZip(
    data: ProjectData,
    binaryAssets?: Record<string, Uint8Array | string>
  ): Promise<Uint8Array> {
    const validationErrors = ProjectValidator.validateProject(data);
    const criticalErrors = validationErrors.filter((e) => e.type === 'error');
    if (criticalErrors.length > 0) {
      console.warn('[EsprojProtocol] Validation warnings/errors before export:', criticalErrors);
    }

    const zip = new JSZip();
    const directoryMap = this.exportToDirectoryMap(data);

    for (const [filePath, content] of Object.entries(directoryMap)) {
      zip.file(filePath, content);
    }

    if (binaryAssets) {
      for (const [assetPath, raw] of Object.entries(binaryAssets)) {
        zip.file(assetPath, raw);
      }
    }

    const output = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return output;
  }

  /**
   * Unpacks a .esproj ZIP container into ProjectData (§4.16.1)
   */
  public static async importFromZip(
    zipData: ArrayBuffer | Uint8Array
  ): Promise<{ project: ProjectData; assets: Record<string, Uint8Array> }> {
    const zip = await JSZip.loadAsync(zipData);
    const fileMap: Record<string, string> = {};
    const assetMap: Record<string, Uint8Array> = {};

    for (const [filename, fileObj] of Object.entries(zip.files)) {
      if (fileObj.dir) continue;

      if (filename.endsWith('.json')) {
        const text = await fileObj.async('text');
        fileMap[filename] = text;
      } else {
        const binary = await fileObj.async('uint8array');
        assetMap[filename] = binary;
      }
    }

    const project = this.importFromDirectoryMap(fileMap);
    return { project, assets: assetMap };
  }

  private static migrateManifest(m: ProjectManifest): ProjectManifest {
    m.formatVersion = CURRENT_ESPROJ_VERSION;
    return m;
  }
}
