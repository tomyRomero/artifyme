import React, { useEffect, useState, useRef } from 'react'
import { StyleSheet , Text, TouchableOpacity, View , Image, Dimensions, ActivityIndicator, Share, Alert, Modal} from 'react-native';
import { Colors } from '../../lib/constants';
import { router} from 'expo-router';
import { getImageData } from '../../lib/utils';
import RBSheet from 'react-native-raw-bottom-sheet';
import DeleteArtwork from './Delete';
import { useAppContext } from '../../lib/AppContext';


const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width / 2;

const fullscreen = ()=> {

}

interface ArtworkProps{
  title: string;
  aiImage: string;
  sketchedImage: string;
  description: string;
  id: string|string[];
}



const Artwork = ({title, aiImage, sketchedImage, description, id }: ArtworkProps) => {

  const {updateArtwork} = useAppContext();
  const [sketchedS3Image, setSketchS3Image] = useState<string|null>(null);
  const [aiS3Image, setAiS3Image] = useState<null|string>(null);
  const [loading, setLoading] = useState(true);
  const [isSketchImageFullScreen, setIsSketchImageFullScreen] = useState(false);
  const [isAiImageFullScreen, setIsAiImageFullScreen] = useState(false);

  const sheet = useRef<RBSheet>(null);
  
  const toggleSketchImageFullScreen = () => {
    setIsSketchImageFullScreen(!isSketchImageFullScreen);
  };
  
  const toggleAiImageFullScreen = () => {
    setIsAiImageFullScreen(!isAiImageFullScreen);
  };

  const fetchImages = async ()=> {
    try{
      const imagedata = await getImageData(sketchedImage);
      if (imagedata) {
        setSketchS3Image(imagedata);
      }
    }catch(error)
    {
      console.error('Error loading sketch image:', error);
    }

    try{
      const aiimagedata = await getImageData(aiImage);
      if(aiimagedata)
      {
        setAiS3Image(aiimagedata);
      }
    }catch(error)
    {
      console.error('Error loading AI image:', error);
    }

    setLoading(false);
  }

  useEffect(()=> {

    fetchImages();

  }, [updateArtwork])

  const handleDelete = ()=> {
    if (sheet.current) {
      sheet.current.open();
    }
  }

  const handleEdit = ()=> {
   router.push(`/editartwork/${id}`)
  }

  const handleShare = async ()=> {
    try {
      if(aiS3Image){
        await Share.share({ url: aiS3Image });
      }else{
        Alert.alert(`Still fetching image from server, try again`);
      }
      
    } 
    catch (error) 
    {
      Alert.alert(`Error sharing image:, ${error}`);
    }
  }

  return (
    <>
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
    <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{description}</Text>
          <View style={styles.circles}>
              {/* Sketch Circle */}
              <TouchableOpacity
                onPress={toggleSketchImageFullScreen}
                style={[
                  styles.circle,
                  { top: 0, left: 0}, 
                ]}>
                {loading ? 
                (
                  <ActivityIndicator size={"large"} color={Colors.primary} style={{marginTop: 80}}/>
                ) :
                 (<>
                    {sketchedS3Image ? 
                      (
                        <Image source={{uri: sketchedS3Image}} style={styles.circleImage} />
                      ) 
                      : 
                       (
                        <Image source={require('../../assets/icons/notfound.png')} style={styles.circleImage} />
                      )
                      }
                  </>
                )
                }
                
                <View style={styles.circleTextContainer}>
                  <View style={styles.circleTextBackground}>
                    <Text style={styles.circleText}>Sketch</Text>
                  </View>
              </View>
              </TouchableOpacity>
              {/* AI Image Circle */}
              <TouchableOpacity
              onPress={toggleAiImageFullScreen}
                style={[
                  styles.circle,
                  { top: 180, left: 120 }, 
                ]}>
                 {loading ? 
                (
                  <ActivityIndicator size={"large"} color={Colors.primary} style={{marginTop: 80}}/>
                ) :
                  (<>
                      {aiS3Image ? 
                        (
                          <Image source={{uri: aiS3Image}}  style={styles.circleImage} />
                        ) 
                        : 
                        (
                          <Image source={require('../../assets/icons/notfound.png')} style={styles.circleImage} />
                        )
                        }
                    </>
                  )
                }
              <View style={styles.circleTextContainer}>
                <View style={styles.circleTextBackground}>
                  <Text style={styles.circleText}>AI Image</Text>
                </View>
              </View>
              </TouchableOpacity>

      {/* Sketch Image Full-Screen Modal */}
      <Modal visible={isSketchImageFullScreen} animationType="slide">
        <View style={styles.modalContainer}>
          <TouchableOpacity
          onPress={toggleSketchImageFullScreen}
          style={[styles.button, { position: 'absolute', top: 40, right: 20, zIndex: 1, backgroundColor: 'red'}]}>
              <View style={styles.buttonContent}>
              <Image source={require('../../assets/icons/close.png')} style={styles.buttonIcon} />
                <Text style={[styles.buttonText]}>Close</Text>
              </View>
            </TouchableOpacity>
            {loading ? 
                  (
                    <ActivityIndicator size={"large"} color={Colors.primary} style={{marginTop: 80}}/>
                  ) :
                  (<>
                      {sketchedS3Image ? 
                        (
                          <Image source={{uri: sketchedS3Image}} style={styles.image} />
                        ) 
                        : 
                        (
                          <Image source={require('../../assets/icons/notfound.png')} style={styles.image} />
                        )
                        }
                    </>
            )
            }
        </View>
      </Modal>

      {/* AI Image Full-Screen Modal */}
      <Modal visible={isAiImageFullScreen} animationType="slide">
        <View style={styles.modalContainer}>
        <TouchableOpacity
          onPress={toggleAiImageFullScreen}
          style={[styles.button, { position: 'absolute', top: 40, right: 20, zIndex: 1, backgroundColor: 'red'}]}>
              <View style={styles.buttonContent}>
              <Image source={require('../../assets/icons/close.png')} style={styles.buttonIcon} />
                <Text style={[styles.buttonText]}>Close</Text>
              </View>
            </TouchableOpacity>
          {loading ? 
                (
                  <ActivityIndicator size={"large"} color={Colors.primary} style={{marginTop: 80}}/>
                ) :
                  (<>
                      {aiS3Image ? 
                        (
                          <Image source={{uri: aiS3Image}}  style={styles.image} />
                        ) 
                        : 
                        (
                          <Image source={require('../../assets/icons/notfound.png')} style={styles.image} />
                        )
                        }
                    </>
                  )
                }
        </View>
      </Modal>
        </View>
      </View>
      <View style={styles.buttonContainer}>
        {/* Edit Button */}
        <TouchableOpacity 
        onPress = {handleEdit}
        style={[styles.button , styles.editButton]}>
          <View style={styles.buttonContent}>
            <Image source={require('../../assets/icons/edit.png')} style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Edit</Text>
          </View>
        </TouchableOpacity>
        {/* Delete Button */}
        <TouchableOpacity 
        onPress = {handleDelete}
        style={[styles.button, styles.deleteButton]}>
          <View style={styles.buttonContent}>
            <Image source={require('../../assets/icons/trash.png')} style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Delete</Text>
          </View>
        </TouchableOpacity>
        {/* Share Button */}
        <TouchableOpacity
          onPress={handleShare}
          style={[styles.button, {backgroundColor: Colors.primary}]}>
            <View style={styles.buttonContent}>
            <Image source={require('../../assets/icons/share.png')} style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Share</Text>
          </View>
        </TouchableOpacity>
        </View>
        <DeleteArtwork sheet={sheet} id={id}/>
    </>
  )
}

export default Artwork

const styles =  StyleSheet.create({
    title: {
        fontSize: 40,
        fontWeight: '300',
        color: Colors.primary,
        marginBottom: 16,
        marginTop: -10,
        textAlign: 'center',
      },
      text: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '400',
        color: '#000',
        textAlign: 'center',
        marginBottom: 15,
      },
      circles: {
        position: 'relative',
        flex: 1,
        marginHorizontal: 24,
      },
      circle: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        backgroundColor: 'white',
        borderRadius: 9999,
        position: 'absolute',
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.23,
        shadowRadius: 2.62,
        elevation: 4,
      },
      circleImage: {
        width: '100%',
        height: '100%',
        borderRadius: 9999,
      }, 
    
      buttonContainer: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center'
      },
      button: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        marginHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
      },
      buttonText: {
        color: 'white',
        fontWeight: 'bold',
      },
      buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      },
      buttonIcon: {
        width: 20,
        height: 20,
        marginRight: 5,
      },
      editButton: {
        backgroundColor: Colors.primary,
      },
      deleteButton: {
        backgroundColor: 'red',      
    },
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
      circleTextContainer: {
        position: 'absolute',
        top: 10,
        left: 0,
        right: 0,
        alignItems: 'center',
      },
      circleTextBackground: {
        backgroundColor: "white",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
      },
      circleText: {
        textAlign: 'center',
        textTransform: 'uppercase',
        fontSize: 15,
        lineHeight: 20,
        fontWeight: '700',
        color: Colors.primary,
      },
      modalContainer: {
        flex: 1,
        backgroundColor: Colors.backgroundlight,
        justifyContent: 'center',
        alignItems: 'center',
      },
      image: {
        width: '95%',
        height: '95%',
        resizeMode: 'contain'
      },
})