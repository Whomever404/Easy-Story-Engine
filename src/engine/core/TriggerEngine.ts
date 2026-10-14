import type { Trigger, CoreState, ComparisonOp, ItemDomain } from '../types';

export class TriggerEngine {
  public static compare(actual: any, op: ComparisonOp, expected: any): boolean {
    switch (op) {
      case '==':
        return actual == expected;
      case '!=':
        return actual != expected;
      case '>':
        return Number(actual) > Number(expected);
      case '>=':
        return Number(actual) >= Number(expected);
      case '<':
        return Number(actual) < Number(expected);
      case '<=':
        return Number(actual) <= Number(expected);
      default:
        return actual === expected;
    }
  }

  public static evaluate(trigger: Trigger, state: CoreState, currentModeId?: string): boolean {
    const isOr = trigger.logic === 'OR';

    const conditions: boolean[] = [];

    // Switches
    if (trigger.switches && trigger.switches.length > 0) {
      for (const sw of trigger.switches) {
        const val = !!state.switches[sw.key];
        conditions.push(val === sw.value);
      }
    }

    // Variables
    if (trigger.variables && trigger.variables.length > 0) {
      for (const v of trigger.variables) {
        const actual = state.variables[v.key];
        conditions.push(this.compare(actual, v.op, v.value));
      }
    }

    // Custom Globals (G[key])
    if (trigger.customGlobals && trigger.customGlobals.length > 0) {
      for (const g of trigger.customGlobals) {
        const actual = state.customGlobals[g.key];
        conditions.push(this.compare(actual, g.op, g.value));
      }
    }

    // Mode condition
    if (trigger.mode !== undefined) {
      conditions.push(currentModeId === trigger.mode);
    }

    // Items condition
    if (trigger.items && trigger.items.length > 0) {
      for (const itemCond of trigger.items) {
        const domain: ItemDomain = itemCond.domain || 'avg';
        const targetCount = itemCond.count ?? 1;
        let actualCount = 0;

        if (domain === 'avg') {
          const found = state.items.avg.find((it) => it.id === itemCond.id);
          actualCount = found ? found.count : 0;
        } else if (domain === 'rpg') {
          const found = state.items.rpg.find((it) => it.id === itemCond.id);
          actualCount = found ? found.count : 0;
        }

        conditions.push(actualCount >= targetCount);
      }
    }

    // Affection condition
    if (trigger.affection && trigger.affection.length > 0) {
      for (const aff of trigger.affection) {
        const val = state.affection[aff.characterId] ?? 0;
        let passed = true;
        if (aff.min !== undefined && val < aff.min) passed = false;
        if (aff.max !== undefined && val > aff.max) passed = false;
        conditions.push(passed);
      }
    }

    // Children triggers
    if (trigger.children && trigger.children.length > 0) {
      for (const child of trigger.children) {
        conditions.push(this.evaluate(child, state, currentModeId));
      }
    }

    if (conditions.length === 0) {
      return true;
    }

    if (isOr) {
      return conditions.some(Boolean);
    } else {
      return conditions.every(Boolean);
    }
  }
}
