import type { CharacterData, ProjectData } from '../engine/types';

export interface ValidationError {
  type: 'error' | 'warning';
  field: string;
  message: string;
}

export class ProjectValidator {
  /**
   * §4.12 角色立绘系统（强制表情集约束）
   * 只要添加了 portrait 或 face 中任意一组，就必须完整提供"喜怒哀乐"四套表情 (normal, joy, anger, sorrow)。
   */
  public static validateCharacterEmotions(char: CharacterData): ValidationError[] {
    const errors: ValidationError[] = [];
    const baseEmotions = ['normal', 'joy', 'anger', 'sorrow'] as const;

    if (char.sprites?.portrait) {
      for (const emotion of baseEmotions) {
        if (!char.sprites.portrait[emotion]) {
          errors.push({
            type: 'error',
            field: `characters.${char.id}.sprites.portrait.${emotion}`,
            message: `Character "${char.name}" (${char.id}) has portrait set, but is missing required base emotion: "${emotion}". (喜怒哀乐必须完整)`,
          });
        }
      }
    }

    if (char.sprites?.face) {
      for (const emotion of baseEmotions) {
        if (!char.sprites.face[emotion]) {
          errors.push({
            type: 'error',
            field: `characters.${char.id}.sprites.face.${emotion}`,
            message: `Character "${char.name}" (${char.id}) has face icons set, but is missing required base emotion: "${emotion}". (喜怒哀乐必须完整)`,
          });
        }
      }
    }

    return errors;
  }

  public static validateProject(data: ProjectData): ValidationError[] {
    const errors: ValidationError[] = [];

    // 1. Validate manifest and system start mode
    if (!data.manifest) {
      errors.push({ type: 'error', field: 'manifest', message: 'Missing project manifest.json' });
    } else {
      if (data.manifest.format !== 'esproj') {
        errors.push({ type: 'error', field: 'manifest.format', message: 'Manifest format must be "esproj"' });
      }
      if (!data.manifest.startMode) {
        errors.push({ type: 'error', field: 'manifest.startMode', message: 'Manifest startMode cannot be empty' });
      } else if (!data.manifest.modes.includes(data.manifest.startMode)) {
        errors.push({
          type: 'error',
          field: 'manifest.startMode',
          message: `startMode "${data.manifest.startMode}" is not registered in enabled modes list: [${data.manifest.modes.join(', ')}]`,
        });
      }
    }

    // 2. Validate all characters emotions (§4.12)
    if (data.characters) {
      for (const char of Object.values(data.characters)) {
        errors.push(...this.validateCharacterEmotions(char));
      }
    }

    return errors;
  }
}
