import { decodeXML } from './xml_reader';
import { Hash } from './hash';
import { encodeXML } from './xml_writer';
import * as fs from 'fs';
import * as path from 'path';

/**
 * loadFromFile a Hash with xml format.
 */
export function loadFromFile(filepath: string): any {
  if (!fs.existsSync(filepath)) {
    throw new Error(`File not found: ${filepath}`);
  }
  const content = fs.readFileSync(filepath, 'utf-8');
  return decodeXML(content);
}

/**
 * saveToFile a Hash with xml format.
 */
export function saveToFile(hash: Hash | null, filepath: string): void {
  if (hash === null) {
    throw new Error('Cannot save null hash');
  }
  if (!(hash instanceof Hash)) {
    throw new Error('Input is not a Hash object');
  }

  // Ensure directory exists
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Check if it is a directory
  if (fs.existsSync(filepath) && fs.lstatSync(filepath).isDirectory()) {
    throw new Error(`Path is a directory: ${filepath}`);
  }

  const xmlContent = encodeXML(hash);
  fs.writeFileSync(filepath, xmlContent, { encoding: 'utf-8' });
}
