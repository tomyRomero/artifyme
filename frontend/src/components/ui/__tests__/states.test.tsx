import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AccessibilityInfo, StyleSheet, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PreferencesProvider } from '@/lib/preferences';
import { Banner } from '../Banner';
import { Screen } from '../Screen';

const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});

async function renderInTheme(element: React.ReactElement) {
  return render(<PreferencesProvider>{element}</PreferencesProvider>);
}

describe('Banner', () => {
  it('announces a problem as an alert and offers its action', async () => {
    const retry = jest.fn();
    await renderInTheme(
      <Banner
        tone="offline"
        message="You're offline. Showing saved artworks."
        action={{ label: 'Retry', onPress: retry }}
      />,
    );

    expect(screen.getByRole('alert', { name: "You're offline. Showing saved artworks." })).toBeTruthy();
    expect(announce).toHaveBeenCalledWith("You're offline. Showing saved artworks.");
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("doesn't raise an alert for information", async () => {
    announce.mockClear();
    await renderInTheme(<Banner tone="info" message="Two-finger tap to undo." />);

    expect(announce).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Two-finger tap to undo.')).toBeTruthy();
  });
});

describe('Screen', () => {
  function scrollerAround(text: string) {
    let node = screen.getByText(text).parent;
    while (node && node.props.keyboardShouldPersistTaps === undefined) {
      node = node.parent;
    }
    return node;
  }

  it('keeps its header in place while the content scrolls', async () => {
    await renderInTheme(
      <Screen scroll header={<Text>Profile</Text>}>
        <Text>Appearance</Text>
      </Screen>,
    );

    expect(scrollerAround('Appearance')).not.toBeNull();
    expect(scrollerAround('Profile')).toBeNull();
  });

  it('shows a line under the header once the content has scrolled', async () => {
    await renderInTheme(
      <Screen scroll header={<Text>Profile</Text>}>
        <Text>Appearance</Text>
      </Screen>,
    );
    const lineColor = () => StyleSheet.flatten(screen.getByTestId('screen-header').props.style).borderBottomColor;
    expect(lineColor()).toBe('transparent');

    await fireEvent.scroll(scrollerAround('Appearance')!, { nativeEvent: { contentOffset: { y: 40 } } });

    expect(lineColor()).not.toBe('transparent');
  });
});
