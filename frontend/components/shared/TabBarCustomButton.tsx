import React from 'react';
import { View,  TouchableOpacity, GestureResponderEvent } from 'react-native';
import { Colors } from '../../constants';
import Svg, { Path } from 'react-native-svg';

interface TabBarCustomButtonProps {
    accessibilityState?: {
        selected?: boolean;
    }  
    onPress?: (event: GestureResponderEvent) => void;
    children: React.ReactNode;
}

  

const TabBarCustomButton: React.FC<TabBarCustomButtonProps> =({ accessibilityState, children, onPress }: TabBarCustomButtonProps) => {
    var isSelected = accessibilityState?.selected;
  
    if (isSelected) {
        return (
            <View style={{ flex: 1, alignItems: "center" }}>
                <View style={{ flexDirection: 'row', position: 'absolute', top: 0 }}>
                    <View style={{ flex: 1, backgroundColor: Colors.white }}></View>
                    <Svg
                        width={75}
                        height={61}
                        viewBox="0 0 75 61"
                    >
                        <Path
                            d="M75.2 0v61H0V0c4.1 0 7.4 3.1 7.9 7.1C10 21.7 22.5 33 37.7 33c15.2 0 27.7-11.3 29.7-25.9.5-4 3.9-7.1 7.9-7.1h-.1z"
                            fill={Colors.white}
                        />
                    </Svg>
                    <View style={{ flex: 1, backgroundColor: Colors.white }}></View>
                </View>
  
                <TouchableOpacity
                    style={{
                        top: -22.5,
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        backgroundColor: Colors.white
                    }}
                    onPress={onPress}
                >
                    {children}
                </TouchableOpacity>
            </View>
        )
    } else {
        return (
            <TouchableOpacity
                style={{
                    flex: 1,
                    height: 60,
                    backgroundColor: Colors.white
                }}
                activeOpacity={1}
                onPress={onPress}
            >
                {children}
            </TouchableOpacity>
        )
    }
}

export default TabBarCustomButton