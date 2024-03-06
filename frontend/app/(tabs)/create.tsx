import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Path, Svg } from 'react-native-svg';
import Colors from '../../constants/Colors';
import { Link } from 'expo-router';
import { useAppContext } from '../../lib/AppContext';


const { height, width } = Dimensions.get('window');

export default function TabCreateScreen() {
  const [description, setDescription] = useState('');
  const { paths } = useAppContext();

  const submitForm = async () => {
    try {
      console.log("submit")
      // Now you can handle the image URI in your logic for submitting the form
    } catch (error) {
      console.error('Error capturing image:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Create</Text>
        <View style={styles.separator} />

        {/* Pressable Rectangle */}
        <Link href="/canvas" asChild>
          <TouchableOpacity style={styles.pressableRect}>
            <View style={styles.rectContainer}>
              <Svg height={height * 0.2} width={width * 0.8} viewBox={`0 0 ${width} ${height}`}>
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

        {/* Description Text Input */}
        <TextInput
          placeholder="Provide a description of what you drew!"
          style={styles.textInput}
          multiline
          value={description}
          onChangeText={setDescription}
        />

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={submitForm}>
          <Text style={styles.buttonText}>Submit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  formContainer: {
    marginTop: -height * 0.001,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: height * 0.05
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
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
  },
  drawingPreviewText: {
    marginTop: 5,
    fontSize: 16,
  },
  textInput: {
    width: '80%',
    height: 100,
    backgroundColor: '#f5f5f5',
    padding: 10,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: Colors.light.tint,
    padding: 10,
    borderRadius: 5,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

