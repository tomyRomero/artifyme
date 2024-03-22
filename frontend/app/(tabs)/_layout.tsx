import React from 'react';
import { Image, StyleSheet, SafeAreaView, View, StatusBar} from 'react-native';
import {Tabs } from 'expo-router';
import { Colors } from '../../lib/constants';
import { useAppContext } from '../../lib/AppContext';
import Header from '../../components/shared/Header';
import TabBarCustomButton from '../../components/shared/TabBarCustomButton';
import CustomTabBar from '../../components/shared/CustomTabBar';

export default function TabLayout() {

  const { theme } = useAppContext();

  StatusBar.setBarStyle('dark-content', true);
  
  return ( 

  <SafeAreaView style={{ flex: 1 , backgroundColor: Colors.backgroundlight }}>
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
          <Header />
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
        </SafeAreaView>
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
});

