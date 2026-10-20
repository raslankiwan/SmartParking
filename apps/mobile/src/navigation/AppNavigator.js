import React from 'react';
import MyBooks from '../screens/MyBooks';
import {createAppContainer, createStackNavigator} from 'react-navigation';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import Colors from '../constants/Colors';
import StreetScreen from '../screens/StreetScreen';
import ZoneScreen from '../screens/ZoneScreen';

const RootStack = createStackNavigator(
  {
    MyBooks: {screen: MyBooks},
    Home: {
      screen: HomeScreen,
    },
    Login: {
      screen: LoginScreen,
    },
    Register: {
      screen: RegisterScreen,
    },
    Street: {
      screen: StreetScreen,
    },
    Zone: {
      screen: ZoneScreen,
    },
  },
  {
    initialRouteName: 'Login',
    defaultNavigationOptions: {
      headerStyle: {
        backgroundColor: Colors.secondary,
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1,
      },
    },
  },
);

// export default createAppContainer(RootStack)

export default createAppContainer(RootStack);
