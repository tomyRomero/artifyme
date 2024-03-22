import React from 'react';
import { StyleSheet, View, Image, SafeAreaView, Dimensions, TouchableOpacity, Text } from 'react-native';
import { useAppContext } from '../../lib/AppContext';
import { router } from 'expo-router';
import { Colors } from '../../lib/constants';

const { width, height } = Dimensions.get('window');


interface ResultsProps {
  setGeneratedImage: (image: string | null) => void;
  generatedImage: string;
  title: string;
  description: string;
  id: string;
  update: boolean
}

export default function Results({setGeneratedImage, generatedImage, title , description, id, update}: ResultsProps) {

  const {setPaths, authenticated } = useAppContext();

  const handleView = ()=> {
    router.push(`/artwork/${id}`)
  }

  const handleLogin = () => {
    router.push("/login");
  }

  const handleReset = ()=> {
    setGeneratedImage(null); 
    setPaths([])
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.imageContainer}>
        <Image
          style={styles.image}
          source={{ uri: generatedImage }}
        />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{description}</Text>
      <View style={styles.buttonsContainer}>
      {!update &&  
      <TouchableOpacity
          onPress={handleReset}
          style={styles.button}>
          <Text style={styles.btnText}>Try Again</Text>
          <Image
            source={require("./../../assets/icons/reset.png")}
            style={styles.imageStyle} />
        </TouchableOpacity>}
    
      {authenticated ? 
      (
      <>
      {id.length > 0 && (
        <>
        {!update && (<TouchableOpacity
          onPress={handleView}
          style={styles.button}>
          <Text style={styles.btnText}>View</Text>
          <Image
            source={require("./../../assets/icons/details.png")}
            style={styles.imageStyle} />
        </TouchableOpacity>)}
        </>
      )}
      </>
      ):
      (
        <>
        {!update && <TouchableOpacity
          onPress={handleLogin}
          style={styles.button}>
          <Text style={styles.btnText}>Login</Text>
          <Image
            source={require("./../../assets/icons/whiteright.png")}
            style={styles.imageStyle} />
        </TouchableOpacity>}
        </>
      )}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundlight,
  },
  imageContainer: {
    marginTop: -50,
    width: width,
    height: 0.6 * height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width * 0.8,
    height: width * 0.6,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    transform: [{ rotate: '3deg' }], 
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    backgroundColor: Colors.primary,
    borderColor: '#000',
    alignSelf: 'center',
    marginBottom: 10,
    marginRight: 20
  },
  btnText: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8
  },
  imageStyle: {
    width: 20,
    height: 20,
  },
  title: {
    marginTop: -70,
    fontSize: 40,
    fontWeight: '300',
    color: Colors.primary,
    marginLeft: 40,
    textAlign: 'left',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    color: '#000',
    marginLeft: 40,
    textAlign: 'left',
    marginBottom: 45
  },
   buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10
  },
});
