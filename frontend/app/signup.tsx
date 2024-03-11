import React, { useState } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  TouchableOpacity,
  Text,
  TextInput,
  Image
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Formik } from 'formik';
import * as yup from 'yup';
import { router } from 'expo-router';

export default function Example() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });

  const validationSchema = yup.object().shape({
    username: yup.string().required('Username is required'),
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
  });

  const handleSubmit = (values: { username: string; email: string; password: string; firstName: string; lastName: string; }) => {
    console.log(values); // You can add your logic for form submission here
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4EFF3' }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              // handle onPress
              router.back();
            }}
            style={styles.backBtn}>
            <Image
              source={require('../assets/icons/back.png')}
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
            onSubmit={(values) => handleSubmit(values)}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
              <View style={styles.form}>
                <View style={styles.input}>
                  <Text style={styles.inputLabel}>Username</Text>

                  <TextInput
                    onChangeText={handleChange('username')}
                    onBlur={handleBlur('username')}
                    placeholder="e.g. johndoe"
                    placeholderTextColor="#6b7280"
                    style={styles.inputControl}
                    value={values.username} />
                </View>
                {touched.username && errors.username &&
                  <Text style={styles.errorText}>{errors.username}</Text>
                }

                <View style={styles.input}>
                  <Text style={styles.inputLabel}>First Name</Text>

                  <TextInput
                    onChangeText={handleChange('firstName')}
                    onBlur={handleBlur('firstName')}
                    placeholder="e.g. John"
                    placeholderTextColor="#6b7280"
                    style={styles.inputControl}
                    value={values.firstName} />
                </View>
                {touched.firstName && errors.firstName &&
                  <Text style={styles.errorText}>{errors.firstName}</Text>
                }

                <View style={styles.input}>
                  <Text style={styles.inputLabel}>Last Name</Text>

                  <TextInput
                    onChangeText={handleChange('lastName')}
                    onBlur={handleBlur('lastName')}
                    placeholder="e.g. Doe"
                    placeholderTextColor="#6b7280"
                    style={styles.inputControl}
                    value={values.lastName} />
                </View>
                {touched.lastName && errors.lastName &&
                  <Text style={styles.errorText}>{errors.lastName}</Text>
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
                    <Text style={styles.btnText}>Sign up</Text>
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
  },
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
  
});
