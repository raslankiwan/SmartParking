import PushNotification  from 'react-native-push-notification';

// PushNotification.configure({
//   // (optional) Called when Token is generated (iOS and Android)
//   onRegister: function (token) {
//     console.log("TOKEN:", token);
//   },

//   // (required) Called when a remote or local notification is opened or received
//   onNotification: function (notification) {
//     console.log("NOTIFICATION:", notification);

//     // process the notification

//     // required on iOS only (see fetchCompletionHandler docs: https://github.com/react-native-community/react-native-push-notification-ios)
//     notification.finish(PushNotificationIOS.FetchResult.NoData);
//   },

//   // ANDROID ONLY: FCM Sender ID (product_number) (optional - not required for local notifications, but is need to receive remote push notifications)
//   senderID: "YOUR FCM SENDER ID",

//   // IOS ONLY (optional): default: all - Permissions to register.
//   permissions: {
//     alert: true,
//     badge: true,
//     sound: true,
//   },

//   // Should the initial notification be popped automatically
//   // default: true
//   popInitialNotification: true,

//   /**
//    * (optional) default: true
//    * - Specified if permissions (ios) and token (android and ios) will requested or not,
//    * - if not, you must call PushNotificationsHandler.requestPermissions() later
//    */
//   requestPermissions: true,
// });

// PushNotification.configure({
//   // (required) Called when a remote or local notification is opened or received
//   onNotification: function(notification) {
//     console.log('LOCAL NOTIFICATION ==>', notification)

//   },
  
//   popInitialNotification: true,
//   requestPermissions: true
// })


export const LocalNotification = (ms) => {
    // PushNotification.localNotification({
    //     autoCancel: true,
    //     bigText:
    //     'This is local notification demo in React Native app. Only shown, when expanded.',
    //     subText: 'Local Notification Demo',
    //     title: 'Local Notification Title',
    //     message: 'Expand me to see more',
    //     vibrate: true,
    //     vibration: 300,
    //     playSound: true,
    //     soundName: 'default',
    //     actions: '["Yes", "No"]'
    // })

    PushNotification.localNotificationSchedule({
      //... You can use all the options from localNotifications
      message: "Your parking will expire in 10 minutes",
      date: new Date(Date.now() + ms), // in 60 secs
      // actions: '["Yes", "No"]'

    });
}

// (function() {
//   // Register all the valid actions for notifications here and add the action handler for each action
//   PushNotificationAndroid.registerNotificationActions(['Accept','Reject','Yes','No']);
//   DeviceEventEmitter.addListener('notificationActionReceived', function(action){
//     console.log ('Notification action received: ' + action);
//     const info = JSON.parse(action.dataJSON);
//     if (info.action == 'Accept') {
//       // Do work pertaining to Accept action here
//     } else if (info.action == 'Reject') {
//       // Do work pertaining to Reject action here
//     }

//     // Add all the required actions handlers
//   });
// })();