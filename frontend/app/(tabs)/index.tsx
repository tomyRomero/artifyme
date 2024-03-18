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


export default function HomeScreen() {

  const [auth, setAuth] = useState(false);
  const [artworks, setArtworks] = useState([])
  const [isNext, setIsNext] = useState(false);

  const searchParams = useLocalSearchParams();
  const pageSize = 6;  

  //Get page number, 
  //searchParams can come in a form of an array, so have to check both condtions

  let pageNumber = 1;
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
      setAuth(false);
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
        console.log(`${data.message}`)
      }else{
        console.log(`${data.message}`)
        Alert.alert(`${data.message}`)
      }
  
    } catch (error) {
      console.error('Error fetching artworks:', error);
      
    }
  }

  //Track whether the screen is focused
  const isFocused = useIsFocused(); 
  
  useEffect(() => {
    const checkAuth = async ()=> {
      if (isFocused) {
        //Check to see if user is authenticated 
       setAuth(await authenticate());
       if(!auth)
       {
        setArtworks([])
       }else{
        fetchArtworks();
       }
      }
    }

    checkAuth();

  }, [isFocused]);

  useEffect(()=> {
    fetchArtworks();
  }, [pageNumber])
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.backgroundlight }}>
    <View style={styles.container}>
      <Text style={styles.title}>Gallery</Text>
        {
        artworks.length === 0 ? 
        (
          <EmptyGallery auth={auth}/> 
        ) 
        : 
        (
        <Gallery artworks={artworks}/>)
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
