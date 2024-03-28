import React from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
} from 'react-native';
import { Colors } from '../lib/constants';
import { useAppContext } from '../lib/AppContext';
import ChangePasswordForm from '../components/forms/ChangePassword';

export default function LoginScreen() {

  const { theme} = useAppContext();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme === "light" ? Colors.backgroundlight : Colors.backgrounddark}}>
      <View style={styles.container}>
        <ChangePasswordForm />
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
