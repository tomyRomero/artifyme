import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const RainbowTitle = ({titleText} : {titleText: string}) => {
  // Array of rainbow colors
  const rainbowColors = ['#FF0000', '#FF7F00', '#0000FF', '#00FF00' , '#4B0082', '#9400D3'];

  return (
    <View style={styles.container}>
      {titleText.split('').map((letter, index) => (
        <Text key={index} style={[styles.letter, { color: rainbowColors[index % rainbowColors.length] }]}>
          {letter}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  letter: {
    fontFamily: 'Pacifico',
    fontSize: 28,
    fontWeight: 'bold',
  },
});

export default RainbowTitle;
