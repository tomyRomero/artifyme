import React from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
} from 'react-native';
import SignUpForm from '../components/forms/SignUpForm';
import { Colors } from '../lib/constants';

export default function SignUpScreen() {

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.backgroundlight }}>
      <View style={styles.container}>
          <SignUpForm />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
    paddingHorizontal: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    backgroundColor: Colors.backgroundlight
  },

});
