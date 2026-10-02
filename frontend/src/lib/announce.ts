import { AccessibilityInfo } from 'react-native';

export function announceProblems(messages: (string | undefined)[]): void {
  const found = messages.filter((message): message is string => Boolean(message));
  if (found.length > 0) {
    AccessibilityInfo.announceForAccessibility(found.map((message) => `${message}.`).join(' '));
  }
}
