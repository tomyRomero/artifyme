import React from 'react'
import {
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    Image,
  } from 'react-native';

  const artworks = [
    {
      img: 'https://images.unsplash.com/photo-1536922246289-88c42f957773?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2404&q=80',
      name: 'title1',
      date: 10,
    },
    {
      img: 'https://images.unsplash.com/photo-1597347316205-36f6c451902a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2340&q=80',
      name: 'title2',
      date: 15,
    },
    {
      img: 'https://images.unsplash.com/photo-1616803689943-5601631c7fec?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2340&q=80',
      name: 'title3',
      date: 5,
    },
  ]


const Gallery = () => {
  return (
    <>
    {artworks.map(({ name, date, img }, index) => {
        return (
          <TouchableOpacity
            key={index}
            onPress={() => {
              // handle onPress
            }}>
            <View style={styles.card}>
              <Image
                alt=""
                resizeMode="cover"
                style={styles.cardImg}
                source={{ uri: img }} />

              <View>
                <Text style={styles.cardTitle}>{name}</Text>

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
                      {date} 
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
        );
      })}
      </>
  )
}

export default Gallery

const styles = StyleSheet.create({
    container: {
      padding: 24,
    },
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