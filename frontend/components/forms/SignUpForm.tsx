import React, { useState } from 'react';
import {
  StyleSheet,
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
import { Colors } from '../../lib/constants';
import { useAppContext } from '../../lib/AppContext';

const SignUpForm = () => {
    const {theme} = useAppContext();

    const [ loading, setLoading] = useState(false);
    const [form, setForm] = useState({
      email: '',
      password: '',
      confirmPassword: '',
      firstname: '',
      lastname: '',
    });
  
    const validationSchema = yup.object().shape({
      email: yup.string().email('Invalid email').required('Email is required'),
      password: yup
        .string()
        .min(6, 'Password must be at least 6 characters')
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[%&,!#])[A-Za-z\d%&,!#]{12,}$/,
          'Password must contain at least 1 uppercase letter, 1 number, and 1 symbol'
        )
        .required('Password is required'),
      confirmPassword: yup
        .string()
        .oneOf([yup.ref('password'), undefined], 'Passwords must match')
        .required('Confirm Password is required'),
      firstname: yup.string().required('First name is required'),
      lastname: yup.string().required('Last name is required'),
    });
    
    
    
    const submitForm = async (values: { email: string; password: string; firstname: string; lastname: string; }) => {
      setLoading(true)
      try {
        //The IP address of the same network my server and device using (iphone) are sharing,
        // the port number of where the sever tomcat for java is running
        const apiUrl = process.env.EXPO_PUBLIC_DOTNET_API_URL;
  
        const response = await fetch(`${apiUrl}/api/Users/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': '*/*'
          },
          body: JSON.stringify(values),
        });
        const data = await response.json();
        // Check if registration was successful
        if (response.ok) {
          Alert.alert('Registration Successful', 'You have been registered successfully.');
          router.push("/login")
        } else {
          Alert.alert('Registration Failed', data.errorMessage || 'An error occurred during registration.');
        }
      } catch (error) {
        console.log(error);
        Alert.alert('Error', 'An error occurred. Please try again later.');
      }
      
      setLoading(false)
    };

  const styles = getStyles(theme);

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
              placeholder="John"
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
              placeholder="Doe"
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
              placeholder="john@example.com"
              placeholderTextColor="#6b7280"
              style={styles.inputControl}
              value={values.email} />
          </View>
          {touched.email && errors.email &&
            <Text style={styles.errorText}>{errors.email}</Text>
          }

    <View style={styles.inputValidation}>
              <View style={styles.inputValidationRow}>
                {theme === "light" ? ( <Image
                    source={require("../../assets/icons/checkmark.png")}
                    style={{ width: 20, height: 20 }}
                  />):(
                    <Image
                    source={require("../../assets/icons/whitecheckmark.png")}
                    style={{ width: 20, height: 20 }}
                  />
                    )}

                <Text style={styles.inputValidationRowText}>
                  Minimum of 6 characters
                </Text>
              </View>

              <View
                style={[
                  styles.inputValidationRow,
                ]}>
                {theme === "light" ? ( <Image
                    source={require("../../assets/icons/checkmark.png")}
                    style={{ width: 20, height: 20 }}
                  />):(
                    <Image
                    source={require("../../assets/icons/whitecheckmark.png")}
                    style={{ width: 20, height: 20 }}
                  />
                    )}

                <Text style={styles.inputValidationRowText}>
                  At least 1 upper case (A-Z)
                </Text>
              </View>

              <View style={styles.inputValidationRow}>
                {theme === "light" ? ( <Image
                  source={require("../../assets/icons/checkmark.png")}
                  style={{ width: 20, height: 20 }}
                 />):(
                  <Image
                  source={require("../../assets/icons/whitecheckmark.png")}
                  style={{ width: 20, height: 20 }}
                 />
                  )}

                <Text style={styles.inputValidationRowText}>
                  At least 1 number (0-9)
                </Text>
              </View>

              <View
                style={[
                  styles.inputValidationRow,
                ]}>
                  {theme === "light" ? ( <Image
                  source={require("../../assets/icons/checkmark.png")}
                  style={{ width: 20, height: 20 }}
                 />):(
                  <Image
                  source={require("../../assets/icons/whitecheckmark.png")}
                  style={{ width: 20, height: 20 }}
                 />
                  )}

                <Text style={styles.inputValidationRowText}>
                  At least 1 symbol (%&,!#)
                </Text>
              </View>
            </View>

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

        <View style={styles.input}>
            <Text style={styles.inputLabel}>Confirm Password</Text>

            <TextInput
              onChangeText={handleChange('confirmPassword')}
              onBlur={handleBlur('confirmPassword')}
              autoCorrect={false}
              placeholder="********"
              placeholderTextColor="#6b7280"
              style={styles.inputControl}
              secureTextEntry={true}
              value={values.confirmPassword} />
          </View>
          {touched.confirmPassword && errors.confirmPassword &&
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
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

const getStyles = (theme: string) => {
  return StyleSheet.create({
    header: {
        paddingHorizontal: 24,
        marginBottom: -20
      },
      backBtn: {
        width: 40,
        height: 40,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme === "light" ? Colors.primary : Colors.third,
        marginBottom: 16,
      },
      title: {
        fontSize: 34,
        fontWeight: 'bold',
        color: theme === "light" ? Colors.primary : Colors.third,
        marginBottom: 36,
        alignSelf: "center"
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
        color: theme === "light" ? 'black' : 'white',
        textAlign: 'center',
      },
      /** Input */
      input: {
        marginBottom: 16,
      },
      inputLabel: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme === "light" ? '#1c1c1e' : "#fff",
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
        backgroundColor: theme === "light" ? Colors.primary : Colors.third,
        borderColor: 'black',
      },
      btnText: {
        fontSize: 17,
        lineHeight: 22,
        fontWeight: 'bold',
        color: theme === "light" ? '#fff' : "#000",
      },
      errorText: {
        color: 'red',
        marginTop: -10, 
        marginBottom: 10, 
      },
      inputValidation: {
        marginBottom: 12,
      },
      inputValidationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginBottom: 6,
      },
      inputValidationRowText: {
        fontSize: 13,
        fontWeight: '500',
        color: theme === "light" ? '#292b32' : "white",
        marginLeft: 5,
      },
      headerIcon: {
        alignSelf: 'center',
        width: 80,
        height: 80,
        marginBottom: 20,
        backgroundColor: '#fff',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
      },
    })
}
