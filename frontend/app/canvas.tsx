import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, TouchableWithoutFeedback, SafeAreaView, Image } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { router } from 'expo-router';
import { useAppContext } from '../lib/AppContext';
import { Colors, sketchcolors } from '../lib/constants';
import RBSheet from 'react-native-raw-bottom-sheet';
import RainbowTitle from '../components/shared/RainbowTitle';

const { height, width } = Dimensions.get('window');

export default function CanvasScreen({}) {

  const [isClearButtonClicked, setClearButtonClicked] = useState(false);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedBrushSize, setSelectedBrushSize] = useState(2); 
  const [currentPath, setCurrentPath] = useState<{ path: string[], color: string, size: number }>({ path: [], color: sketchcolors[selectedColorIndex], size: selectedBrushSize });

  const { paths, setPaths , setPathsChanged, theme} = useAppContext(); // Access the paths state and setPaths method from the global context

  const sheet = useRef<RBSheet>(null);

  useEffect(() => {
    setPathsChanged(true);
  }, [paths]);

  const onTouchEnd = () => {
      setPaths((prevPaths: { path: string[], color: string, size: number }[]) => [...prevPaths, currentPath]); // Update paths in the global state with the new path
      setCurrentPath({ path: [], color: sketchcolors[selectedColorIndex], size: selectedBrushSize });
      setClearButtonClicked(false);
  };

  const onTouchMove = (event: { nativeEvent: { locationX: number; locationY: number; }; }) => {
    const locationX = event.nativeEvent.locationX;
    const locationY = event.nativeEvent.locationY;

    const newPath: string[] = [...currentPath.path];
    const newPoint = `${newPath.length === 0 ? 'M' : ''}${locationX.toFixed(0)},${locationY.toFixed(0)} `;

    newPath.push(newPoint);
    setCurrentPath(prev => ({ ...prev, path: newPath }));
};
  
  const handleUndoButtonClick = () => {
    if (paths.length > 0) {
      setPaths((prevPaths: string[]) => prevPaths.slice(0, -1)); // Remove the last path from the paths array
    }
  };

  const handleClearButtonClick = () => {
    setPaths([]);
    setCurrentPath({ path: [], color: sketchcolors[selectedColorIndex], size: selectedBrushSize });
    setClearButtonClicked(true);
  };

  useEffect(() => {
    setCurrentPath(prev => ({ ...prev, color: sketchcolors[selectedColorIndex] }));
  }, [selectedColorIndex]);
  
  useEffect(() => {
    setCurrentPath(prev => ({ ...prev, size: selectedBrushSize }));
  }, [selectedBrushSize]);
  

  const onClose = ()=> {
    router.back();
  }

  const handleSheet = ()=> {
    if (sheet.current) {
      sheet.current.open();
    }
  }

  const handleSelectBrushSize = (size: number) => {
    setSelectedBrushSize(size);
  };

  const renderBrushSizes = () => {
    const sizes = [2, 4, 6, 8, 10];
    return (
      <View style={[styles.group, styles.brushSizeContainer]}>
        {sizes.map((size, index) => (
          <TouchableWithoutFeedback
            key={index}
            onPress={() => handleSelectBrushSize(size)}>
            <View style={[styles.strokePreview, { borderColor: selectedBrushSize === size ? sketchcolors[selectedColorIndex] : 'transparent' }]}>
              <Svg height={40} width={40}>
                <Path d={`M10,20 L30,20`} stroke={sketchcolors[selectedColorIndex]} strokeWidth={size} strokeLinejoin="round" strokeLinecap="round" />
              </Svg>
            </View>
          </TouchableWithoutFeedback>
        ))}
      </View>
    );
  };
  
  const styles = getStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <RainbowTitle titleText='Canvas' />
          
                {/* Display currently selected brush size */}
                <TouchableOpacity onPress={handleSheet} style={[styles.circle, {marginTop: 10, marginLeft: width * 0.15}]}>
                  <View style={[styles.circleInside, { backgroundColor: 'transparent' }]}>
                    <Svg height={40} width={40}>
                      <Path d={`M10,20 L30,20`} stroke={sketchcolors[selectedColorIndex]} strokeWidth={selectedBrushSize} strokeLinejoin="round" strokeLinecap="round" />
                    </Svg>
                  </View>
                </TouchableOpacity>

                {/* Display currently selected color */}
                <TouchableOpacity onPress={handleSheet} style={[styles.circle, { marginTop: 10 , marginRight: 0}]}>
                  <View style={[styles.circleInside, { backgroundColor: sketchcolors[selectedColorIndex] }]} />
                </TouchableOpacity>

          <View style={{marginRight: -20}}>
          <TouchableOpacity style={[styles.button, styles.clearbtn]} onPress={onClose}>
            <View style={styles.buttonContent}>
            <Image source={require('../assets/icons/close.png')} style={styles.buttonIcon} />
              <Text style={[styles.buttonText]}>Close</Text>
              
            </View>
          </TouchableOpacity>
          </View>
      
        </View>
      <View style={styles.svgContainer} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <Svg height={height * 0.78} width={width}>
        {paths.map((item: { path: string[]; color: string; size: number; }, index: number) => (
            <Path
              key={`path-${index}`}
              d={item.path.join('')} // Accessing the 'path' property
              stroke={isClearButtonClicked ? 'transparent' : item.color} // Accessing the 'color' property
              fill={'transparent'}
              strokeWidth={item.size} // Accessing the 'size' property
              strokeLinejoin={'round'}
              strokeLinecap={'round'}
            />
          ))}
          {paths.length > 0 &&
            paths.map((item: string[], index: number) => (
              <Path
                key={`path-${index}`}
                d={currentPath.path.join('')}
                stroke={isClearButtonClicked ? 'transparent' : currentPath.color}
                fill={'transparent'}
                strokeWidth={currentPath.size}
                strokeLinejoin={'round'}
                strokeLinecap={'round'}
              />
            ))}
        </Svg>

      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.clearbtn]} onPress={handleClearButtonClick}>
        <View style={styles.buttonContent}>
            <Image source={require('../assets/icons/trash.png')} style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Clear</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.undobtn]} onPress={handleUndoButtonClick}>
        <View style={[styles.buttonContent]}>
            <Image source={require('../assets/icons/reset.png')} style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Undo</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleSheet}>
          <View style={styles.buttonContent}>
              <Image source={require('../assets/icons/edit.png')} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Color/Size</Text>
            </View>
        </TouchableOpacity>
      </View>


      <RBSheet
        customStyles={{ container: styles.sheet }}
        height={440}
        openDuration={250}
        ref={sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetHeaderTitle}>Brush/Color Picker</Text>
        </View>
        <View style={styles.sheetBody}>
          {renderBrushSizes()}
          <View style={styles.group}>
            {sketchcolors.map((item, index) => {
              const isActive = selectedColorIndex === index;
              return (
                <View key={item}>
                  <TouchableWithoutFeedback
                    onPress={() => {
                      setSelectedColorIndex(index);
                    }}>
                    <View
                      style={[
                        styles.circle,
                        isActive && { borderColor: item },
                      ]}>
                      <View
                        style={[styles.circleInside, { backgroundColor: item }]}
                      />
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              );
            })}
          </View>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => {
              if (sheet.current) {
                sheet.current.close();
              }
            }}>
            <Text style={styles.btnText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </RBSheet>
    </SafeAreaView>
  );
}

const getStyles = (theme: string) => {
  const CIRCLE_SIZE = 40;
  const CIRCLE_RING_SIZE = 2;
    return StyleSheet.create({
      container: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: theme === "light" ? Colors.backgroundlight : Colors.backgrounddark
      },
      header: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 20,
      },
      svgContainer: {
        height: height * 0.78,
        width: width -10,
        backgroundColor: 'white',
        borderWidth: 2, 
        borderColor: theme === "light" ? Colors.canvas : Colors.third, 
      },
      group: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: 40,
        marginBottom: 12,
      },

      buttonContainer: {
        marginTop: 8,
        flexDirection: 'row',
        alignSelf: 'center'
      },
      button: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        marginHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary
      },
      clearbtn: {
        backgroundColor: "red"
      },
      undobtn: {
        backgroundColor: "#FBA834"
      },
      buttonText: {
        color: 'white',
        fontWeight: 'bold',
      },
      buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      },
      buttonIcon: {
        width: 20,
        height: 20,
        marginRight: 5,
      },

      /** Sheet */
      sheet: {
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
        backgroundColor: theme === "light" ? Colors.backgroundlight : Colors.backgrounddark
      },
      sheetHeader: {
        borderBottomWidth: 1,
        borderBottomColor: theme === "light" ? '#efefef' : "#ffffff",
        paddingHorizontal: 24,
        paddingVertical: 14,
        alignSelf: "center",
      },
      sheetHeaderTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: theme === "light" ? 'black' : 'white'
      },
      sheetBody: {
        marginTop: -25,
        padding: 15,
      },

      /** Circle */
      circle: {
        width: CIRCLE_SIZE + CIRCLE_RING_SIZE * 4,
        height: CIRCLE_SIZE + CIRCLE_RING_SIZE * 4,
        borderRadius: 9999,
        backgroundColor: 'white',
        borderWidth: CIRCLE_RING_SIZE,
        borderColor: 'transparent',
        marginRight: 8,
        marginBottom: 12,
      },
      circleInside: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: 9999,
        position: 'absolute',
        top: CIRCLE_RING_SIZE,
        left: CIRCLE_RING_SIZE,
      },

      /**Sheet Button */
      btn: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        padding: 14,
        borderWidth: 1,
        borderColor: '#000',
        backgroundColor: Colors.primary,
        marginBottom: 12,
      },
      btnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
      },
      brushSizeContainer: {
        marginTop: 20,
      },
      strokePreview: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: 'transparent',
        marginHorizontal: 5,
        marginVertical: 5,
        justifyContent: 'center',
        alignItems: 'center',
      },
    });
}


