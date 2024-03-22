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
import { fetchUserDetailsWithReturn, removeToken } from '../../lib/utils';
import { useIsFocused } from '@react-navigation/native';
import { Colors } from '../../lib/constants';
import { useAppContext } from '../../lib/AppContext';

export default function TabAccountScreen() {

  const { authenticated, setAuthenticated, screen, setScreen} = useAppContext();

  const [loading, setLoading] =  useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [form, setForm] = useState({
    darkMode: false,
  });



  const initializeProfile = async ()=> {
    //If the screen is focused that means the screen has changed, 
      //Switch the global state of screen, so that global state runs checks if authenticated
      setScreen(!screen);  

      if(authenticated)
      {
        const data = await fetchUserDetailsWithReturn()

        if(data)
        {
          const { name , email} = data;
          setName(name);
          setEmail(email);
        }else{
          setAuthenticated(false);
        }
      }

      setLoading(false);
  }

  //Track whether the screen is focused
  const isFocused = useIsFocused(); 

  useEffect(() => {
    if (isFocused) {
      initializeProfile();
    }

  }, [isFocused]);

  const handleLogin = () => {
    router.push('/login');
  };

  const handleLogout = async () => {
    setLoading(true)
    await removeToken();
    setAuthenticated(false);
    router.push('/');
  };

 
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
    {loading ? (
     <View style={styles.container}>
      <View style={{marginTop:100}}>
          <ActivityIndicator size={"large"} color={"black"}/>
      </View>
      </View>
    ): (
       <View style={styles.container}>

       <View style={styles.profile}>
         {authenticated ? ( 
         <View>
           <Text style={styles.profileName}>{name}</Text>
           <Text style={styles.profileEmail}>
             {email}
           </Text>
         </View>) 
         : 
         (<View>
           <Text style={styles.profileName}>Welcome Guest</Text>
         </View>
         ) 
         }
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

          {authenticated && ( <TouchableOpacity
             onPress={() => {
              
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
          {authenticated ? ( <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
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
    backgroundColor: Colors.backgroundlight,
  },

  profile: {
    marginTop: -20,
    padding: 24,
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
    color: '#414d63',
    textAlign: 'center',
  },

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

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 50,
    backgroundColor: '#ffffff',
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