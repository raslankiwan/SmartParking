import React from 'react';

import firebase from 'firebase'
import AppNavigator from './src/navigation/AppNavigator';
console.disableYellowBox = true;
import PushNotification  from 'react-native-push-notification';
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
        if (firebase.apps.length === 0) {
          firebase.initializeApp(config);
        }

        
        PushNotification.configure({
          // (required) Called when a remote or local notification is opened or received
          onNotification: (notification) => {
            console.log('LOCAL NOTIFICATION ==>', notification)
          },
          
          popInitialNotification: true,
          requestPermissions: true
        })
    }


    render() {
      return <AppNavigator />
      
    }

}
