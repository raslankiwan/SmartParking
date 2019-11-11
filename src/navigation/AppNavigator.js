import React from 'react';
import { createAppContainer, createStackNavigator } from 'react-navigation';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen'

const RootStack = createStackNavigator(
  {
      Home: {
          screen: HomeScreen,
      },
      Login: {
          screen: LoginScreen,
      },
    //   Add: {
    //       screen: AddForm,
    //   },
    //   LocalData: {
    //     screen: LocalData
    //   }
  },
  {
      initialRouteName: 'Login',
      defaultNavigationOptions: {
          headerStyle: {
              backgroundColor: '#f4511e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
              fontWeight: 'bold',
          },
      },
  }
);

// export default createAppContainer(RootStack)

export default createAppContainer(RootStack);