export class Scene {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #_sceneObj: any;
  #_height: number;
  #_width: number;

  constructor(sceneJson: string) {
    this.#_sceneObj = JSON.parse(sceneJson);
    this.#_width = parseInt(this.#_sceneObj["@_width"] as string);
    this.#_height = parseInt(this.#_sceneObj["@_height"] as string);
  }

  get height(): number {
    return this.#_height;
  }

  get width(): number {
    return this.#_width;
  }
}
