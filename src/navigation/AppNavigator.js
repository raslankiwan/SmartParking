import React from 'react';
import { createAppContainer } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack'
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen'
import RegisterScreen from '../screens/RegisterScreen';
import Colors from '../constants/Colors';
import StreetScreen from '../screens/StreetScreen';
import ZoneScreen from '../screens/ZoneScreen';
import MyBooks from '../screens/MyBooks';

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
      },
      MyBooks: {
          screen: MyBooks
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
          headerTitleAlign: 'center'
         
      },
  }
);

// export default createAppContainer(RootStack)

export default createAppContainer(RootStack);