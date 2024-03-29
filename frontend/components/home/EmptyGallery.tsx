import React from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../../lib/constants';
import { router } from 'expo-router';
import { useAppContext } from '../../lib/AppContext';

const EmptyGallery = ({auth}: {auth: boolean}) => {

  const { theme } = useAppContext();

  const styles = getStyles(theme);

  return (
        <View style={styles.empty}>
          <View style={styles.fake}>
            <View style={styles.fakeCircle} />

            <View>
              <View style={[styles.fakeLine, { width: 120 }]} />

              <View style={styles.fakeLine} />

              <View
                style={[
                  styles.fakeLine,
                  { width: 70, marginBottom: 0 },
                ]} />
            </View>
          </View>

          <View style={[styles.fake, { opacity: 0.5 }]}>
            <View style={styles.fakeCircle} />

            <View>
              <View style={[styles.fakeLine, { width: 120 }]} />

              <View style={styles.fakeLine} />

              <View
                style={[
                  styles.fakeLine,
                  { width: 70, marginBottom: 0 },
                ]} />
            </View>
          </View>

          <Text style={styles.emptyTitle}>Your gallery is empty</Text>

          <Text style={styles.emptyDescription}>
            {auth? ("Once you create an artwork, you'll see them here."): ("Once you login and create an artwork, you'll see them here.")}
          </Text>

          <View style={styles.emptyFooter}>
          <TouchableOpacity
            onPress={() => {
              if(auth)
              {
                router.push("/create")
              }else{
                router.push("/login")
              }
            }}>
            <View style={styles.btn}>
              <View style={{ width: 29 }} />

              <Text style={styles.btnText}>
                {auth ? "Create" : "Login"}
                </Text>
              <View style={{ marginLeft: 12 }}>
                {theme === "light" ? ( <Image
                    source={require("./../../assets/icons/whiteright.png")}
                    style={styles.imageStyle} />) : ( <Image
                      source={require("./../../assets/icons/blackright.png")}
                      style={styles.imageStyle} />)}
                </View>
            </View>
          </TouchableOpacity>
        </View>

        </View>
  )
}

export default EmptyGallery;

const getStyles = (theme: string) => {
  return StyleSheet.create({
    empty: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      marginTop: -20
    },
    emptyTitle: {
      fontSize: 19,
      fontWeight: '700',
      color: theme === "light" ? '#222' : "#fff",
      marginBottom: 8,
      marginTop: 12,
    },
    emptyDescription: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '500',
      color: theme === "light" ? '#8c9197' : "#A0A5AB",
      textAlign: 'center',
    },
    fake: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    fakeCircle: {
      width: 44,
      height: 44,
      borderRadius: 9999,
      backgroundColor: '#e8e9ed',
      marginRight: 16,
    },
    fakeLine: {
      width: 200,
      height: 10,
      borderRadius: 4,
      backgroundColor: '#e8e9ed',
      marginBottom: 8,
    },
    emptyFooter: {
        marginTop: 50,
        alignSelf: 'stretch',
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
        color: theme === "light" ? '#fff' : "#000",
      },
      imageStyle: {
        width: 20, 
        height: 20, 
      },
      
  });
}
