import React from 'react'
import { View, ScrollView, Text, Image, AsyncStorage, TouchableHighlight} from 'react-native'
import { Card } from 'react-native-elements' 
import Colors from '../constants/Colors'

export default class StreetScreen extends React.Component {

    static navigationOptions =  ({ navigation }) => {
        const { params } = navigation.state;
        return params;
    }

    constructor() {
        super()
        this.state = {
            user: null,
            title: ''
        }
    }

    async componentDidMount() {
        let user = await AsyncStorage.getItem('user')
        user = JSON.parse(user)
        this.setState({user})
        console.log('balance', user.balance)
        const { navigation } = this.props;
        const name = navigation.getParam('name','there is no details ')
        this.props.navigation.setParams({
            title: `${name} Street`, 
            // headerRight: (
            //     <Text style={{marginRight: 20, color: 'white'}}>{user.balance} NIS</Text>
            // ),
        })
    }


    

    render() {
        return (
            <ScrollView>
                <View style={styles.Wrapper}>
                    <TouchableHighlight underlayColor={Colors.lightGray} onPress={()=>{this.props.navigation.navigate('Zone',{name: 'Zone 1', id: 1})}} style={{margin:3, width:'45%',}}>
                        <Card containerStyle={styles.CardStyle}>
                            <Image 
                                resizeMode="cover"
                                source={require('../../assets/Images/Jaffa/1.jpg')}
                                style={{width:'100%', height:150}}
                            />
                            <Text style={{fontSize:20, fontWeight:'700', color:Colors.primary}}>Zone 1</Text>
                            <Text style={{fontSize:20, fontWeight:'700', color:Colors.primary}}>0 Meters</Text>
                        </Card>
                    </TouchableHighlight>
                    <TouchableHighlight underlayColor={Colors.lightGray} onPress={()=>{this.props.navigation.navigate('Zone',{name: 'Zone 2', id: 2})}} style={{margin:3, width:'45%',}}>
                        <Card containerStyle={styles.CardStyle}>
                            <Image 
                                resizeMode="cover"
                                source={require('../../assets/Images/Jaffa/2.jpg')}
                                style={{width:'100%', height:150}}
                            />
                            <Text style={{fontSize:20, fontWeight:'700', color:Colors.primary}}>Zone 2</Text>
                            <Text style={{fontSize:20, fontWeight:'700', color:Colors.primary}}>280 Meters</Text>
                        </Card>
                    </TouchableHighlight>
                    <TouchableHighlight underlayColor={Colors.lightGray} onPress={()=>{this.props.navigation.navigate('Zone',{name: 'Zone 3', id: 3})}} style={{margin:3, width:'45%',}}>
                        <Card containerStyle={styles.CardStyle}>
                            <Image 
                                resizeMode="cover"
                                source={require('../../assets/Images/Jaffa/3.jpg')}
                                style={{width:'100%', height:150}}
                            />
                            <Text style={{fontSize:20, fontWeight:'700', color:Colors.primary}}>Zone 3</Text>
                            <Text style={{fontSize:20, fontWeight:'700', color:Colors.primary}}>440 Meters</Text>
                        </Card>
                    </TouchableHighlight>
                    <TouchableHighlight underlayColor={Colors.lightGray} onPress={()=>{this.props.navigation.navigate('Zone',{name: 'Zone 4', id: 4})}} style={{margin:3, width:'45%',}}>
                        <Card containerStyle={styles.CardStyle}>
                            <Image 
                                resizeMode="cover"
                                source={require('../../assets/Images/Jaffa/4.jpg')}
                                style={{width:'100%', height:150}}
                            />
                            <Text style={{fontSize:20, fontWeight:'700', color:Colors.primary}}>Zone 4</Text>
                            <Text style={{fontSize:20, fontWeight:'700', color:Colors.primary}}>680 Meters</Text>
                        </Card>
                    </TouchableHighlight>
                    <TouchableHighlight underlayColor={Colors.lightGray} onPress={()=>{this.props.navigation.navigate('Zone',{name: 'Zone 5', id: 5})}} style={{margin:3, width:'45%',}}>
                        <Card containerStyle={styles.CardStyle}>
                            <Image 
                                resizeMode="cover"
                                source={require('../../assets/Images/Jaffa/5.jpg')}
                                style={{width:'100%', height:150}}
                            />
                            <Text style={{fontSize:20, fontWeight:'700', color:Colors.primary}}>Zone 5</Text>
                            <Text style={{fontSize:20, fontWeight:'700', color:Colors.primary}}>900 Meters</Text>
                        </Card>
                    </TouchableHighlight>
                    <TouchableHighlight underlayColor={Colors.lightGray} onPress={()=>{this.props.navigation.navigate('Zone',{name: 'Zone 6', id: 6})}} style={{margin:3, width:'45%',}}>
                        <Card containerStyle={styles.CardStyle}>
                            <Image 
                                resizeMode="cover"
                                source={require('../../assets/Images/Jaffa/6.jpg')}
                                style={{width:'100%', height:150}}
                            />
                            <Text style={{fontSize:20, fontWeight:'700', color:Colors.primary}}>Zone 6</Text>
                            <Text style={{fontSize:20, fontWeight:'700', color:Colors.primary}}>1050 Meters</Text>
                        </Card>
                    </TouchableHighlight>

                </View>
            </ScrollView>
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