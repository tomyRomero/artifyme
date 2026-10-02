import { type ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// Icons are font glyphs, so a screen reader would read them out as symbols. They're
// decoration: the control or text beside one says what it means.
export function Icon(props: ComponentProps<typeof Ionicons>) {
  return <Ionicons accessibilityElementsHidden importantForAccessibility="no-hide-descendants" {...props} />;
}
