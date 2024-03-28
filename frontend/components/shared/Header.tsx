import React from 'react'
import { View, Image, StyleSheet, Pressable, Platform, SafeAreaView , Text, StatusBar} from 'react-native';
import { Link } from 'expo-router';
import { Colors } from '../../lib/constants';
import RainbowTitle from './RainbowTitle';
import { useAppContext } from '../../lib/AppContext';

const Header = () => {

  const {theme} = useAppContext();

  const styles = getStyles(theme);

  return (
    <SafeAreaView style={styles.headerContainer}>
        <Link href="/about" asChild>
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

const getStyles = (theme: string) => {
  return StyleSheet.create({
    headerContainer: {
        marginTop: -10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
        width: '100%',
        borderBottomWidth: 1, 
        borderBottomColor: theme === "light" ?  'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.1)',
        ...Platform.select({
          ios: {
            shadowColor: theme === "light" ? 'black' : 'white',
            shadowOpacity: 0.2,
            shadowRadius: 4,
            shadowOffset: {
              width: 0,
              height: 2,
            },
          },
        }),
        
        backgroundColor: theme === "light" ?  Colors.backgroundlight : Colors.backgrounddark
      },
      icon: {
        width: 30,
        height: 30,
        marginTop: 15,
        marginBottom: 15,
        marginLeft: 5,
        shadowColor: theme === "light" ?  '#000' : '#fff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
})
}