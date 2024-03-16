import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions,Keyboard, TouchableWithoutFeedback, Image , Animated, ActivityIndicator, Alert} from 'react-native';
import { Path, Svg } from 'react-native-svg';
import { Colors } from '../../constants';
import { Link, router } from 'expo-router';
import { useAppContext } from '../../lib/AppContext';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { Formik } from 'formik';
import * as yup from 'yup';
import { captureRef } from 'react-native-view-shot';
import { authenticate, getToken, getTokenSubject, isTokenExpired } from '../../lib/utils';
import { useIsFocused } from '@react-navigation/native';

const { height, width } = Dimensions.get('window');
const CreateImageForm = () => {
    const {paths, setPaths} = useAppContext();
    const [generatedImage, setGeneratedImage] = useState<null | string>(null); // State to store the generated image URI
    const [loading, setLoading] = useState(false)
    const [auth, setAuth] = useState(false);
    const [saved, setSaved] = useState(false);
  
    const fadeAnim = useRef(new Animated.Value(0)).current; 
    const svgRef = useRef(null);
  
    const validationSchema = yup.object().shape({
      title: yup.string().required("Title is required").min(3, 'Title must be at least 3 characters long'),
      description: yup.string().required('Description is required').min(5, 'Description must be at least 5 characters long'),
      
    });
  
    useEffect(() => {
      
      // Start the fade animation when generatedImage changes
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000, // Adjust duration as needed
        useNativeDriver: true, // Enable native driver for better performance
      }).start();
    }, [generatedImage]);

      //Track whether the screen is focused
      const isFocused = useIsFocused(); 

      useEffect(() => {
        const checkAuth = async ()=> {
          if (isFocused) {
            //Check to see if user is authenticated 
           setAuth(await authenticate());
           console.log("auth: ",auth)
          }
        }

        checkAuth();
      }, [isFocused]);
  
  
    const saveAsPNG = async () => {
      try {
        const uri = await captureRef(svgRef, {
          format: 'png',
          quality: 1,
        });
    
        // Read the captured image file
        const fileInfo = await FileSystem.getInfoAsync(uri);
    
        if (fileInfo.exists && !fileInfo.isDirectory) {
          // Read the file content as base64
          let base64Image = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    
          // Prepend the data type prefix
          base64Image = `data:image/png;base64,${base64Image}`;
          
          return base64Image;
        } else {
          throw new Error('File does not exist or is not a file');
        }
      } catch (error) {
        console.error('Error saving image:', error);
        throw error; 
      }
    };
    
    const saveArtwork = async ({ token, sketchedImage, aiImage , description, title }: {token: string, sketchedImage: string, aiImage: string, description: string , title: string}) => {
      try {
        const javaApiUrl = process.env.EXPO_PUBLIC_JAVA_API_URL;
        
        const response = await fetch(`${javaApiUrl}/api/v1/artwork/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userEmail: getTokenSubject(token),
            sketchedImage: sketchedImage,
            aiImage: aiImage,
            description: description,
            title: title
          })
        });
    
        if (response.ok) {
          const responseData = await response.json(); 
          console.log(responseData.message);
          console.log('Artwork ID: ', responseData.id); 
          setSaved(true);
      } else {
          const responseData = await response.json(); 
          Alert.alert(`Failed to save artwork to database: ${responseData.message}`);
      }
      } catch (error) {
        console.error('save artwork error:', error);
        Alert.alert('Error', 'Failed to save artwork to database');
      }
    };
    
    function isBase64Image(imageData: string) {
      const base64Regex = /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/;
      return base64Regex.test(imageData);
    }
  
    const submitForm = async (formValues: { description: string; title: string}) => {
      try {
        setSaved(false);
        setLoading(true)
        const { description, title } = formValues;
  
        //Check if paths is empty
        if (paths.length === 0) {
          alert('Please draw something to continue.');
          setLoading(false)
          return;
        }
  
        const sketchbase64 = await saveAsPNG();

        if (isBase64Image(sketchbase64)) {
          //Generate AI Image
          //The IP address of the same network my server and device using (iphone) are sharing ,
          // the port number of where the sever uvicorn for python is running
          const apiUrl = process.env.EXPO_PUBLIC_FAST_API_URL;
          const response = await axios.post(`${apiUrl}/generate/img2img`, {
            base64_image: sketchbase64,
            prompt: description,
          });
            //If AI image generation was successful continue the logic or else exit the function and dont do anything else
            if (response.status === 200) {
            console.log("AI Image success")
              //Extract the base64_image field from the response
              const { base64_image } = response.data;
              //if authenticated save the artwork. 
              if(auth)
              {
              //start by uploading the sketch image to an s3 bucket
              const uniqueSketchImageName = `sketchimage_${Date.now()}`; // Generating a unique name using timestamp
              const javaApiUrl = process.env.EXPO_PUBLIC_JAVA_API_URL;
              //Get Token from asyncstorage
              const token = await getToken();
              const sketchimageresponse = await fetch(`${javaApiUrl}/api/s3/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: uniqueSketchImageName,
                    image: sketchbase64
                })
              
            });
            //If sketch was uploaded successfully, then we can upload the AI image
            if(sketchimageresponse.ok)
            {
              console.log("Upload Sketch Image Success")
              const sketchdata = await sketchimageresponse.json();
              const { filename } = await sketchdata;
              const sketchfilename:string = filename;
              

              //Begin uploading AI Image
              const uniqueAIImageName = `aiimage_${Date.now()}`; // Generating a unique name using timestamp
              const aiimageresponse = await fetch(`${javaApiUrl}/api/s3/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: uniqueAIImageName,
                    image: base64_image
                })
            });

            if(aiimageresponse.ok)
            {
              console.log("Upload AI Image Success")
              const aidata = await aiimageresponse.json();
              const { filename } = await aidata;
              const aifilename:string = filename;
              //AI image was uploaded we can save the artwork now to the database.
                if (token) {
                  saveArtwork({token, sketchedImage: sketchfilename, aiImage: aifilename , description:description, title:title});
                }else{
                  Alert.alert("Token not available please try signing in again, to save")
                }
            }
            else{
              //Alert user of failure to save AI image, we can still display the results
              Alert.alert("Was not able to save AI Image")
            }

            }
            else{
              //Alert user of failure to save sketch image, we can still display the results
              Alert.alert("Was not able to save Sketch Image")
            }
            }

            //Regardless of if the user is logged in or not(of if there was an error when saving), still render result
            // Set the base64 image as the state value for generatedImage
            setGeneratedImage(base64_image);
  
            } else {
              //first response status of the AI Image is not successful, return the submit function and dont do anything else.
              Alert.alert("Was not able to generate AI Image, Please Try Again")
              console.error('Error:', response.status);
              setLoading(false)
              return;
            }
        } 
      } catch (error) {
        console.error('Error:', error);
        setLoading(false)
      }
      setLoading(false)
    };

    const handleLogin = ()=> {
      router.push("/login")
    }

    const handleArtwork = ()=> {

    }

  return (
    <>
        <View style={styles.formContainer}>
          
          <Formik
            initialValues={{
               description: '', 
               title: ''
              }}
            validationSchema={validationSchema}
            onSubmit={(values, { resetForm }) => {
              console.log('Form values:', values);
              submitForm(values);
              resetForm();
            }}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
              <>
               {!generatedImage && (
                <>
                <View style={styles.input}>
                  <Text style={styles.inputLabel}>Title</Text>
                  <TextInput
                    placeholder="Provide a title for your artwork!"
                    style={styles.inputControl}
                    multiline
                    value={values.title}
                    onChangeText={handleChange('title')}
                    onBlur={handleBlur('title')}
                  />
                </View>
                {touched.title && errors.title &&
                <Text style={styles.errorText}>{errors.title}</Text>
                }
                </>
              )
              }
              {!generatedImage && (
                <>
                <View style={styles.input}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    placeholder="Provide a description of your drawing!"
                    style={styles.inputControl}
                    multiline
                    value={values.description}
                    onChangeText={handleChange('description')}
                    onBlur={handleBlur('description')}
                  />
                </View>
                {touched.description && errors.description &&
                <Text style={styles.errorText}>{errors.description}</Text>
                }
                </>
              )
              }
             
                {!generatedImage && (
                  <Link href="/canvas" asChild>
                    <TouchableOpacity style={styles.pressableRect}>
                      <View style={styles.rectContainer}>
                        <Svg ref={svgRef} height={height * (auth ? 0.32 : 0.29)} width={width * 0.8} viewBox={`0 0 ${width * 0.9} ${height * 0.9}`}>
                          <Path
                            d={paths.join('')}
                            stroke="red"
                            fill="transparent"
                            strokeWidth={2}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        </Svg>
                        <Text style={styles.drawingPreviewDescription}>Any sketches you create will be transformed into images using artificial intelligence (AI), Happy sketching! 🎨✨</Text>
                        <Text style={styles.drawingPreviewText}>Draw me</Text>
                      </View>
                    </TouchableOpacity>
                  </Link>
                )}

                {generatedImage && (
                  <View style={styles.resultContainer}>
                    <Text style={styles.resultText}>Results:</Text>
                    <Image
                      source={{ uri: generatedImage }}
                      style={styles.resultImage}
                    />
                  </View>
                )}

                {generatedImage && (
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={() => {
                      setGeneratedImage(null); 
                      setPaths([])
                    }}
                  >
                    <Text style={styles.buttonText}>Try Again</Text>
                  </TouchableOpacity>
                )}

                 {/* Login prompt */}
                {generatedImage && (
                  <>
                  {auth ? (
                  
                  <TouchableOpacity onPress={handleArtwork} style={styles.genImageloginPrompt}>
                  <Text style={styles.loginText}>Artwork</Text>
                  <Text>{saved ? "Saved ✅" : "was not saved ❌"}</Text>
                      </TouchableOpacity>) : ( 
                          <View style={styles.emptyFooter}>
                          <TouchableOpacity
                            onPress={() => {
                              
                            }}>
                            <View style={styles.btn}>
                              <View style={{ width: 29 }} />

                              <Text style={styles.btnText}>Login to Save Future Works</Text>
                              <View style={{ marginLeft: 12 }}>
                                <Image
                                    source={require("./../../assets/icons/whiteright.png")}
                                    style={styles.imageStyle} />
                                </View>
                            </View>
                          </TouchableOpacity>
                          </View>
                      )}
                  </>
                )}
              
               {/* Login prompt */}
               {!generatedImage && !loading && (
                  <>
                  {!auth && ( <TouchableOpacity onPress={handleLogin} style={styles.loginPrompt}>
                  <Text style={styles.loginText}>Login to save artworks</Text>
                </TouchableOpacity>)}
                  </>
                )}

              {!generatedImage && !loading && (
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={(e: any) => handleSubmit(e)}
                >
                  <Text style={styles.buttonText}>Generate</Text>
                </TouchableOpacity>
              )}
              {loading && (
                <ActivityIndicator size="large" color={Colors.primary} />
              )}
              </>
            )}
          </Formik>
        </View>
    </>
  )
}

export default CreateImageForm

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: `#FFFFFF`
    },
    
    formContainer: {
      marginTop: -height * 0.001,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingTop: height * 0.02
    },
    title: {
      fontWeight: '500',
      color: '#1d1d1d',
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 10,
    },
    separator: {
      width: '80%',
      height: 1,
      backgroundColor: 'black',
      marginBottom: 15,
    },
    pressableRect: {
      alignItems: 'center',
      marginBottom: 20,
    },
    rectContainer: {
      alignItems: 'center',
      backgroundColor: 'lightgray',
      borderRadius: 10,
      paddingHorizontal: 10,
      borderWidth: 2, 
      borderColor: Colors.canvas, 
    },
    drawingPreviewText: {
      marginTop: 5,
      fontSize: 20,
      fontFamily: "DancingScript"
    },
    drawingPreviewDescription: {
      fontSize: 14,
      color: '#666', 
      textAlign: 'center',
      marginTop: 5,
    },
    submitButton: {
      backgroundColor: Colors.primary,
      padding: 10,
      borderRadius: 5,
      alignSelf: 'center',
      marginTop: -13
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    errorText: {
      color: 'red', 
      marginTop: -5, 
      marginBottom: 5, 
    },
    resultContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    resultText: {
      fontSize: 18,
      marginBottom: 10,
    },
    resultImage: {
      width: 250,
      height: 250,
      borderRadius: 10, 
    },
    resetButton: {
      backgroundColor: Colors.primary,
      padding: 10,
      borderRadius: 5,
      alignSelf: 'center',
      marginTop: 10,
    },
    loginText: {
      textDecorationLine: 'underline',
      color: 'blue',
      marginRight: 5,
    },
    genImageloginPrompt: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 15, 
      marginBottom: 10
    },
  input: {
    width: "100%",
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 5,
  },
  inputControl: {
    height: 44,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 15,
    fontWeight: '500',
    color: '#24262e',
  },
   
  emptyFooter: {
    marginTop: 50,
    alignSelf: 'stretch',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    backgroundColor: Colors.primary,
    borderColor: '#000',
  },
  btnText: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    color: '#fff',
  },
  imageStyle: {
    width: 20, 
    height: 20, 
  },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -15,
    marginBottom: 20
  }
  });
  
  