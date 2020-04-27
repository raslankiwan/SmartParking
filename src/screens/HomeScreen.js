import React from 'react'
import { View, Text, Image, AsyncStorage, TouchableHighlight, BackHandler} from 'react-native'
import { Button, Card } from 'react-native-elements' 
import Colors from '../constants/Colors'
import Icon from 'react-native-vector-icons/FontAwesome'
import { TouchableWithoutFeedback } from 'react-native-gesture-handler'

export default class HomeScreen extends React.Component {

    // static navigationOptions = ({ navigation, navigationOptions }) => {
    //     return ({
    //       title: 'Home',
    //       headerTitleStyle :{textAlign: 'center', flex: 1},
    //       headerLeft:  <Button
    //                         title ="Logout"
    //                         onPress={async ()  =>{
    //                             await AsyncStorage.removeItem('user')
    //                             navigation.navigate('Login')
    //                         }}
    //                     />,
    //         headerRight: null
    //   });
    // }
    static navigationOptions =  ({ navigation }) => {
        const { params } = navigation.state;
        return params;
    }
    constructor() {
        super()
        this.state = {
            user: null,
            albums: []
        }
    }

    componentDidMount = async () => {
        BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
        let user = await AsyncStorage.getItem('user')
        user = JSON.parse(user)
        this.setState({user: user})
        console.log('uid: ', this.state.user)
        const { navigation } = this.props
        navigation.setParams({
            title: 'Home',
            headerRight: () => (
                <TouchableWithoutFeedback 
                    onPress={() => this.props.navigation.navigate('MyBooks')}>
                    <Text style={{marginRight: 20, color: 'white'}}>My Books</Text>
                </TouchableWithoutFeedback>
            ),
            headerLeft: () => <Button
                            type="clear"
                            title ="Logout"
                            titleStyle={{ color: 'red' }}
                            onPress={async ()  =>{
                                await AsyncStorage.removeItem('user')
                                navigation.navigate('Login')
                            }}
                            // icon={
                            //     <Icon 
                            //         name="sign-out-alt"
                            //         size={25}
                            //     />
                            // }
                        />,
          });
        
         // this.fetchStreets()

    }

    componentWillUnmount() {
        BackHandler.removeEventListener('hardwareBackPress', this.handleBackPress);
    }
    


    handleBackPress = () => {
        BackHandler.exitApp()
      }

    onFetchSuccess = async (json) => {
        console.log('Success')
    }
    
    onFetchFail = () => {
        console.log('Fail')
    }

    fetchStreets = () => {
    }
 
    render() {
        return(
            <View style={styles.Wrapper}>
                <TouchableHighlight underlayColor={Colors.lightGray} onPress={()=>{this.props.navigation.navigate('Street',{name: 'Jaffa'})}} style={{margin:3, width:'45%',}}>
                    <Card containerStyle={styles.CardStyle}>
                        <Image 
                            resizeMode="cover"
                            source={require('../../assets/Images/Jaffa/full_image.jpg')}
                            style={{width:'100%', height:150}}
                        />
                        <Text style={{fontSize:20, fontWeight:'700', color:Colors.primary}}>Jaffa st.</Text>
                    </Card>
                </TouchableHighlight>

            </View>
        )
    }
}

const styles={
    Wrapper:{
      flexDirection:'row', 
      flexWrap:'wrap',
       width:'100%'
    },
    CardStyle:{
      shadowColor: '#e5e6e8',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.5,
      shadowRadius: 6, 
      elevation:5, 
      width:'100%'  , 
      padding:7
    },
    btnStyle:{
      backgroundColor:Colors.secondary,
      width:'100%',
      borderRadius:10,
      borderColor:Colors.secondary,
      borderWidth:1 
    }, 
    btnText:{
      textAlign:'center', 
      fontSize:20, 
      fontWeight:'500', 
      color:'#f1e4e4'
    }, 
    TitleStyle:{
      color:Colors.primary, 
      fontSize:20, 
      fontWeight:'600', 
      margin:10, 
      textAlign:'center'
    }
  }