import React, { useState } from 'react';
import { StyleSheet, View, Image, SafeAreaView, Dimensions, TouchableOpacity, Text, Share, Alert, Modal } from 'react-native';
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

export default function Results({setGeneratedImage, generatedImage, title , description, id, update}: ResultsProps) 
{
  const [isAiImageFullScreen, setIsAiImageFullScreen] = useState(false);

  const {setPaths, authenticated, theme } = useAppContext();

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

  const handleShare = async ()=> {
    try {
      await Share.share({ url: generatedImage });
    } 
    catch (error) 
    {
      Alert.alert(`Error sharing image:, ${error}`);
    }
  }

  const toggleAiImageFullScreen = () => {
    setIsAiImageFullScreen(!isAiImageFullScreen);
  };

  const styles = getStyles(theme);

  return (
    <SafeAreaView style={styles.container}>

      <Text style={[styles.title, {marginTop: 10 , color: theme === "light" ? "black" : "white" }]}>Results</Text>
      <View style={styles.imageContainer}>
        <TouchableOpacity onPress={toggleAiImageFullScreen}>
        <Image
          style={styles.image}
          source={{ uri: generatedImage }}
        />
        </TouchableOpacity>
      </View>

      {/* AI Image Full-Screen Modal */}
      <Modal visible={isAiImageFullScreen} animationType="slide">
        <View style={styles.modalContainer}>
        <TouchableOpacity
          onPress={toggleAiImageFullScreen}
          style={[styles.button, { position: 'absolute', top: 40, right: 20, zIndex: 1, backgroundColor: 'red'}]}>
              <View style={styles.buttonContent}>
              <Image source={require('../../assets/icons/close.png')} style={styles.buttonIcon} />
                <Text style={[styles.buttonText]}>Close</Text>
              </View>
            </TouchableOpacity>
            <Image source={{uri: generatedImage}}  style={styles.fullscreenImage} />     
        </View>
      </Modal>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{description}</Text>
      <View style={styles.buttonsContainer}>
      {!update &&  
      <TouchableOpacity
          onPress={handleReset}
          style={styles.button}>
          <View style={styles.buttonContent}>
            <Image source={require('../../assets/icons/reset.png')} style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Try Again</Text>
          </View>
        </TouchableOpacity>}
    
      {authenticated ? 
      (
      <>
      {id.length > 0 && (
        <>
        {!update && (<TouchableOpacity
          onPress={handleView}
          style={styles.button}>
            <View style={styles.buttonContent}>
            <Image source={require('../../assets/icons/details.png')} style={styles.buttonIcon} />
            <Text style={styles.buttonText}>View</Text>
          </View>
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
            <View style={styles.buttonContent}>
            <Image source={require('../../assets/icons/whiteright.png')} style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Login</Text>
          </View>
        </TouchableOpacity>}
        </>
      )}

        <TouchableOpacity
          onPress={handleShare}
          style={styles.button}>
            <View style={styles.buttonContent}>
            <Image source={require('../../assets/icons/share.png')} style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Share</Text>
          </View>
        </TouchableOpacity>
      </View>
     
    </SafeAreaView>
  );
}

const getStyles = (theme : string)=> {
  return StyleSheet.create({
    container: {
      backgroundColor: theme === "light" ? Colors.backgroundlight : Colors.backgrounddark,
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
      shadowColor: theme === "light" ? '#000' : "#fff",
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.37,
      shadowRadius: 7.49,
      transform: [{ rotate: '3deg' }], 
    },
   
    imageStyle: {
      width: 20,
      height: 20,
    },
    title: {
      marginTop: -70,
      fontSize: 40,
      fontWeight: '300',
      color: theme === "light" ? Colors.primary : Colors.third,
      marginLeft: 40,
      textAlign: 'left',
    },
    text: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400',
      color: theme === "light" ? '#000' : '#fff',
      marginLeft: 40,
      textAlign: 'left',
      marginBottom: 45
    },
    
     buttonsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 10
    },
  
    button: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      marginHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Colors.primary
    },
    clearbtn: {
      backgroundColor: "red"
    },
    undobtn: {
      backgroundColor: "#FBA834"
    },
    buttonText: {
      color: 'white',
      fontWeight: 'bold',
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonIcon: {
      width: 20,
      height: 20,
      marginRight: 5,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme === "light" ?  Colors.backgroundlight : Colors.backgrounddark,
      justifyContent: 'center',
      alignItems: 'center',
    },
  
    fullscreenImage: {
      width: '95%',
      height: '95%',
      resizeMode: 'contain'
    }
  });
}

