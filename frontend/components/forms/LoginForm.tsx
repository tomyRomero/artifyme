import React, { useState } from 'react';
import { router } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Formik } from 'formik';
import * as yup from 'yup';
import { storeToken } from '../../lib/utils';
import { Colors } from '../../lib/constants';
import { useAppContext } from '../../lib/AppContext';
import RainbowTitle from '../shared/RainbowTitle';


const INPUT_OFFSET = 110;

const LoginForm = () => {
    const [loading, setLoading] = useState(false);

    const {setAuthenticated, theme} = useAppContext();

    const validationSchema = yup.object().shape({
        email: yup.string().email('Invalid email').required('Email is required'),
        password: yup.string().required('Password is required'),
      });
    
      const handleSubmit = async (values: { email: string; password: string; }) => {
        try {
          setLoading(true)
          // Validate the form values
          await validationSchema.validate(values, { abortEarly: false });
      
          //The IP address of the same network my server and device using (iphone) are sharing ,
          // the port number of where the sever tomcat for java is running
          const apiUrl = process.env.EXPO_PUBLIC_DOTNET_API_URL;

          // If validation passes, attempt to log in
          const response = await fetch(`${apiUrl}/api/Auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(values),
          });
      
          // Handle the response
          if (response.ok) {
            const data = await response.json();
            // Save the token to local storage or state
            await storeToken(data.token)
            setAuthenticated(true);
            router.back();
            
          } else {
            // Handle login errors
            Alert.alert('Login failed:', response.statusText);
          }
        } catch (error) {
          // Handle validation errors
          Alert.alert(`Validation error:, ${error}`);
        }

        setLoading(false)
      };


  const styles = getStyles(theme);    

  return (
    <>
     <TouchableOpacity
          onPress={() => {
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
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Image
              source={require('../../assets/icons/art.png')}
              resizeMode="contain"
              style={{
                width: 55,
                height: 55,
              }}
            />
          </View>
         
            <Text style={styles.title}>
              Welcome to 
            </Text>
            <RainbowTitle titleText='ArtifyMe'/>
          <Text style={styles.subtitle}>Sign In To View Save Your Creations and View Saved Gallery</Text>
        </View>
        <Formik
          initialValues={{ email: '', password: '' }}
          validationSchema={validationSchema}
          onSubmit={(values) => handleSubmit(values)}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
            <View style={styles.form}>
              <View style={styles.input}>
                <Text style={styles.inputLabel}>Email address</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  placeholder=""
                  placeholderTextColor="#6b7280"
                  style={styles.inputControl}
                  value={values.email}
                />
              </View>
              {touched.email && errors.email &&
                <Text style={styles.errorText}>{errors.email}</Text>
              }
              <View style={styles.input}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  autoCorrect={false}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  placeholder=""
                  placeholderTextColor="#6b7280"
                  style={styles.inputControl}
                  secureTextEntry={true}
                  value={values.password}
                />
              </View>
              {touched.password && errors.password &&
                <Text style={styles.errorText}>{errors.password}</Text>
              }
                  <View style={styles.formAction}>
                  <TouchableOpacity onPress={() => handleSubmit()}>
                    <View style={[styles.btn, { opacity: loading ? 0.5 : 1 }]}>
                      {loading ? (
                        <ActivityIndicator color={theme === "light" ? Colors.primary : 'white'} />
                      ) : (
                        <Text style={styles.btnText}>Sign in</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  <View style={styles.separator} />
                  <View style={styles.orContainer}>
                    <Text style={styles.orText}>or</Text>
                  </View>
                  <TouchableOpacity onPress={() => { router.push('/signup') }}>
                    <View style={styles.btnSecondary}>
                      <Text style={styles.btnSecondaryText}>Sign up</Text>
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.formFooter}>
                    Portfolio Project
                    @2024 Tomy Romero
                  </Text>
                </View>

            </View>
          )}
        </Formik>
    </>
  )
}

export default LoginForm

const getStyles = (theme : string) => {
  return StyleSheet.create({
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme === "light" ? 'black' : 'white',
      marginBottom: 6,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 5,
      fontSize: 15,
      fontWeight: '500',
      color: theme === "light" ? '#929292' : '#A1A1A1',
      textAlign: 'center',
    },
    /** Header */
    header: {
      marginTop: -5,
      marginVertical: 36,
    },
    headerIcon: {
      alignSelf: 'center',
      width: 80,
      height: 80,
      marginBottom: 36,
      backgroundColor: '#fff',
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    /** Form */
    form: {
      marginBottom: 24,
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
    },
    formAction: {
      marginVertical: 24,
    },
    formActionSpacer: {
      marginVertical: 8,
    },
    formFooter: {
      marginTop: 10,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400',
      color: theme === "light" ? 'black' : 'white',
      textAlign: 'center',
    },
    input: {
      marginBottom: 16,
    },
    inputLabel: {
      position: 'absolute',
      width: INPUT_OFFSET,
      lineHeight: 44,
      top: 0,
      left: 0,
      bottom: 0,
      marginHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: '500',
      color: theme === "light" ?  Colors.primary : "black",
      zIndex: 9,
    },
    inputControl: {
      height: 44,
      backgroundColor: '#fff',
      paddingLeft: INPUT_OFFSET,
      paddingRight: 24,
      borderRadius: 12,
      fontSize: 15,
      fontWeight: '500',
      color: '#222',
    },
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderWidth: 1,
      backgroundColor: theme === "light" ? Colors.primary : Colors.third,
      borderColor: '#000',
    },
    btnText: {
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '600',
      color: theme ==="light" ? '#fff' : '#000',
    },
    separator: {
      height: 1,
      backgroundColor: theme === "light" ? '#ccc' : "fff",
      marginVertical: 20,
    },
    orContainer: {
      alignItems: 'center',
      marginTop: -10,
      marginVertical: 16,
    },
    orText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme === "light" ?  '#929292' : "#fff",
    },
    btnSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderWidth: 1,
      backgroundColor: 'transparent',
      borderColor: theme === "light" ? '#000' : '#fff',
    },
    btnSecondaryText: {
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '600',
      color: theme === "light" ? '#000' : '#fff',
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 9999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme === "light" ? Colors.primary : Colors.third,
      marginRight: 24,
    },
    errorText: {
      color: 'red',
      marginTop: -10, 
      marginBottom: 10
    },
  });
  
}
