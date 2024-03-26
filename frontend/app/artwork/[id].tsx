import React, { useEffect, useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, SafeAreaView, StyleSheet , Text, TouchableOpacity, View , Image, Dimensions, ActivityIndicator} from 'react-native';
import { Colors } from '../../lib/constants';
import Artwork from '../../components/artwork/Artwork';
import NotFoundArtwork from '../../components/artwork/NotFoundArtwork';
import { getToken, isTokenExpired } from '../../lib/utils';
import axios from 'axios';
import { useAppContext } from '../../lib/AppContext';

const artwork = () => {
  const [loading, setLoading] = useState(true);
  const [artwork, setArtwork] = useState<Artwork|null>(null);

  const {updateArtwork, theme} = useAppContext();

  const searchParams = useLocalSearchParams();

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

  useEffect(()=> {
    fetchArtwork();
  }, [updateArtwork]);

  const styles = getStyles(theme);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme === "light" ? Colors.backgroundlight : Colors.backgrounddark }}>
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
        <ActivityIndicator color={ theme === "light" ? Colors.primary : Colors.third} size={"large"} style={{marginTop: 50}} />
        <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) 
      :
      (
        <>
        {artwork ? 
         (<Artwork 
          title={artwork.title} 
          description={artwork.description} 
          aiImage={artwork.aiImage}
          sketchedImage={artwork.sketchedImage} 
          id={searchParams.id}/>)
         : 
         (<NotFoundArtwork />)
         }
       </>
      )
      }
    </SafeAreaView>
  )
}

export default artwork;

const getStyles = (theme: string)=> {
  return StyleSheet.create({
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
    loadingText: {
      alignSelf: "center",
      marginTop: 20, 
      fontSize: 20,
      fontWeight: "400",
      color: theme === "light" ? Colors.primary : Colors.third,
    },
  })
}
