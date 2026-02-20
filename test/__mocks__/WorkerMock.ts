export default class WorkerMock {
  url: string;
  onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null;
  onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null = null;
  onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null = null;

  constructor(stringUrl: string) {
    this.url = stringUrl;
  }

  postMessage(_message: any) {
    // You can add logic here if you want to inspect messages in tests
    // console.log('Worker received:', message);
  }

  terminate() {
    // console.log('Worker terminated');
  }

  addEventListener(_type: string, _listener: any) {
    // Mock implementation
  }

  removeEventListener(_type: string, _listener: any) {
    // Mock implementation
  }

  dispatchEvent(_event: Event): boolean {
    return true;
  }
}
