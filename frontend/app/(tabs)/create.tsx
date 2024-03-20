import React from 'react';
import { View,  StyleSheet, Keyboard, TouchableWithoutFeedback} from 'react-native';
import CreateImageForm from '../../components/forms/CreateImageForm';
import { Colors } from '../../constants';


export default function TabCreateScreen() {

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        <CreateImageForm id={null}/>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundlight
  },
});

