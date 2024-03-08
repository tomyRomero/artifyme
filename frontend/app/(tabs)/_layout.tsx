import React from 'react';
import { Text, View, Image, StyleSheet, useColorScheme, TouchableOpacity, Pressable, Platform} from 'react-native';
import { Link, Tabs } from 'expo-router';
import Colors from '../../constants/Colors';
import Svg, { Path } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import { BottomTabBar } from "@react-navigation/bottom-tabs"
import { useAppContext } from '../../lib/AppContext';

export default function TabLayout() {

  const { theme } = useAppContext();

  const TabBarCustomButton = ({ accessibilityState, children, onPress }: any) => {

    var isSelected = accessibilityState.selected
  
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

  const CustomTabBar = (props: any) => {
    return (
        <>
            <StatusBar style="light" backgroundColor={Colors.white} />
            <BottomTabBar {...props.props} />
        </>
    );
};

const CustomCreateButton = ({accessibilityState, children , onPress} : any) => (
  <TouchableOpacity
    style={{
      top: -30,
      justifyContent: 'center',
      alignItems: 'center',
      ...styles.shadow
    }}
    onPress={onPress}
  >
    <View style={{
      width: 70,
      height: 70,
      borderRadius: 35, 
      backgroundColor: Colors.light.tint
    }}>
      {children}
    </View>
  </TouchableOpacity>
)



  return (
      <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: {
            position: 'absolute',
            bottom: 10,
            left: 0,
            right: 0,
            backgroundColor: "transparent",
            borderRadius: 15,
            borderTopColor: "transparent",
            ...styles.shadow
          
            
        } ,
        header: () => (
          <View style={styles.headerContainer}>
            <Link href="/modal" asChild>
              <Pressable
                style={({ pressed }) => ({
                  flexDirection: 'row', 
                  alignItems: 'center',
                  marginRight: 5, 
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.title}>
                    ArtifyMe
                  </Text>
                  <Image
                    source={require('../../assets/icons/art.png')} 
                    resizeMode='contain'
                    style={styles.icon} 
                  />
                </View>
              </Pressable>
            </Link>
          </View>
        )
    }}
    tabBar={(props) => (
        <CustomTabBar
            props={props}
        />
    )}
    >
         <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <Image
                            source={require('../../assets/icons/gallery.png')}
                            resizeMode="contain"
                            style={{
                                width: 35,
                                height: 35,
                                tintColor: focused ? Colors.primary : Colors.secondary
                            }}
                        />
                    ),
                    tabBarButton: (props) => (
                        <TabBarCustomButton
                            {...props}
                        />
                    )
                }}
            />

            <Tabs.Screen
                name="create"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <Image
                            source={require('../../assets/icons/create.png')}
                            resizeMode="contain"
                            style={{
                                width: 35,
                                height: 35,
                                tintColor: focused ? Colors.primary : Colors.secondary
                            }}
                        />
                    ),
                    tabBarButton: (props: any) => (
                        <TabBarCustomButton
                            {...props}
                        />
                    )
                }}
            />

            <Tabs.Screen
                name="profile"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <Image
                            source={require('../../assets/icons/user.png')}
                            resizeMode="contain"
                            style={{
                                width: 35,
                                height: 35,
                                tintColor: focused ? Colors.primary : Colors.secondary
                            }}
                        />
                    ),
                    tabBarButton: (props) => (
                        <TabBarCustomButton
                            {...props}
                        />
                    )
                }}
            />
        </Tabs>
    )
}


const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#7F5Df0',
    shadowOffset: {
      width: 0, 
      height: 10
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 5
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 90,
    width: '100%',
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(0,0,0,0.1)',
    ...Platform.select({
      ios: {
        shadowColor: 'black',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: {
          width: 0,
          height: 2,
        },
      },
      android: {
        elevation: 4,
      },
    }),
    backgroundColor: `#FFFFFF`
  },
  title: {
    color: '#000000',
    fontFamily: 'DancingScript',
    fontWeight: 'bold',
    fontSize: 30,
    marginTop: 15,
    marginBottom: 5,
    marginRight: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    
  },
  icon: {
    width: 30,
    height: 30,
    marginTop: 15,
    marginBottom: 5,
    marginLeft: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

