import { router } from 'expo-router';
import React from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  TouchableOpacity,
  Text,
  Image,
  Platform,
  GestureResponderEvent,
} from 'react-native';
import { Colors } from '../lib/constants';
import * as WebBrowser from 'expo-web-browser';
import { useAppContext } from '../lib/AppContext';

const tags = ['react','c# dotnet','asp.net','sqlserver','azure','aws'];
const stats = [
  { label: 'Location', value: 'USA' },
  { label: 'Job Type', value: 'Full Stack' },
  { label: 'Experience', value: 'junior' },
];

export default function Contact() {

  const {theme} = useAppContext();
  const styles = getStyles(theme);

  const handleLink = (e: GestureResponderEvent, link: string)=> {
      if (Platform.OS !== 'web') {
        // Prevent the default behavior of linking to the default browser on native.
        e.preventDefault();
        // Open the link in an in-app browser.
        WebBrowser.openBrowserAsync(link);
      }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme === "light" ?  Colors.backgroundlight : Colors.backgrounddark }}>
      <View style={styles.container}>
        <View style={styles.content}>
        <TouchableOpacity
          onPress={() => {
            router.back();
          }}
          style={styles.backBtn}>
          <Image
            source={require('./../assets/icons/back.png')}
            resizeMode="contain"
            style={{
              width: 35,
              height: 35,
            }}
          />
          </TouchableOpacity>
          <View style={styles.profile}>
            <View style={styles.profileTop}>
              <View style={styles.avatar}>
                <Image
                  alt="dev porfile image"
                  source={require('../assets/images/tomyRomero.jpeg')}
                  style={styles.avatarImg} />
               
              </View>
              <View style={styles.profileBody}>
                <Text style={styles.profileTitle}>{'Tomy\nRomero'}</Text>
                <Text style={styles.profileSubtitle}>
                  Junior Dev
                  {' · '}
                  <Text style={{ color: '#266EF1' }}>University of the Virgin Islands</Text>
                </Text>
              </View>
            </View>
            <Text style={styles.profileDescription}>
              Skilled in creating typescript react/react native frontends, and dotnet backends, with cloud developer foundations in AWS/Azure as well as experience with SQL Server
            </Text>
            <View style={styles.profileTags}>
              {tags.map((tag, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {}}>
                  <Text style={styles.profileTagsItem}>#{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.stats}>
            {stats.map(({ label, value }, index) => (
              <View
                key={index}
                style={[
                  styles.statsItem,
                  index === 0 && { borderLeftWidth: 0 },
                ]}>
                <Text style={styles.statsItemText}>{label}</Text>
                <Text style={styles.statsItemValue}>{value}</Text>
              </View>
            ))}
          </View>
          <Text style={{marginTop: 10, textAlign: "center" , color: theme === "light" ? "black" : "white"}}>tomyfletcher99@hotmail.com</Text>
          <View style={styles.btnGroup}>
            <TouchableOpacity
              onPress={(e) => handleLink(e, 'https://www.linkedin.com/in/tomy-romero-902476145/')}
              style={{ flex: 1, paddingHorizontal: 6 }}>
                <View style={styles.btn}>
                {theme === "light" ? ( <Image 
                  source={require('../assets/icons/linkedin.png')}
                  style={styles.icon}
                />): ( <Image 
                  source={require('../assets/icons/linkedindark.png')}
                  style={styles.icon}
                />)}
              
                <Text style={styles.btnText}>Linkedin</Text>
              </View>
              
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, paddingHorizontal: 6 }}
              onPress={(e) => handleLink(e, 'https://github.com/tomyRomero/tomyRomero')}
              >
              <View style={styles.btnPrimary}>
                {theme === "light" ? ( <Image 
                  source={require('../assets/icons/github.png')}
                  style={styles.icon}
                />): ( <Image 
                  source={require('../assets/icons/githubdark.png')}
                  style={styles.icon}
                />)}
                <Text style={styles.btnPrimaryText}>Github</Text>
              </View>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
              style={{marginTop: 10}}
              onPress={(e) => handleLink(e, 'https://tomyromero.vercel.app/')}
              >
                <View style={styles.btn}>
                  {theme === "light" ? ( <Image 
                  source={require('../assets/icons/portfolio.png')}
                  style={styles.icon}
                />):( <Image 
                  source={require('../assets/icons/portfoliodark.png')}
                  style={styles.icon}
                />)}
                      <Text style={styles.btnText}>Portfolio Site</Text>
              </View>
            </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (theme: string) => {
    return StyleSheet.create({
    container: {
      paddingVertical: 12,
      paddingHorizontal: 0,
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
    },
    content: {
      paddingHorizontal: 24,
    },
    /** Profile */
    profile: {
      marginTop: 70,
      paddingVertical: 18,
    },
    profileTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    profileBody: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      paddingLeft: 16,
    },
    profileTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      lineHeight: 32,
      color: theme === "light" ?  '#121a26' : '#ffffff',
      marginBottom: 6,
    },
    profileSubtitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme === "light" ? 'gray' : "lightgray",
    },
    profileDescription: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 18,
      color: theme === "light" ? 'gray' : "lightgray",
    },
    profileTags: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    profileTagsItem: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 18,
      color: theme === "light" ? Colors.primary : Colors.third,
      marginRight: 4,
    },
    /** Avatar */
    avatar: {
      position: 'relative',
    },
    avatarImg: {
      width: 80,
      height: 80,
      borderRadius: 9999,
    },
  
    /** Stats */
    stats: {
      backgroundColor: '#fff',
      flexDirection: 'row',
      padding: 20,
      borderRadius: 12,
      shadowColor: theme === "light" ? "#266EF1" : Colors.third, 
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 1,
    },
    statsItem: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      borderLeftWidth: 1,
      borderColor: 'black' 
    },
    statsItemText: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 18,
      color: 'black',
      marginBottom: 5,
    },
    statsItemValue: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 20,
      color: "#266EF1",
    },
    /** Button */
    btn: {
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: 'transparent',
      borderColor: theme === "light" ? Colors.primary : Colors.third,
    },
    
    btnGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: -6,
      marginTop: 18,
    },
    btnText: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
      color: theme === "light" ? Colors.primary : Colors.third,
    },
    btnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderWidth: 1,
      backgroundColor: theme === "light" ? Colors.primary : Colors.third,
      borderColor: theme === "light" ? Colors.primary : Colors.third,
    },
    btnPrimaryText: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
      color: theme === "light" ? '#fff' : "#000",
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 9999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme === "light" ? Colors.primary : Colors.third ,
      marginTop: 10,
      marginBottom: 16,
    },
    icon: {
      width: 20,
      height: 20,
      marginRight: 8, 
    },
  });
}

