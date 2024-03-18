import React, { useEffect, useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, SafeAreaView, StyleSheet , Text, TouchableOpacity, View , Image, Dimensions, ActivityIndicator} from 'react-native';
import { Colors } from '../../constants';
import Artwork from '../../components/artwork/Artwork';
import NotFoundArtwork from '../../components/artwork/NotFoundArtwork';
import { getToken, isTokenExpired } from '../../lib/utils';
import axios from 'axios';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width / 2;

const artwork = () => {
  const [loading, setLoading] = useState(true);
  const [artwork, setArtwork] = useState<Artwork|null>(null);

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

    console.log("id: ", searchParams.id)
    try {
      const response = await axios.get(`${javaApiUrl}/api/v1/artwork?id=${searchParams.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response.data;
      if (response.status == 200) {
        console.log("artwork data: ", data.artwork)
        setArtwork(data.artwork)
        console.log(`${data.message}`)
      }else{
        console.log(`${data.message}`)
        Alert.alert(`${data.message}`)
      }
  
    } catch (error) {
      console.log('Error fetching artwork:', error);
    }

    setLoading(false);
  }

  useEffect(()=> {
    fetchArtwork();
  }, [])

  return (
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
         (<Artwork title={artwork.title} description={artwork.description} aiImage={artwork.aiImage} sketchedImage={artwork.sketchedImage}/>)
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
