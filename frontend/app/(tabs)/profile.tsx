import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Switch,
  Image,
} from 'react-native';


export default function TabAccountScreen() {
  const [form, setForm] = useState({
    darkMode: false,
    emailNotifications: true,
    pushNotifications: false,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.container}>
        <View style={styles.profile}>
          <View>
            <Text style={styles.profileName}>Tomy Romero</Text>

            <Text style={styles.profileEmail}>
              tomyfletcher99@hotmail.com
            </Text>
          </View>
        </View>

        <ScrollView>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>

            <TouchableOpacity
              onPress={() => {
                // handle onPress
              }}
              style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: '#fe9400' }]}>
              <Image
                            source={require('../../assets/icons/gallery.png')}
                            resizeMode="contain"
                            style={{
                                width: 35,
                                height: 35,
                            }}
                    />
              </View>

              <Text style={styles.rowLabel}>Language</Text>

              <View style={styles.rowSpacer} />

              <Image
                            source={require('../../assets/icons/right.png')}
                            resizeMode="contain"
                            style={{
                                width: 35,
                                height: 35,
                            }}
                    />
            </TouchableOpacity>

            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: '#007afe' }]}>
              <Image
                            source={require('../../assets/icons/gallery.png')}
                            resizeMode="contain"
                            style={{
                                width: 35,
                                height: 35,
                            }}
                    />
              </View>

              <Text style={styles.rowLabel}>Dark Mode</Text>

              <View style={styles.rowSpacer} />

              <Switch
                onValueChange={darkMode => setForm({ ...form, darkMode })}
                value={form.darkMode} />
            </View>

            <TouchableOpacity
              onPress={() => {
                router.push('/login')
              }}
              style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: '#32c759' }]}>
              <Image
                            source={require('../../assets/icons/gallery.png')}
                            resizeMode="contain"
                            style={{
                                width: 35,
                                height: 35,
                            }}
                    />
              </View>

              <Text style={styles.rowLabel}>Login</Text>

              <View style={styles.rowSpacer} />

              <Image
                            source={require('../../assets/icons/right.png')}
                            resizeMode="contain"
                            style={{
                                width: 35,
                                height: 35,
                            }}
                    />
            </TouchableOpacity>

            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: '#38C959' }]}>
              <Image
                            source={require('../../assets/icons/gallery.png')}
                            resizeMode="contain"
                            style={{
                                width: 35,
                                height: 35,
                            }}
                    />
              </View>

              <Text style={styles.rowLabel}>Email Notifications</Text>

              <View style={styles.rowSpacer} />

              <Switch
                onValueChange={emailNotifications =>
                  setForm({ ...form, emailNotifications })
                }
                value={form.emailNotifications} />
            </View>

            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: '#38C959' }]}>
              <Image
                            source={require('../../assets/icons/gallery.png')}
                            resizeMode="contain"
                            style={{
                                width: 35,
                                height: 35,
                            }}
                    />
              </View>

              <Text style={styles.rowLabel}>Push Notifications</Text>

              <View style={styles.rowSpacer} />

              <Switch
                onValueChange={pushNotifications =>
                  setForm({ ...form, pushNotifications })
                }
                value={form.pushNotifications} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resources</Text>

            <TouchableOpacity
              onPress={() => {
                // handle onPress
              }}
              style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: '#8e8d91' }]}>
              <Image
                            source={require('../../assets/icons/gallery.png')}
                            resizeMode="contain"
                            style={{
                                width: 35,
                                height: 35,
                            }}
                    />
              </View>

              <Text style={styles.rowLabel}>Report Bug</Text>

              <View style={styles.rowSpacer} />

              <Image
                            source={require('../../assets/icons/right.png')}
                            resizeMode="contain"
                            style={{
                                width: 35,
                                height: 35,
                            }}
                    />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                // handle onPress
              }}
              style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: '#007afe' }]}>
              <Image
                            source={require('../../assets/icons/gallery.png')}
                            resizeMode="contain"
                            style={{
                                width: 35,
                                height: 35,
                            }}
                    />
              </View>

              <Text style={styles.rowLabel}>Contact Us</Text>

              <View style={styles.rowSpacer} />

              <Image
                            source={require('../../assets/icons/right.png')}
                            resizeMode="contain"
                            style={{
                                width: 35,
                                height: 35,
                            }}
                    />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                // handle onPress
              }}
              style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: '#32c759' }]}>
              <Image
                            source={require('../../assets/icons/gallery.png')}
                            resizeMode="contain"
                            style={{
                                width: 35,
                                height: 35,
                            }}
                    />
              </View>

              <Text style={styles.rowLabel}>Rate in App Store</Text>

              <View style={styles.rowSpacer} />

              <Image
                            source={require('../../assets/icons/right.png')}
                            resizeMode="contain"
                            style={{
                                width: 35,
                                height: 35,
                            }}
                    />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  /** Profile */
  profile: {
    padding: 24,
    backgroundColor: '#fff',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileAction: {
    position: 'absolute',
    right: -4,
    bottom: -10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 9999,
    backgroundColor: '#007bff',
  },
  profileName: {
    marginTop: 20,
    fontSize: 19,
    fontWeight: '600',
    color: '#414d63',
    textAlign: 'center',
  },
  profileEmail: {
    marginTop: 5,
    fontSize: 16,
    color: '#989898',
    textAlign: 'center',
  },
  /** Section */
  section: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    paddingVertical: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#9e9e9e',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  /** Row */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 50,
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    marginBottom: 12,
    paddingLeft: 12,
    paddingRight: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 17,
    fontWeight: '400',
    color: '#0c0c0c',
  },
  rowSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
});