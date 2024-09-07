import { Alert, SafeAreaView, StyleSheet , Text, View } from 'react-native';
import EmptyGallery from '../../components/home/EmptyGallery';
import { Colors } from '../../lib/constants';
import Gallery from '../../components/home/Gallery';
import { useLocalSearchParams } from 'expo-router';
import Pagination from '../../components/shared/Pagination';
import { useEffect, useState } from 'react';
import { getToken, getTokenSubject, isTokenExpired } from '../../lib/utils';
import axios from 'axios';
import { useAppContext } from '../../lib/AppContext';



export default function HomeScreen() {

  const { authenticated, screen, setScreen , newArtwork, deleted, updateArtwork, theme} = useAppContext();

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
    const apiUrl = process.env.EXPO_PUBLIC_DOTNET_API_URL;
    const token = await getToken();

    if(!token || isTokenExpired(token))
    {
      Alert.alert("Login Credentials invalid/expired, login again")
      setArtworks([]);
      return;
    }

    try {
      const response = await axios.get(`${apiUrl}/api/v1/Artwork/artworks?pageNumber=${pageNumber}
      &pageSize=${pageSize}&useremail=${getTokenSubject(token)}`, {
        // headers: {
        //   Authorization: `Bearer ${token}`,
        // },
      });

      const data = response.data;
      console.log("data: ", data);
      if (response.status == 200) {
        setArtworks(data.content)
        setIsNext(data.isNext)
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
  
  const styles = getStyles(theme);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme === "light" ? Colors.backgroundlight : Colors.backgrounddark}}>
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

const getStyles = (theme: string) => {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      paddingBottom: 140,
      padding: 24,
      backgroundColor: theme === 'light' ? Colors.backgroundlight : Colors.backgrounddark
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: theme === "light" ? Colors.primary : Colors.third,
      marginTop: -12,
      marginBottom: 12,
    },
    paginationContainer: {
      position: 'absolute',
      bottom: 100,
      left: 0,
      right: 0,
      justifyContent: 'flex-end'
    },
  });
}
