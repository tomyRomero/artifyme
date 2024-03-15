import "core-js/stable/atob";
import { jwtDecode } from "jwt-decode";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from "axios";

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






export const authenticate = async ()=> {
  //Get Token from asyncstorage
  const token = await getToken();

  if(!token)
  { 
    //If there is no token user is not logged in
    return false;
  }else{
    //If there is a token, ensure it is not expired or else user is not authenticated
   if(isTokenExpired(token))
   {
    return false;
   }else{
    //If token is not expired, make a request to a protected api route to get user details
    //inside fetchUser details we determine if user is fully authenticated(has peermissons to protected api endpoints) 
    //and then return boolean based on success
    return await fetchUserDetails(token);
   }
  }
}

// Function to fetch user details from the API protected route
export const fetchUserDetails = async (token: string) => {
  //The IP address of the same network my server and device using (iphone) are sharing ,
  // the port number of where the sever tomcat for java is running
  const apiUrl = process.env.EXPO_PUBLIC_JAVA_API_URL;

  try {
    //Use token as an authorization header to gain access to protected route, getTokenSubject returns the email stored in token
    //Use email to fetch user details from the serverside database and return them
    const response = await axios.get(`${apiUrl}/api/v1/user/${getTokenSubject(token)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status == 200) {
      return true;
      
    } else {
      //If there is an error something wrong happened so therefore set authentication to false
      //Throw an error if the response is not successful
      console.log(`HTTP error ${response.status}: ${response.statusText}`)
      return false;
    }
  } catch (error) {
    console.log("Error fetching user details:", error);
    return false;
  }
  };
