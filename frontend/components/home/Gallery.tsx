import React from 'react'
import {
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    Image,
    FlatList,
  } from 'react-native';
import ArtworkRow from './ArtworkRow';

  interface ArtworksProps {
    artworks: Artwork[];
  }


const Gallery = ({artworks} : ArtworksProps) => {
  return (
    <>
      <FlatList
          data={artworks}
          renderItem={({ item, index }) => (
            <ArtworkRow
              aiImage={item.aiImage}
              creationDateTime={item.creationDateTime}
              title={item.title}
              id={item.id}
              index={index}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
        />
      </>
  )
}

export default Gallery

