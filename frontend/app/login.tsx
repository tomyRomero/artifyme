import React from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
} from 'react-native';
import LoginForm from '../components/forms/LoginForm';
import { Colors } from '../lib/constants';
import { useAppContext } from '../lib/AppContext';

export default function LoginScreen() {

  const { theme} = useAppContext();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme === "light" ? Colors.backgroundlight : Colors.backgrounddark}}>
      <View style={styles.container}>
        <LoginForm />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  } 
});
