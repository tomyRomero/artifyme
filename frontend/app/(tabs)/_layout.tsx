import React from 'react';
import { Text, View, Image, StyleSheet, useColorScheme, TouchableOpacity, Pressable, Platform} from 'react-native';
import { Link, Tabs } from 'expo-router';


import Colors from '../../constants/Colors';


export default function TabLayout() {
  const colorScheme = useColorScheme();

  const CustomTabBarButton = ({children , onPress} : any) => (
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
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          tabBarStyle: { 
           position: 'absolute',
           bottom: 25,
           left: 20,
           right: 20,
           backgroundColor: '#ffffff',
           borderRadius: 15,
           height: 90,
           ...styles.shadow
          },
          tabBarShowLabel: false,
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
          ),
        }}
      >
          
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => (
             <View style={{alignItems: 'center', justifyContent: 'center', top: 10}}>
                <Image
                  source={require('../../assets/icons/gallery.png')}
                  resizeMode='contain'
                  style={{
                    width: 25,
                    height: 25,
                    tintColor: focused ? '#211C6A' : '#000000',
                  }}
                />
                <Text
                style={{color: focused ? '#211C6A' : '#000000', fontSize: 12}}
                >
                  GALLERY
                </Text>
             </View>
            ),
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            tabBarIcon: ({ focused }) => (
              <Image 
                source={require('../../assets/icons/create.png')}
                resizeMode='contain'
                style={{
                  width: 30,
                  height: 30,
                  tintColor: '#fff'
                }}
                />
            ),
            tabBarButton: (props) => (
              <CustomTabBarButton {...props} />
            )
          }}
        />
        <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
           <View style={{alignItems: 'center', justifyContent: 'center', top: 10}}>
              <Image
                source={require('../../assets/icons/account.png')}
                resizeMode='contain'
                style={{
                  width: 25,
                  height: 25,
                  tintColor: focused ? '#211C6A' : '#000000',
                }}
              />
              <Text
              style={{
                color: focused ? '#211C6A' : '#000000', fontSize: 12}}
              >
                
                PROFILE
              </Text>
           </View>
          ),
        }}
        />
      </Tabs>
  );
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
    backgroundColor: "#ffffff",
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
    backgroundColor: '#ffffff'
  },
});
