import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  AsyncStorge
} from 'react-native';
import {SERVER_ADDRESS} from './src/constants/ServerConstants'

import AppNavigator from './src/navigation/AppNavigator';

export default class App extends React.Component {



    async componentDidMount() {
      await AsyncStorge.setItem('serverURL', SERVER_ADDRESS)
    }

    render() {
      return <AppNavigator />
      
    }

}
