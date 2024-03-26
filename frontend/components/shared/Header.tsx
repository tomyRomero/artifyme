import React from 'react'
import { View, Image, StyleSheet, Pressable, Platform, SafeAreaView , Text, StatusBar} from 'react-native';
import { Link } from 'expo-router';
import { Colors } from '../../lib/constants';
import RainbowTitle from './RainbowTitle';

const Header = () => {
  return (
    <SafeAreaView style={styles.headerContainer}>
        <Link href="/modal" asChild>
        <Pressable
            style={({ pressed }) => ({
            flexDirection: 'row', 
            alignItems: 'center',
            marginRight: 5, 
            })}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <RainbowTitle titleText='ArtifyMe' />
            <Image
                source={require('../../assets/icons/art.png')} 
                resizeMode='contain'
                style={styles.icon} 
            />
            </View>
        </Pressable>
        </Link>
    </SafeAreaView>
  )
}

export default Header;

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
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
        }),
        backgroundColor: Colors.backgroundlight
      },
      title: {
        color: Colors.primary,
        fontFamily: 'DancingScript',
        fontWeight: 'bold',
        fontSize: 30,
        marginTop: 15,
        marginBottom: 15,
        marginRight: 5,
        textShadowColor: 'rgba(0, 0, 0, 0.25)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        
      },
      icon: {
        width: 30,
        height: 30,
        marginTop: 15,
        marginBottom: 15,
        marginLeft: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
})