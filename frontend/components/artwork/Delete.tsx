import axios from 'axios';
import React, { useRef } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import { getToken, isTokenExpired } from '../../lib/utils';
import { router } from 'expo-router';
import { useAppContext } from '../../lib/AppContext';

export default function DeleteArtwork({sheet, id}: any) {

    const { deleted, setDeleted} = useAppContext();

    const handleCancel = ()=> {
        if (sheet.current) {
            sheet.current.close();
        }
    }
    
    const handleDelete = async ()=> {
        try{

        const token = await getToken();

        if(!token || isTokenExpired(token))
        {
              Alert.alert("Login Credentials invalid/expired, login again")
              return;
        }
        
        const headers = {
            Authorization: `Bearer ${token}`,
          };

        const javaApiUrl = process.env.EXPO_PUBLIC_JAVA_API_URL;

        const response = await axios.delete(`${javaApiUrl}/api/v1/artwork?id=${id}`, { headers });
        
        if (response.status === 200) {
            setDeleted(!deleted)
            router.push("/")
          } else {
            Alert.alert('Failure: ', response.data.message);
          }

        }catch(error)
        {
            Alert.alert(`Error Occured: ${error}`)
        }
    }


  return (
      <RBSheet
        customStyles={{ container: styles.sheet }}
        height={300}
        openDuration={250}
        ref={sheet}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Warning</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.bodyText}>
            Are you sure you want to
            <Text style={{ fontWeight: '600' }}> delete this artwork</Text>?
            {'\n'}
            You won't be able to undo this action.
          </Text>

          <TouchableOpacity
            onPress={handleDelete}>
            <View style={styles.btn}>
              <Text style={styles.btnText}>Delete</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.bodyGap} />

          <TouchableOpacity
            onPress={handleCancel}>
            <View style={styles.btnSecondary}>
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </View>
          </TouchableOpacity>
        </View>
      </RBSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  /** Placeholder */
  placeholder: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    height: 400,
    marginTop: 0,
    padding: 24,
    backgroundColor: 'transparent',
  },
  placeholderInset: {
    borderWidth: 4,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 9,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  /** Header */
  header: {
    borderBottomWidth: 1,
    borderColor: '#efefef',
    padding: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  /** Body */
  body: {
    padding: 24,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    color: '#0e0e0e',
    marginBottom: 24,
    textAlign: 'center',
  },
  bodyGap: {
    marginBottom: 12,
  },
  /** Button */
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    backgroundColor: '#ff3c2f',
    borderColor: '#ff3c2f',
  },
  btnText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: '#fff',
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    backgroundColor: 'transparent',
    borderColor: '#dddce0',
  },
  btnSecondaryText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: '#000',
  },
});