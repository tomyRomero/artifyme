import { router } from 'expo-router';
import React from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  TouchableOpacity,
  Text,
  Image,
} from 'react-native';
import { Colors } from '../lib/constants';

const tags = ['react','next','java','mySql','web','ui', 'ux', 'aws'];
const stats = [
  { label: 'Location', value: 'USA' },
  { label: 'Job Type', value: 'In search' },
  { label: 'Experience', value: 'junior' },
];

export default function Contact() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.backgroundlight }}>
      <View style={styles.container}>
        <View style={styles.content}>
        <TouchableOpacity
          onPress={() => {
            router.back();
          }}
          style={styles.backBtn}>
          <Image
            source={require('./../assets/icons/back.png')}
            resizeMode="contain"
            style={{
              width: 35,
              height: 35,
            }}
          />
          </TouchableOpacity>
          <View style={styles.profile}>
            <View style={styles.profileTop}>
              <View style={styles.avatar}>
                <Image
                  alt="dev porfile image"
                  source={require('../assets/images/tomyRomero.jpeg')}
                  style={styles.avatarImg} />
                <View style={styles.avatarNotification} />
              </View>
              <View style={styles.profileBody}>
                <Text style={styles.profileTitle}>{'Tomy\nRomero'}</Text>
                <Text style={styles.profileSubtitle}>
                  Junior Dev
                  {' · '}
                  <Text style={{ color: '#266EF1' }}>University of the Virgin Islands</Text>
                </Text>
              </View>
            </View>
            <Text style={styles.profileDescription}>
              Skilled in creating typescript react/react native frontends, with CSS as well as java and node backends, with cloud devloper foundations in AWS as well as experince with mySQL and MongoDB
            </Text>
            <View style={styles.profileTags}>
              {tags.map((tag, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    // handle onPress
                  }}>
                  <Text style={styles.profileTagsItem}>#{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.stats}>
            {stats.map(({ label, value }, index) => (
              <View
                key={index}
                style={[
                  styles.statsItem,
                  index === 0 && { borderLeftWidth: 0 },
                ]}>
                <Text style={styles.statsItemText}>{label}</Text>
                <Text style={styles.statsItemValue}>{value}</Text>
              </View>
            ))}
          </View>
          <View style={styles.btnGroup}>
            <TouchableOpacity
              onPress={() => {
                // handle onPress
              }}
              style={{ flex: 1, paddingHorizontal: 6 }}>
              <View style={styles.btn}>
                <Text style={styles.btnText}>Follow</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                // handle onPress
              }}
              style={{ flex: 1, paddingHorizontal: 6 }}>
              <View style={styles.btnPrimary}>
                <Text style={styles.btnPrimaryText}>Message</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  content: {
    paddingHorizontal: 24,
  },
  /** Profile */
  profile: {
    marginTop: 70,
    paddingVertical: 18,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  profileBody: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    paddingLeft: 16,
  },
  profileTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 32,
    color: '#121a26',
    marginBottom: 6,
  },
  profileSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#778599',
  },
  profileDescription: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
    color: '#778599',
  },
  profileTags: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  profileTagsItem: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    color: Colors.primary,
    marginRight: 4,
  },
  /** Avatar */
  avatar: {
    position: 'relative',
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 9999,
  },
  avatarNotification: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: '#fff',
    bottom: 0,
    right: -2,
    width: 21,
    height: 21,
    backgroundColor: '#22C55E',
  },
  /** Stats */
  stats: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: 20,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 1,
  },
  statsItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    borderLeftWidth: 1,
    borderColor: 'black',
  },
  statsItemText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    color: 'black',
    marginBottom: 5,
  },
  statsItemValue: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    color: Colors.primary,
  },
  /** Button */
  btn: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderColor: Colors.primary,
  },
  btnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: -6,
    marginTop: 18,
  },
  btnText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: Colors.primary,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  btnPrimaryText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#fff',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary ,
    marginTop: 10,
    marginBottom: 16,
  },
});
