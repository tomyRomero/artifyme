import React from 'react';
import { View,  StyleSheet, Keyboard, TouchableWithoutFeedback} from 'react-native';
import CreateImageForm from '../../components/forms/CreateImageForm';
import { Colors } from '../../lib/constants';
import { useAppContext } from '../../lib/AppContext';


export default function TabCreateScreen() {

  const { theme } = useAppContext();

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const styles = getStyles(theme);

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        <CreateImageForm />
      </View>
    </TouchableWithoutFeedback>
  );
}

const getStyles = (theme: string) =>
{
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme === "light" ? Colors.backgroundlight : Colors.backgrounddark
    },
  });
}

