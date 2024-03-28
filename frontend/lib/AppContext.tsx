import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { authenticate } from './utils';

// Define the types for the context
type AppContextProps = {
  // Define state and methods here
  theme: any;
  setTheme: React.Dispatch<React.SetStateAction<any>>;

  paths: any,
  setPaths: React.Dispatch<React.SetStateAction<any>>;

  token: any,
  setToken: React.Dispatch<React.SetStateAction<any>>;

  authenticated: any,
  setAuthenticated: React.Dispatch<React.SetStateAction<any>>;

  screen: any;
  setScreen: React.Dispatch<React.SetStateAction<any>>;

  newArtwork: any;
  setNewArtwork: React.Dispatch<React.SetStateAction<any>>;

  deleted: any;
  setDeleted: React.Dispatch<React.SetStateAction<any>>;

  pathsChanged: any;
  setPathsChanged: React.Dispatch<React.SetStateAction<any>>;

  updateArtwork: any;
  setUpdateArtwork: React.Dispatch<React.SetStateAction<any>>;
};

// Create the AppContext with an initial value of undefined
const AppContext = createContext<AppContextProps | undefined>(undefined);

// Create the AppProvider component that will wrap your application
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize the state using the useState hook

  //For theme purposes
  const [theme, setTheme] = useState(useColorScheme());

  //Save the state of the drawing
  const [paths, setPaths] = useState<{ path: string[], color: string, size: number }[]>([]);

  //JWT Token
  const [token, setToken] = useState(null);

  //If User Is Authenticated
  const [authenticated, setAuthenticated] = useState(false);

  //Marker if a screen changes
  const [screen, setScreen] = useState(false);

  //Marker for when a new artwork is made
  const [newArtwork, setNewArtwork] = useState(false);

  //Marker for when an artwork is deleted
  const [deleted, setDeleted] = useState(false);

  //Marker if init paths have been changed when editing, to decide whether to generate new image
  const [pathsChanged, setPathsChanged] = useState(false);

  //Marker for when an artwork is updated
  const [updateArtwork , setUpdateArtwork] = useState(false);

  // Provide the context value to the children components, include additional states if there are any
  const contextValue: AppContextProps = {
    setTheme, theme,
    paths, setPaths,
    token, setToken,
    authenticated, setAuthenticated,
    screen, setScreen,
    newArtwork , setNewArtwork,
    deleted, setDeleted, 
    pathsChanged, setPathsChanged,
    updateArtwork, setUpdateArtwork
  };

  useEffect(()=> {
    const startUpAuthenticate = async () => {
      setAuthenticated(await authenticate());
    }
    startUpAuthenticate();
  }, [screen])

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

// Create a custom hook (useAppContext) to easily access the context
export const useAppContext = () => {
  // Use the useContext hook to access the AppContext
  const context = useContext(AppContext);

  // Throw an error if the hook is not used within an AppProvider
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }

  // Return the context value
  return context;
};
