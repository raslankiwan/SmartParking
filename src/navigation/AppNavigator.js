import React from 'react';
import { createAppContainer, createStackNavigator } from 'react-navigation';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen'
import RegisterScreen from '../screens/RegisterScreen';
import Colors from '../constants/Colors';
import StreetScreen from '../screens/StreetScreen';
import ZoneScreen from '../screens/ZoneScreen';

const RootStack = createStackNavigator(
  {
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
        screen: StreetScreen
      },
      Zone: {
          screen: ZoneScreen,
          //navigationOptions: () => {headerTitle: 'this is respected'}
      }
  },
  {
      initialRouteName: 'Login',
      defaultNavigationOptions: {
          headerTitleStyle :{textAlign: 'center', flex: 1},
          headerStyle: {
              backgroundColor: Colors.secondary,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
              fontWeight: 'bold',
          },
         
      },
      headerLayoutPreset: 'center'
  }
);

// export default createAppContainer(RootStack)

export default createAppContainer(RootStack);