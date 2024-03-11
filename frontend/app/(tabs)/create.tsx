import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions,Keyboard, TouchableWithoutFeedback, Image , Animated, ActivityIndicator} from 'react-native';
import { Path, Svg } from 'react-native-svg';
import Colors from '../../constants/Colors';
import { Link } from 'expo-router';
import { useAppContext } from '../../lib/AppContext';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { Formik } from 'formik';
import * as yup from 'yup';

const { height, width } = Dimensions.get('window');

export default function TabCreateScreen() {

  const { paths, setPaths } = useAppContext();
  const [generatedImage, setGeneratedImage] = useState<null | string>(null); // State to store the generated image URI
  const [loading, setLoading] = useState(false)

  const fadeAnim = useRef(new Animated.Value(0)).current; 
  const svgRef = useRef(null);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const validationSchema = yup.object().shape({
    description: yup.string().required('Description is required').min(5, 'Description must be at least 5 characters long'),
  });

  useEffect(() => {
    console.log("generatedImage:", generatedImage);

    // Start the fade animation when generatedImage changes
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000, // Adjust duration as needed
      useNativeDriver: true, // Enable native driver for better performance
    }).start();
  }, [generatedImage]);


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

  
  function isBase64Image(imageData: string) {
    const base64Regex = /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/;
    return base64Regex.test(imageData);
  }

  const submitForm = async (formValues: { description: string; }) => {
    try {
      setLoading(true)
      const { description } = formValues;

      // Check if paths is empty
      if (paths.length === 0) {
        alert('Please draw something before submitting the form.');
        setLoading(false)
        return;
      }

      const base64 = await saveAsPNG();
      
      if (isBase64Image(base64)) {
        console.log("is base64")
        
        //The IP address of the same network my server and device using (iphone) are sharing ,
        // the port number of where the sever uvicorn for python is running
        const apiUrl = 'http://172.20.10.2:8000/';
  
        const response = await axios.post(`${apiUrl}generate/img2img`, {
          base64_image: base64,
          prompt: description,
        });
  
      // Extract the base64_image field from the response
      const { base64_image } = response.data;

      // Set the base64 image as the state value for generatedImage
      setGeneratedImage(base64_image);
      setLoading(false)
      } else {
        console.log("is not base64")
        setLoading(false)
      }
    } catch (error) {
      console.error('Error:', error);
      setLoading(false)
    }
  };


  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Any sketches you create will be transformed into images using artificial intelligence (AI), Happy sketching! 🎨✨</Text>
          <View style={styles.separator} />

          <Formik
            initialValues={{
               description: '' 
              }}
            validationSchema={validationSchema}
            onSubmit={(values, { resetForm }) => {
              // values is an object containing the form field values
              console.log('Form values:', values);
          
              // Call your custom submitForm function here
              submitForm(values);
          
              // Optionally reset the form after submission
              resetForm();
            }}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
              <>
              {!generatedImage && (
                <>
                <TextInput
                  placeholder="Provide a description of your drawing!"
                  style={styles.textInput}
                  multiline
                  value={values.description}
                  onChangeText={handleChange('description')}
                  onBlur={handleBlur('description')}
                />
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
                        <Svg ref={svgRef} height={height * 0.35} width={width * 0.8} viewBox={`0 0 ${width * 0.9} ${height * 0.9}`}>
                          <Path
                            d={paths.join('')}
                            stroke="red"
                            fill="transparent"
                            strokeWidth={2}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        </Svg>
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
      </View>
    </TouchableWithoutFeedback>
  );
}

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
    paddingTop: height * 0.03
  },
  title: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    color: '#000000'
  },
  separator: {
    width: '80%',
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginBottom: 20,
  },
  pressableRect: {
    alignItems: 'center',
    marginBottom: 20,
  },
  rectContainer: {
    alignItems: 'center',
    backgroundColor: 'lightgray',
    borderRadius: 10,
    padding: 10,
    borderWidth: 5, 
    borderColor: '#8B4513', 
  },
  drawingPreviewText: {
    marginTop: 5,
    fontSize: 20,
    fontFamily: "DancingScript"
  },
  textInput: {
    width: '95%',
    height: 50,
    backgroundColor: '#f5f5f5',
    padding: 10,
    marginBottom: 20,
    borderRadius: 12
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
    marginTop: -15, 
    marginBottom: 10, 
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
  }
});

