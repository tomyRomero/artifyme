import React from 'react';
import { TouchableOpacity, View, Image, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '../../lib/constants';
import { router } from 'expo-router';
import { useAppContext } from '../../lib/AppContext';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width / 2;


const NotFoundArtwork = () => {

  const {theme} = useAppContext();

  const styles = getStyles(theme)

  return (
    <>
       <View style={styles.content}>
        <TouchableOpacity
          onPress={() => {
            router.back();
          }}
          style={styles.backBtn}>
          <Image
            source={require('../../assets/icons/back.png')}
            resizeMode="contain"
            style={{
              width: 35,
              height: 35,
            }}
          />
        </TouchableOpacity>
    <Text style={styles.title}>Error</Text>
        <Text style={styles.text}>The following artwork does not exist or was deleted, or an error occured.</Text>
        <View style={styles.circleContainer}>
          <TouchableOpacity onPress={()=> {}} style={styles.circle}>
            <Image source={require('../../assets/icons/notfound.png')} style={styles.circleImage} />
          </TouchableOpacity>
        </View>
      </View>
    </>
  )
}

export default NotFoundArtwork;

const getStyles = (theme: string)=> {
  return StyleSheet.create({
    title: {
        fontSize: 40,
        fontWeight: '300',
        color: 'red',
        marginBottom: 16,
        marginTop: 50,
        textAlign: 'center',
      },
      text: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '400',
        color: 'red',
        textAlign: 'center',
        marginBottom: 10,
      },
      circle: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        backgroundColor: 'white',
        borderRadius: 9999,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.23,
        shadowRadius: 2.62,
        elevation: 4,
      },
      circleImage: {
        width: '100%',
        height: '100%',
        borderRadius: 9999,
      }, 

    content: {
        justifyContent: 'center',
        paddingVertical: 24,
        paddingHorizontal: 24,
      },
      backBtn: {
        width: 40,
        height: 40,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme === "light" ? Colors.primary : Colors.third,
        marginTop: 10,
        marginBottom: 16,
      },
      circleContainer: {
        marginTop: 20,
        justifyContent: 'center',
        alignItems: 'center',
      },
})
}
