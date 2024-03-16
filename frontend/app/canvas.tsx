import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, TouchableWithoutFeedback } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { router } from 'expo-router';
import { useAppContext } from '../lib/AppContext';
import { Colors } from '../constants';



const { height, width } = Dimensions.get('window');

export default function CanvasScreen({}) {

  const [currentPath, setCurrentPath] = useState([]);
  const [isClearButtonClicked, setClearButtonClicked] = useState(false);

  const { paths, setPaths } = useAppContext(); // Access the paths state and setPaths method from the global context

  useEffect(() => {
    // Update paths in the global state whenever paths change
    setPaths(paths);
  }, [paths, setPaths]);


  const onTouchEnd = () => {
    setPaths((prevPaths: string[][]) => [...prevPaths, currentPath]); // Update paths in the global state with the new path
    setCurrentPath([]);
    setClearButtonClicked(false);

  };

  const onTouchMove = (event: { nativeEvent: { locationX: number; locationY: number; }; }) => {
    const newPath = [...currentPath];
    const locationX = event.nativeEvent.locationX;
    const locationY = event.nativeEvent.locationY;
    const newPoint = `${newPath.length === 0 ? 'M' : ''}${locationX.toFixed(0)},${locationY.toFixed(0)} `;
    //@ts-ignore
    newPath.push(newPoint);
    setCurrentPath(newPath);
  };

  const handleClearButtonClick = () => {
    setPaths([]);
    setCurrentPath([]);
    setClearButtonClicked(true);
  };

  const onClose = ()=> {
    router.push('/(tabs)/create')
  }

  return (
    <View style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
      <View style={styles.svgContainer} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <Svg height={height * 0.7} width={width}>
          <Path
            d={paths.join('')}
            stroke={isClearButtonClicked ? 'transparent' : 'red'}
            fill={'transparent'}
            strokeWidth={3}
            strokeLinejoin={'round'}
            strokeLinecap={'round'}
          />
          {paths.length > 0 &&
            paths.map((item: string[], index: number) => (
              <Path
                key={`path-${index}`}
                d={currentPath.join('')}
                stroke={isClearButtonClicked ? 'transparent' : 'red'}
                fill={'transparent'}
                strokeWidth={2}
                strokeLinejoin={'round'}
                strokeLinecap={'round'}
              />
            ))}
        </Svg>
      </View>
      <TouchableOpacity style={styles.clearButton} onPress={handleClearButtonClick}>
        <Text style={styles.clearButtonText}>Clear</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    
  },
  svgContainer: {
    height: height * 0.7,
    width,
    backgroundColor: 'white',
    borderWidth: 10, 
    borderColor: Colors.canvas, 
  },
  closeButton: {
    position: 'absolute',
    top: 30,
    right: 10,
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearButton: {
    marginTop: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
