import { SafeAreaView, StyleSheet , Text, View } from 'react-native';
import EmptyGallery from '../../components/shared/EmptyGallery';
import { Colors } from '../../constants';
import Gallery from '../../components/shared/Gallery';

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f6f6f6' }}>
    <View style={styles.container}>
      <Text style={styles.title}>Gallery</Text>
        
       <EmptyGallery /> 

        {/* <Gallery /> */}

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
    backgroundColor: Colors.backgrounglight
  },
  title: {
    fontSize: 22,
    fontWeight: '500',
    color: '#1d1d1d',
    marginTop: -12,
    marginBottom: 12,

  },
});
