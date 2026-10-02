import { describe, expect, it } from '@jest/globals';
import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PreferencesProvider } from '@/lib/preferences';
import { SegmentedControl } from '../SegmentedControl';

describe('SegmentedControl', () => {
  function Viewer() {
    const [show, setShow] = useState<'artwork' | 'sketch'>('artwork');
    return (
      <SegmentedControl
        accessibilityLabel="Show"
        options={[
          { value: 'artwork', label: 'Artwork' },
          { value: 'sketch', label: 'Sketch' },
        ]}
        value={show}
        onChange={setShow}
      />
    );
  }

  it('selects one choice at a time', async () => {
    await render(
      <PreferencesProvider>
        <Viewer />
      </PreferencesProvider>,
    );
    expect(screen.getByRole('button', { name: 'Artwork' })).toBeSelected();

    await fireEvent.press(screen.getByRole('button', { name: 'Sketch' }));

    expect(screen.getByRole('button', { name: 'Sketch' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Artwork' })).not.toBeSelected();
  });
});
