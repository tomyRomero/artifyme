import React from 'react';
import { StyleSheet, View, Image, SafeAreaView, Text, TouchableOpacity, Dimensions } from 'react-native';
import RainbowTitle from '../components/shared/RainbowTitle';
import { Colors } from '../lib/constants';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function About() {
  return (
    <SafeAreaView style={styles.container}>
        <View style={{alignSelf: "center" , marginTop: 50 }}>
            <RainbowTitle titleText='ArtifyMe'/>
        </View>
      <View style={styles.elements}>
        <TouchableOpacity onPress={() => {}}>
            <Image
            style={[styles.elementImage, { transform: [{ rotate: '10deg' }],  top: -60, right: -20, backgroundColor: "white"}]}
            source={require('../assets/images/sketchimage.png')}
            />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {}}>
            <Image
            style={[styles.elementImage, { transform: [{ rotate: '-5deg' }], left: -30, zIndex: 10 ,}]}
            source={require('../assets/images/aiimage.png')}
            />
        </TouchableOpacity>
      </View>
      <View style={styles.slide}>
        <Text style={styles.slideTitle}>Dive into your Creativity</Text>
        <Text style={styles.slideText}>Discover a new love for sketching and doodling as Artify transforms your art into images with the power of AI!</Text>
        <TouchableOpacity onPress={() => {router.back()}} style={styles.button}>
          <Text style={styles.buttonText}>Get started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFEDD5',
  },
  elements: {
    width: width,
    height: height * 0.6,
    position: 'absolute',
    top: height * 0.3,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  elementImage: {
    width: width * 0.7,
    height: width * 0.6,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
   
  },
  slide: {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  slideTitle: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '600',
    color: 'black',
    marginBottom: 12,
  },
  slideText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'black',
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 12,
    marginTop: 48,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
});
