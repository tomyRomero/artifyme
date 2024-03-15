import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Switch,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useAppContext } from '../../lib/AppContext';
import { isTokenExpired, getTokenSubject, getToken, removeToken } from '../../lib/utils';
import { useIsFocused } from '@react-navigation/native';
import axios from 'axios';
import { Colors } from '../../constants';



export default function TabAccountScreen() {

  const [ auth, setAuth] = useState(false);
  const [loading, setLoading] =  useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [form, setForm] = useState({
    darkMode: false,
  });

// Function to fetch user details from the API protected route
const fetchUserDetails = async () => {
  //Get Token from asyncstorage
  const token = await getToken();
  if(!token || isTokenExpired(token))
  {
    setAuth(false);
    return;
  }

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
      //If I am able to gain access to protected route and recieve user data then the user is authenticated, set state to reflect
      setName(`${response.data.firstname} ${response.data.lastname}`)
      setEmail(getTokenSubject(token))
      setAuth(true);
      
    } else {
      //If there is an error something wrong happened so therefore set authentication to false
      //Throw an error if the response is not successful
      console.log(`HTTP error ${response.status}: ${response.statusText}`)
      setAuth(false);
    }
  } catch (error) {
    console.log("Error fetching user details:", error);
    setAuth(false);
  }
};

  const authenticate = async ()=> {
    //start the authentication process
    setLoading(true);

    await fetchUserDetails()
    
    setLoading(false);
  }

  //Track whether the screen is focused
  const isFocused = useIsFocused(); 

  useEffect(() => {
    if (isFocused) {
      authenticate();
    }
  }, [isFocused]);

  const handleLogin = () => {
    router.push('/login');
  };

  const handleLogout = async () => {
    setLoading(true)
    await removeToken();
    router.push('/');

  };

 
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
    {loading ? (
     <View style={styles.profile}>
        <ActivityIndicator />
      </View>
    ): (
       <View style={styles.container}>

       <View style={styles.profile}>
         {auth ? ( <View>
           <Text style={styles.profileName}>{name}</Text>
           <Text style={styles.profileEmail}>
             {email}
           </Text>
         </View>) : (<View>
           <Text style={styles.profileName}>Welcome Guest</Text>
         </View>) }
       </View>
       <ScrollView>
         <View style={styles.section}>
           <Text style={styles.sectionTitle}>Preferences</Text>

           <View style={styles.row}>
             <View style={[styles.rowIcon]}>
             <Image
                           source={require('../../assets/icons/darkmode.png')}
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
               // handle onPress
             }}
             style={styles.row}>
             <View style={[styles.rowIcon]}>
             <Image
                           source={require('../../assets/icons/about.png')}
                           resizeMode="contain"
                           style={{
                               width: 35,
                               height: 35,
                           }}
                   />
             </View>

             <Text style={styles.rowLabel}>About</Text>

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
             <View style={[styles.rowIcon]}>
             <Image
                           source={require('../../assets/icons/contact.png')}
                           resizeMode="contain"
                           style={{
                               width: 35,
                               height: 35,
                           }}
                   />
             </View>

             <Text style={styles.rowLabel}>Contact Dev</Text>

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

          {auth && ( <TouchableOpacity
             onPress={() => {
               // handle onPress
             }}
             style={styles.row}>
             <View style={[styles.rowIcon]}>
             <Image
                           source={require('../../assets/icons/password.png')}
                           resizeMode="contain"
                           style={{
                               width: 35,
                               height: 35,
                           }}
                   />
             </View>

             <Text style={styles.rowLabel}>Change Password</Text>

             <View style={styles.rowSpacer} />

             <Image
                           source={require('../../assets/icons/right.png')}
                           resizeMode="contain"
                           style={{
                               width: 35,
                               height: 35,
                           }}
                   />
           </TouchableOpacity>)}
          
         </View>

         <View style={styles.centered}>
          {auth ? ( <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
           <Text style={styles.authButtonText}>Logout</Text>
         </TouchableOpacity>) : ( <TouchableOpacity onPress={handleLogin} style={styles.loginButton}>
           {loading ? (<ActivityIndicator color="#fff" />) : (<Text style={styles.authButtonText}>Login</Text>)}
           
           
         </TouchableOpacity>)}
        
       </View>
       </ScrollView>
     </View>
    )}
    
     
      
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
   /** Section */
  sectionBody: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  /** Profile */
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 9999,
    marginRight: 12,
  },
  profileBody: {
    marginRight: 'auto',
  },
  profileHandle: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '400',
    color: '#858585',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%', 
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    backgroundColor: '#FF0000', 
    borderRadius: 8,
    marginBottom: 12,
    paddingLeft: 12,
    paddingRight: 12,
    width: '90%'
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    backgroundColor: Colors.primary, 
    borderRadius: 8,
    marginBottom: 12,
    paddingLeft: 12,
    paddingRight: 12,
    width: '90%'
  },
  authButtonText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#fff', 
  },
});