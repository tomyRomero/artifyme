import "core-js/stable/atob";
import { jwtDecode } from "jwt-decode";
import AsyncStorage from '@react-native-async-storage/async-storage';

  export const storeToken = async (value: string) => {
    try {
      await AsyncStorage.setItem('@token', value);
      console.log('Token saved successfully');
    } catch (e) {
      console.log(e)
    }
  };

  export const removeToken = async () => {
    try {
      await AsyncStorage.removeItem('@token');
      console.log('Token removed successfully');
    } catch (e) {
      console.error('Error removing token:', e);
    }
  };

export const getToken = async () => {
  try {
    const value = await AsyncStorage.getItem('@token');
    if (value !== null) {
      console.log("Token Found in Storage");
      return value;
    }else{
      console.log("No Token Found in Storage");
      return null;
    }
  } catch (e) {
    console.log(e)
    return null;
  }
};

// Check if the token is expired
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwtDecode(token);

    if (!decoded.exp) return false; 

    //decoded time comes in seconds , make sure both are in seconds format
    let current_time = Math.floor(Date.now() / 1000); // Current time in seconds
    if (current_time >= decoded.exp) {
      console.log("token expired")
      return true;
    } else {
      console.log("token up to date")
      return false;
    }
    

  } catch (e) {
    console.log("decode error", e);
    return false;
  }
};

// Get the subject from the token
export const getTokenSubject = (token: string): string => {
  try {
    const decoded = jwtDecode(token);
    return decoded.sub || ''; // Return the subject or null if not found
  } catch (e) {
    console.error("Error decoding token:", e);
    return '';
  }
};