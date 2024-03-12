import React from 'react';
import { View,  StyleSheet, Keyboard, TouchableWithoutFeedback} from 'react-native';
import CreateImageForm from '../../components/forms/CreateImageForm';



export default function TabCreateScreen() {

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        <CreateImageForm />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: `#FFFFFF`
  },
});

