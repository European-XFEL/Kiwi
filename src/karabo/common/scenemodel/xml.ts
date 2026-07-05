import { NS_KARABO } from './constants';

export function xmlAttr(element: Element, name: string): string | null {
  return element.getAttribute(name);
}

export function krbAttr(element: Element, name: string): string | null {
  return element.getAttributeNS(NS_KARABO, name);
}
