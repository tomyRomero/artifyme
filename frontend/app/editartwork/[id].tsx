import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Keyboard, TouchableWithoutFeedback, Alert, SafeAreaView, TouchableOpacity, Image, ActivityIndicator} from 'react-native';
import { Colors } from '../../lib/constants';
import { router, useLocalSearchParams } from 'expo-router';
import { getToken, isTokenExpired } from '../../lib/utils';
import axios from 'axios';
import NotFoundArtwork from '../../components/artwork/NotFoundArtwork';
import UpdateImageForm from '../../components/forms/UpdateImageForm';


const editartwork = () => {

    const [loading, setLoading] = useState(true);
    const [artwork, setArtwork] = useState<Artwork|null>(null);

    const dismissKeyboard = () => {
        Keyboard.dismiss();
      };

      const fetchArtwork = async ()=> {
        const javaApiUrl = process.env.EXPO_PUBLIC_JAVA_API_URL;
        const token = await getToken();
    
        if(!token || isTokenExpired(token))
        {
          Alert.alert("Could not fetch artwork, login credentials expired")
          setLoading(false);
          return;
        }
        try {
          const response = await axios.get(`${javaApiUrl}/api/v1/artwork?id=${searchParams.id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
    
          const data = response.data;
          if (response.status == 200) {
            setArtwork(data.artwork)
          }else{
            Alert.alert(`${data.message}`)
          }
      
        } catch (error) {
          Alert.alert(`Error fetching artwork:, ${error}`);
        }
    
        setLoading(false);
      }

  const searchParams = useLocalSearchParams();

  useEffect(()=> {

    fetchArtwork();

  }, [])

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
       <SafeAreaView style={{ flex: 1, backgroundColor: Colors.backgroundlight }}>
      {loading ? (
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
        <ActivityIndicator color={Colors.primary} size={"large"} style={{marginTop: 50}} />
        <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) 
      :
      (
        <>
        {artwork ? 
         (<>
            <UpdateImageForm initTitle={artwork.title} initDescription={artwork.description} initPaths={artwork.paths} id={artwork.id}/>
          </>
         )
         : 
         (<NotFoundArtwork />)
         }
       </>
      )
      }
    </SafeAreaView>
    </TouchableWithoutFeedback>
  )
}

export default editartwork;

const styles =  StyleSheet.create({
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
      backgroundColor: Colors.primary,
      marginTop: 10,
      marginBottom: 16,
    },
    loadingText: {
      alignSelf: "center",
      marginTop: 20, 
      fontSize: 20,
      fontWeight: "400",
      color: Colors.primary,
    },
  })
  