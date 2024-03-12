import React, { useState } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  TouchableOpacity,
  Text,
  TextInput,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Formik } from 'formik';
import * as yup from 'yup';
import { router } from 'expo-router';

const SignUpForm = () => {
    const [ loading, setLoading] = useState(false);
    const [form, setForm] = useState({
      email: '',
      password: '',
      firstname: '',
      lastname: '',
    });
  
    const validationSchema = yup.object().shape({
      email: yup.string().email('Invalid email').required('Email is required'),
      password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
      firstname: yup.string().required('First name is required'),
      lastname: yup.string().required('Last name is required'),
    });
  
    const submitForm = async (values: { email: string; password: string; firstname: string; lastname: string; }) => {
      setLoading(true)
      try {
        //The IP address of the same network my server and device using (iphone) are sharing ,
        // the port number of where the sever tomcat for java is running
        const apiUrl = process.env.EXPO_PUBLIC_JAVA_API_URL;
  
        const response = await fetch(`${apiUrl}/api/v1/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        });
        const data = await response.json();
        // Check if registration was successful
        if (response.ok) {
          Alert.alert('Registration Successful', 'You have been registered successfully.');
          router.push("/login")
        } else {
          console.log(`Registration Failed', ${data.errorMessage}`);
          Alert.alert('Registration Failed', data.errorMessage || 'An error occurred during registration.');
        }
      } catch (error) {
        console.log(`Error: ${error}`)
        Alert.alert('Error', 'An error occurred. Please try again later.');
      }
      
      setLoading(false)
    };

  return (
    <>
    <View style={styles.header}>
    <TouchableOpacity
      onPress={() => {
        // handle onPress
        router.back();
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

    <Text style={styles.title}>Create Account</Text>
  </View>

  <KeyboardAwareScrollView>
    <Formik
      initialValues={form}
      validationSchema={validationSchema}
      onSubmit={(values, { resetForm }) => {
        console.log('Form values:', values);
        submitForm(values);
        resetForm();
      }}
    >
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
        <View style={styles.form}>

          <View style={styles.input}>
            <Text style={styles.inputLabel}>First Name</Text>

            <TextInput
              onChangeText={handleChange('firstname')}
              onBlur={handleBlur('firstname')}
              placeholder="e.g. John"
              placeholderTextColor="#6b7280"
              style={styles.inputControl}
              value={values.firstname} />
          </View>
          {touched.firstname && errors.firstname &&
            <Text style={styles.errorText}>{errors.firstname}</Text>
          }

          <View style={styles.input}>
            <Text style={styles.inputLabel}>Last Name</Text>

            <TextInput
              onChangeText={handleChange('lastname')}
              onBlur={handleBlur('lastname')}
              placeholder="e.g. Doe"
              placeholderTextColor="#6b7280"
              style={styles.inputControl}
              value={values.lastname} />
          </View>
          {touched.lastname && errors.lastname &&
            <Text style={styles.errorText}>{errors.lastname}</Text>
          }

          <View style={styles.input}>
            <Text style={styles.inputLabel}>Email address</Text>

            <TextInput
              onChangeText={handleChange('email')}
              onBlur={handleBlur('email')}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="e.g. john@example.com"
              placeholderTextColor="#6b7280"
              style={styles.inputControl}
              value={values.email} />
          </View>
          {touched.email && errors.email &&
            <Text style={styles.errorText}>{errors.email}</Text>
          }

          <View style={styles.input}>
            <Text style={styles.inputLabel}>Password</Text>

            <TextInput
              onChangeText={handleChange('password')}
              onBlur={handleBlur('password')}
              autoCorrect={false}
              placeholder="********"
              placeholderTextColor="#6b7280"
              style={styles.inputControl}
              secureTextEntry={true}
              value={values.password} />
          </View>
          {touched.password && errors.password &&
            <Text style={styles.errorText}>{errors.password}</Text>
          }

          <View style={styles.formAction}>
            <TouchableOpacity onPress={() => handleSubmit()}>
              <View style={styles.btn}>
                {loading ? ( 
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Sign up</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.formFooter}>
          Portfolio Project @2024 Tomy Romero
          </Text>
        </View>
      )}
    </Formik>
  </KeyboardAwareScrollView>
  </>
  )
}

export default SignUpForm

const styles = StyleSheet.create({
header: {
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffdada',
    marginBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#181818',
    marginBottom: 36,
  },
  /** Form */
  form: {
    paddingHorizontal: 24,
  },
  formAction: {
    marginVertical: 24,
  },
  formFooter: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
    color: '#9fa5af',
    textAlign: 'center',
  },
  /** Input */
  input: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1c1c1e',
    marginBottom: 6,
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
  /** Button */
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    backgroundColor: '#FD6B68',
    borderColor: '#FD6B68',
  },
  btnText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  errorText: {
    color: 'red',
    marginTop: -10, 
    marginBottom: 10, 
  }
})