// ui-view.ts - UI utility functions for DOM manipulation

export function qs(selector: string, parent: Document | HTMLElement = document): HTMLElement | null {
  return parent.querySelector(selector);
}

export function qsa(selector: string, parent: Document | HTMLElement = document): NodeListOf<HTMLElement> {
  return parent.querySelectorAll(selector);
}

export function setText(el: HTMLElement | null, text: string) {
  if (el) el.textContent = text;
}

export function setHTML(el: HTMLElement | null, html: string) {
  if (el) el.innerHTML = html;
}

export function show(el: HTMLElement | null) {
  if (el) el.classList.remove('hidden');
}

export function hide(el: HTMLElement | null) {
  if (el) el.classList.add('hidden');
}

export function clearChildren(el: HTMLElement | null) {
  if (el) el.innerHTML = '';
}
