export interface ObjectCacheOptions {
  id?: string;
  type?: string;
}

export interface ObjectCache<TRecord> {
  readonly options: ObjectCacheOptions;
  has(objectId: string): boolean;
  get(objectId: string): TRecord | undefined;
  values(): TRecord[];
  dispose(): void;
}
