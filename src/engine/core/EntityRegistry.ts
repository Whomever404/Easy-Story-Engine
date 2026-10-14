import type { Entity, AvgItemFacet, RpgItemFacet, DebateEvidenceFacet } from '../types';

export class EntityRegistry {
  private entities: Map<string, Entity> = new Map();
  // Set of `${entityId}:${modeId}` representing which facets have been revealed in the story
  private revealedFacets: Set<string> = new Set();

  constructor(initialEntities?: Record<string, Entity>) {
    if (initialEntities) {
      for (const [id, entity] of Object.entries(initialEntities)) {
        this.registerEntity(entity);
      }
    }
  }

  public registerEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);
    // By default, if an entity has a facet, is it revealed?
    // According to §4.5.5, items can start with default revealed facets or be revealed via revealFacet.
    // If not explicitly restricted, we reveal existing facets on initialization.
    if (entity.facets.avg) this.revealedFacets.add(`${entity.id}:avg`);
    if (entity.facets.rpg) this.revealedFacets.add(`${entity.id}:rpg`);
    if (entity.facets.debate) this.revealedFacets.add(`${entity.id}:debate`);
  }

  public getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  public getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  public revealFacet(entityId: string, modeId: string): void {
    this.revealedFacets.add(`${entityId}:${modeId}`);
  }

  public isFacetRevealed(entityId: string, modeId: string): boolean {
    return this.revealedFacets.has(`${entityId}:${modeId}`);
  }

  public getAvgFacet(entityId: string): AvgItemFacet | null {
    const entity = this.entities.get(entityId);
    if (!entity || !entity.facets.avg) return null;
    return entity.facets.avg;
  }

  public getRpgFacet(entityId: string): RpgItemFacet | null {
    const entity = this.entities.get(entityId);
    if (!entity || !entity.facets.rpg) return null;
    return entity.facets.rpg;
  }

  public getDebateFacet(entityId: string): DebateEvidenceFacet | null {
    const entity = this.entities.get(entityId);
    if (!entity || !entity.facets.debate) return null;
    return entity.facets.debate;
  }

  public serializeRevealed(): string[] {
    return Array.from(this.revealedFacets);
  }

  public deserializeRevealed(data: string[]): void {
    this.revealedFacets = new Set(data || []);
  }
}
