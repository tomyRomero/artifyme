import { Alert, SafeAreaView, StyleSheet , Text, View } from 'react-native';
import EmptyGallery from '../../components/home/EmptyGallery';
import { Colors } from '../../constants';
import Gallery from '../../components/home/Gallery';
import { useLocalSearchParams } from 'expo-router';
import Pagination from '../../components/shared/Pagination';
import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { authenticate, getToken, getTokenSubject, isTokenExpired } from '../../lib/utils';
import axios from 'axios';
import { useAppContext } from '../../lib/AppContext';


export default function HomeScreen() {

  const { authenticated, screen, setScreen , newArtwork, deleted, updateArtwork} = useAppContext();

  const [artworks, setArtworks] = useState([])
  const [isNext, setIsNext] = useState(false);

  const searchParams = useLocalSearchParams();
  const pageSize = 6;  
  let pageNumber = 1;
  
  //Get page number, 
  //searchParams can come in a form of an array, so have to check both condtions
  if (searchParams.pageNumber) {
    if (Array.isArray(searchParams.pageNumber)) {
      pageNumber = parseInt(searchParams.pageNumber[0], 10);
    } else {
      pageNumber = parseInt(searchParams.pageNumber, 10);
    }
  }

  const fetchArtworks = async () => {
    const javaApiUrl = process.env.EXPO_PUBLIC_JAVA_API_URL;
    const token = await getToken();

    if(!token || isTokenExpired(token))
    {
      Alert.alert("Login Credentials invalid/expired, login again")
      setArtworks([]);
      return;
    }

    try {
      const response = await axios.get(`${javaApiUrl}/api/v1/artworks?pageNumber=${pageNumber}
      &pageSize=${pageSize}&useremail=${getTokenSubject(token)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response.data;
   
      if (response.status == 200) {
        setArtworks(data.content)
        setIsNext(data.next)
      }else{
        Alert.alert(`${data.message}`)
      }
    } catch (error) {
      Alert.alert(`Error fetching artworks:, ${error}`);
    }
  }
  
  useEffect(() => {
    setScreen(!screen);

    if(authenticated)
    {
      fetchArtworks();
    }else{
      setArtworks([]);
    }
  }, [authenticated, pageNumber , newArtwork, deleted, updateArtwork]);
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.backgroundlight }}>
    <View style={styles.container}>
      <Text style={styles.title}>Gallery</Text>
        {
        artworks.length === 0 ? 
        (
          <EmptyGallery auth={authenticated}/> 
        ) 
        : 
        (
        <Gallery artworks={artworks}/>
        )
        }

    <View style={styles.paginationContainer}>
          <Pagination
            pageNumber={pageNumber}
            isNext={isNext}
          />
        </View>
    </View>
    </ SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    paddingBottom: 140,
    padding: 24,
    backgroundColor: Colors.backgroundlight
  },
  title: {
    fontSize: 22,
    fontWeight: '500',
    color: '#1d1d1d',
    marginTop: -12,
    marginBottom: 12,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    justifyContent: 'flex-end'
  },
});
