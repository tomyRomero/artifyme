import React, { useEffect, useState } from 'react'
import {
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    Image,
    ActivityIndicator,
  } from 'react-native';
import { calculateTimeAgo, getImageData } from '../../lib/utils';
import { Colors } from '../../lib/constants';
import { router } from 'expo-router';
import { useAppContext } from '../../lib/AppContext';

interface Props{
    aiImage: string;
    creationDateTime: string;
    title: string;
    index: number;
    id: string;
}

const ArtworkRow = ({aiImage, creationDateTime, title , id} : Props) => {

    const {updateArtwork} = useAppContext();
    const [loading, setLoading] = useState(true);
    const [s3Image, setS3Image] = useState<null|string>(null);

    useEffect(() => {
        const loadImage = async () => {
          try {
            const image = await getImageData(aiImage);

            if (image) {
              setS3Image(image);
              setLoading(false);
            }
            
          } catch (error) {
            console.error('Error loading image:', error);
            setLoading(false);
          }
        };
      
        loadImage();
      }, [updateArtwork]);
      

  return (
    <TouchableOpacity
    onPress={() => {
     router.push(`/artwork/${id}`)
    }}>

    <View style={styles.card}>
        {loading ? (<>
        <ActivityIndicator color={Colors.primary} size={"large"} style={{marginRight: 10}}/>
        </>) : 
        (
        <>
        {s3Image ? 
        (
        <Image
        alt="Artwork image"
        resizeMode="cover"
        style={styles.cardImg}
        source={{ uri: s3Image }} />
        )
        : 
        (
        <Image
        alt="NotFound Icon"
        resizeMode="cover"
        style={styles.cardImg}
        source={require("../../assets/icons/notfound.png")} />
        )}
        </>
        )}
        
      
      <View>
        <Text style={styles.cardTitle}>{title}</Text>

        <View style={styles.cardStats}>
          <View style={styles.cardStatsItem}>
                <Image
                source={require('../../assets/icons/clock.png')}
                resizeMode="contain"
                style={{
                width: 18,
                height: 18,
            }}
             />

            <Text style={styles.cardStatsItemText}>
                {calculateTimeAgo(creationDateTime)}
            </Text>
          </View>

        </View>
      </View>

      <View style={styles.cardAction}>
        <Image
            source={require('../../assets/icons/right.png')}
            resizeMode="contain"
            style={{
            width: 35,
            height: 35,
        }}
        />
      </View>
    </View>
  </TouchableOpacity>
  )
}

export default ArtworkRow

const styles = StyleSheet.create({
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: '#1d1d1d',
      marginBottom: 12,
    },
    /** Card */
    card: {
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    cardImg: {
      width: 50,
      height: 50,
      borderRadius: 9999,
      marginRight: 12,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: '#000',
      marginBottom: 8,
    },
    cardStats: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardStatsItem: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 8,
    },
    cardStatsItemText: {
      fontSize: 13,
      fontWeight: '500',
      color: '#636a73',
      marginLeft: 2,
    },
    cardAction: {
      marginLeft: 'auto',
    },
  });