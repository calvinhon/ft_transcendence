// Chat widget helpers
export function showChatWidget() {
  const chatWidget = document.getElementById('chat-widget');
  if (chatWidget) {
    chatWidget.classList.remove('hidden');
    chatWidget.style.display = '';
    chatWidget.style.visibility = '';
    chatWidget.style.opacity = '';
  }
}
export function hideChatWidget() {
  const chatWidget = document.getElementById('chat-widget');
  if (chatWidget) {
    chatWidget.classList.add('hidden');
    chatWidget.classList.remove('expanded');
    chatWidget.style.display = 'none';
  }
}
export function forceHideChatWidget() {
  const chatWidget = document.getElementById('chat-widget');
  if (chatWidget) {
    chatWidget.classList.add('hidden');
    chatWidget.classList.remove('expanded');
    chatWidget.style.display = 'none';
    chatWidget.style.visibility = 'hidden';
    chatWidget.style.opacity = '0';
  }
}
export function expandChatWidget() {
  const chatWidget = document.getElementById('chat-widget');
  if (chatWidget) {
    chatWidget.classList.add('expanded');
  }
}
export function collapseChatWidget() {
  const chatWidget = document.getElementById('chat-widget');
  if (chatWidget) {
    chatWidget.classList.remove('expanded');
  }
}
// UI helpers for showing/hiding screens and modals
export function showElement(el: HTMLElement) {
  el.style.display = 'block';
}
export function hideElement(el: HTMLElement) {
  el.style.display = 'none';
}
