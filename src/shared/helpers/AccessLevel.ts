import { AccessLevel } from "@/karabo_data/SchemaEnums";
import { useGlobalStore } from "@/store/globalAppStateStore";

export class AccessControlManager {
  private static _instance?: AccessControlManager;

  private _originalLevel: AccessLevel = AccessLevel.Observer;
  private _currentLevel: AccessLevel = AccessLevel.Observer;
  private _isAuthenticated = false;
  private _userId?: string;

  private constructor() {}

  static get instance(): AccessControlManager {
    if (!this._instance) {
      this._instance = new AccessControlManager();
    }
    return this._instance;
  }

  private syncToStore() {
    const { updateAccessLevel } = useGlobalStore.getState();
    updateAccessLevel(this._currentLevel);
  }

  initFromLogin(params: {
    accessLevel: AccessLevel;
    isAuthenticated: boolean;
    userId?: string;
  }): void {
    this._originalLevel = params.accessLevel;
    this._currentLevel = params.accessLevel;
    this._isAuthenticated = params.isAuthenticated;
    this._userId = params.userId;

    this.syncToStore();
  }

  get originalLevel(): AccessLevel {
    return this._originalLevel;
  }

  get currentLevel(): AccessLevel {
    return this._currentLevel;
  }

  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  getAvailableLevels(): AccessLevel[] {
    switch (this._originalLevel) {
      case AccessLevel.Observer:
        return [AccessLevel.Observer];
      case AccessLevel.Operator:
        return [AccessLevel.Observer, AccessLevel.Operator];
      case AccessLevel.Expert:
        return [AccessLevel.Observer, AccessLevel.Operator, AccessLevel.Expert];
      default:
        return [this._originalLevel];
    }
  }

  canChangeLevel(): boolean {
    return this._originalLevel >= AccessLevel.Operator;
  }

  canChangeTo(target: AccessLevel): boolean {
    return this.getAvailableLevels().includes(target);
  }

  setCurrentLevel(target: AccessLevel): void {
    if (!this.canChangeTo(target)) {
      throw new Error(
        `Access level change not allowed: ${
          AccessLevel[this._originalLevel]
        } -> ${AccessLevel[target]}`
      );
    }
    this._currentLevel = target;
    this.syncToStore();
  }

  reset(): void {
    this._originalLevel = AccessLevel.Observer;
    this._currentLevel = AccessLevel.Observer;
    this._isAuthenticated = false;
    this._userId = undefined;
    this.syncToStore();
  }
}
