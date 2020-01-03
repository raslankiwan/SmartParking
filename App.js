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
// import {SERVER_ADDRESS} from './src/constants/ServerConstants'

import firebase from 'firebase'
import AppNavigator from './src/navigation/AppNavigator';
console.disableYellowBox = true;
export default class App extends React.Component {



    async componentDidMount() {
        const config = {
          apiKey: "AIzaSyCk2R8cfwAYCZeKW4bB4ONT4jE8t16TIU4",
          authDomain: "smart-parking-b5423.firebaseapp.com",
          databaseURL: "https://smart-parking-b5423.firebaseio.com",
          projectId: "smart-parking-b5423",
          storageBucket: "smart-parking-b5423.appspot.com",
          messagingjsonerId: "178342707522",
          appId: "1:178342707522:web:86ecbbf2e5e71fc7e0c8db",
          measurementId: "G-L06Z9HX6KM"
        };
        firebase.initializeApp(config);
    }


    render() {
      return <AppNavigator />
      
    }

}
