import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { Hash, wrap } from '../src/karabo/data/hash';
import { encodeBinary } from '../src/karabo/data/bin_writer';
import {
  decodeBinary,
  decodeBinarySchema,
} from '../src/karabo/data/bin_reader';

// Run the same script on each revision, with the same Node version and idle CPU.
// Timings are warmed-up medians in milliseconds per operation; no assertions.
const raw = {
  id: 'benchmark',
  count: 42,
  enabled: true,
  numbers: Array.from({ length: 4096 }, (_, i) => i),
  floats: Float64Array.from({ length: 4096 }, (_, i) => i / 3),
  flags: Array.from({ length: 4096 }, (_, i) => i % 2 === 0),
  bytes: Uint8Array.from({ length: 4096 }, (_, i) => i % 256),
};
const wrapped = Object.fromEntries(
  Object.entries(raw).map(([k, v]) => [k, wrap(v)])
);
let sink: unknown;
function measure(name: string, fn: () => unknown) {
  const warmStart = performance.now();
  for (let i = 0; i < 25; i++) {
    sink = fn();
  }
  // Aim for at least 50 ms per sample without making slow baseline vectors
  // take minutes per measurement. Both revisions use the same calibration.
  const iterations = Math.max(
    1,
    Math.min(10000, Math.ceil((50 * 25) / (performance.now() - warmStart)))
  );
  const times = [];
  for (let sample = 0; sample < 9; sample++) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      sink = fn();
    }
    times.push((performance.now() - start) / iterations);
  }
  times.sort((a, b) => a - b);
  console.log(`${name}: ${times[4].toFixed(4)} ms`);
}
console.log(`Node ${process.version}`);
const scalars = Object.fromEntries(
  Array.from({ length: 100 }, (_, i) => [`value${i}`, i])
);
const scalarHash = new Hash(scalars);
if (!process.argv.includes('--decode-only')) {
  measure('scalar construction', () => new Hash(scalars));
  measure('scalar encoding', () => encodeBinary(scalarHash));
  measure('scalar construction + encoding', () =>
    encodeBinary(new Hash(scalars))
  );
  for (const [name, values] of [
    ['raw', raw],
    ['wrapped', wrapped],
  ] as const) {
    const hash = new Hash(values);
    measure(`${name} construction`, () => new Hash(values));
    measure(`${name} encoding`, () => encodeBinary(hash));
    measure(`${name} construction + encoding`, () =>
      encodeBinary(new Hash(values))
    );
    measure(`${name} repeated encoding (10x)`, () => {
      for (let i = 0; i < 10; i++) {
        sink = encodeBinary(hash);
      }
      return sink;
    });
  }
}
const scalarWire = new Uint8Array(encodeBinary(scalarHash));
measure('scalar decoding (100 Int32 values)', () => decodeBinary(scalarWire));
const conf = readFileSync(
  new URL('../src/karabo/data/__test__/conf_hash.bin', import.meta.url)
);
const schema = readFileSync(
  new URL('../src/karabo/data/__test__/schema_hash.bin', import.meta.url)
);
measure('configuration decoding', () => decodeBinary(conf));
measure('schema decoding', () => decodeBinarySchema(schema));
const vectorWire = new Uint8Array(encodeBinary(new Hash(raw)));
measure('vector decoding', () => decodeBinary(vectorWire));
const stringWire = new Uint8Array(
  encodeBinary(
    new Hash(
      'strings',
      Array.from({ length: 4096 }, (_, i) => `value${i}`)
    )
  )
);
measure('string vector decoding', () => decodeBinary(stringWire));
void sink;
