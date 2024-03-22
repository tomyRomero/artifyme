import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions,Keyboard, TouchableWithoutFeedback, Image , Animated, ActivityIndicator, Alert} from 'react-native';
import { Path, Svg } from 'react-native-svg';
import { Colors } from '../../lib/constants';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useAppContext } from '../../lib/AppContext';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { Formik } from 'formik';
import * as yup from 'yup';
import { captureRef } from 'react-native-view-shot';
import { getToken, isTokenExpired } from '../../lib/utils';
import Results from '../artwork/Results';

interface updateProps{
    initTitle: string;
    initDescription: string;
    initPaths: string[][]|undefined;
    id: string;
}

const { height, width } = Dimensions.get('window');
const UpdateImageForm = ({initTitle, initDescription, initPaths, id} : updateProps) => {
    const {paths, setPaths, authenticated, updateArtwork, setUpdateArtwork, pathsChanged, setPathsChanged} = useAppContext();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [generatedImage, setGeneratedImage] = useState<null | string>(null); // State to store the generated image URI
    const [loading, setLoading] = useState(false);

    const svgRef = useRef(null);
  
    const validationSchema = yup.object().shape({
      title: yup.string().required("Title is required").min(3, 'Title must be at least 3 characters long'),
      description: yup.string().required('Description is required').min(5, 'Description must be at least 5 characters long'),
    });

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
    
    const updateArtworkonBackend = async ({ token, artworkId, sketchedImage, aiImage, description, title, paths, drawingChanged }: { token: string, artworkId: string, sketchedImage: string, aiImage: string, description: string, title: string, paths: string[][], drawingChanged: boolean }) => {
        try {
          if (isTokenExpired(token)) {
            Alert.alert("Login Credentials invalid/expired, login again");
            return;
          }
      
          const javaApiUrl = process.env.EXPO_PUBLIC_JAVA_API_URL;
      
          if(drawingChanged)
          {
            const response = await fetch(`${javaApiUrl}/api/v1/artwork?id=${artworkId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  sketchedImage: sketchedImage,
                  aiImage: aiImage,
                  description: description,
                  title: title,
                  paths: paths,
                })
              });
          
              if (response.ok) {
                setUpdateArtwork(!updateArtwork)
                const responseData = await response.json();
                console.log(responseData.message);
              } else {
                const responseData = await response.json();
                Alert.alert(`Failed to update artwork: ${responseData.message}`);
              }
          }else{
            const response = await fetch(`${javaApiUrl}/api/v1/artwork?id=${artworkId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  description: description,
                  title: title,
                })
              });
          
              if (response.ok) {
                await response.json();
                setUpdateArtwork(!updateArtwork)
                router.back();
                
              } else {
                const responseData = await response.json();
                Alert.alert(`Failed to update artwork: ${responseData.message}`);
              }
          }
         
        } catch (error) {
          console.error('update artwork error:', error);
          Alert.alert('Error', 'Failed to update artwork');
        }
      };
      
    
    function isBase64Image(imageData: string) {
      const base64Regex = /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/;
      return base64Regex.test(imageData);
    }
  
    const submitForm = async (formValues: { description: string; title: string}) => {
      try {
        setLoading(true)
        const { description, title } = formValues;
  
        //Get Token from asyncstorage
        const token = await getToken();

        //Check if paths is empty
        if (paths.length === 0) {
          alert('Please draw something to continue.');
          setLoading(false)
          return;
        }
  
        if(pathsChanged)
        {
            //Drawing changed , generate new AI Image and save it
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
                  if(authenticated)
                  {
                  //start by uploading the sketch image to an s3 bucket
                  const uniqueSketchImageName = `sketchimage_${Date.now()}`; // Generating a unique name using timestamp
                  const javaApiUrl = process.env.EXPO_PUBLIC_JAVA_API_URL;
              
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
                  //AI image was uploaded we can update the artwork now on the database.
                    if (token) 
                    {
                      updateArtworkonBackend({artworkId:id, token, sketchedImage: sketchfilename, aiImage: aifilename , description:description, title:title , paths:paths, drawingChanged:true});
                    }else{
                      Alert.alert("Login Credentials invalid/expired, login again to accept images")
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
        }else{
            console.log("Drawing remained the same")
            //Just update the artwork with the title and description since drawing did not change
            //AI image was uploaded we can update the artwork now on the database.
             if (token) 
             {
               updateArtworkonBackend({artworkId:id, token, sketchedImage: "", aiImage: "" , description:description, title:title , paths:paths, drawingChanged:false});
             }else{
               Alert.alert("Login Credentials invalid/expired, login again to accept images")
             }
        }   

      
      } catch (error) {
        console.error('Error:', error);
        setLoading(false)
      }
      setLoading(false)
    };


    useEffect(()=> {
        setPaths(initPaths);
    }, [])

  return (
    <>
    <TouchableOpacity
          onPress={() => {
            router.back();
            setPathsChanged(false);
            setPaths([]);
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
        <Text style={styles.title}>Update Artwork</Text>
        <View style={styles.formContainer}>
          <Formik
            initialValues={{
               description: initDescription, 
               title: initTitle
              }}
            validationSchema={validationSchema}
            onSubmit={(values, { resetForm }) => {
              setTitle(values.title);
              setDescription(values.description);
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
                        <Svg ref={svgRef} height={height * (authenticated ? 0.32 : 0.29)} width={width * 0.8} viewBox={`0 0 ${width * 0.8} ${height * 0.7}`}>
                              {paths.map((item: { path: string[]; color: string; size: number; }, index: number) => (
                                <Path
                                  key={`path-${index}`}
                                  d={item.path.join('')}
                                  stroke={item.color}
                                  fill="transparent"
                                  strokeWidth={item.size}
                                  strokeLinejoin="round"
                                  strokeLinecap="round"
                                />
                              ))}
                            </Svg>
                        <Text style={styles.drawingPreviewDescription}>Any sketches you create will be transformed into images using artificial intelligence (AI), Happy sketching! 🎨✨</Text>
                        <Text style={styles.drawingPreviewText}>Draw me</Text>
                      </View>
                    </TouchableOpacity>
                  </Link>
                )}
              
                {
                  generatedImage && <Results setGeneratedImage={setGeneratedImage} generatedImage={generatedImage} title={title} description={description} id={id} update={true}/>
                }
                
              {!generatedImage && !loading && (
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={(e: any) => handleSubmit(e)}
                >
                  <Text style={styles.buttonText}>Update</Text>
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

export default UpdateImageForm;

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
      color: Colors.primary,
      fontSize: 30,
      textAlign: 'center',
      marginBottom: 10,
    },
    pressableRect: {
      alignItems: 'center',
      marginBottom: 20,
    },
    rectContainer: {
      alignItems: 'center',
      backgroundColor: 'lightgray',
      borderRadius: 10,
      paddingHorizontal: width * 0.05,
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
      marginTop: 10
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginTop: 10,
    marginBottom: 16,
    marginLeft: 20
  },

  });
  
  