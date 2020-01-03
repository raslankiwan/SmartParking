import React from 'react';
import { Text, TouchableWithoutFeedback, View,  ActivityIndicator,AsyncStorage, Alert } from 'react-native';
import {Button, Input} from 'react-native-elements'
import COLOR from '../constants/Colors'
import firebase from 'firebase'

class LoginScreen extends React.Component {

  static navigationOptions =  ({ navigation }) => {
    const { params } = navigation.state;
    return params;
}

  constructor(props) {
    super(props);
    this.state = {
      email: '',
      password: '',
      error:null, 
      emailError: '',
      passwordError: '',
      isLoading: false
    };
  }
  componentDidMount(){
    this.checkUserCredentialsExisting();
    this.props.navigation.setParams({
      title: 'Smart Parking',
    });
  }


  checkUserCredentialsExisting = async () =>{
    let user = await AsyncStorage.getItem('user');
    if (!user) {
    } else {
      user = JSON.parse(user);
      this.props.navigation.navigate('Home'); 
    }
  }


  onEmailChange(text) {
      let reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/ ;
      if(reg.test(text)) {
        this.setState({emailError: '', submit: true, email: text });
      } else if (text.length < 1) {
        this.setState({emailError: 'This field cannot be empty !!'});
      } else {
        this.setState({emailError: 'Invalid Email !!'});
      }
  }

  onPasswordChange(text) {
    if (text.length !== 0){
      this.setState({ passwordError: '', password: text });
    } else {
      this.setState({ passwordError: 'This field cannot be empty !!'})
    }
  }

  onLoginSuccess = async (json) => {
    this.setState({isLoading: false, email:'', password: ''})
    let user = json.user
    await AsyncStorage.setItem('user', user)
    this.props.navigation.navigate('Home', {balance: user.balance})
  }

  onLoginFail = (msg) => {
    this.setState({isLoading: false})
    Alert.alert('Login Error', msg)
  }

  userLogin = () => {
    this.setState({isLoading: true})
    let { email, password } = this.state
    if (email =='' || password=='') {
      this.onLoginFail('Please enter email and password')
    }
    let userResult = {}
    firebase.auth().signInWithEmailAndPassword(email, password)
    .then(user => {
        firebase.database().ref(`/users/`)
        .on('value', snapshot => {
            snapshot.forEach(child => {
                if (child.val().uid == user.user.uid) {
                    userResult = {
                        email: child.val().email ,
                        firstName: child.val().firstName,
                        lastName: child.val().lastName,
                        phone: child.val().phone,
                        balance: child.val().balance,
                        uid: child.val().uid,
                        key: child.key
                    }
                }
            })
            this.onLoginSuccess({user: JSON.stringify(userResult)})
        })
        
    })
    .catch(err => {
        this.onLoginFail('Invalid email / password combination')
    })
  }

  renderButton() {
    const { isLoading} = this.state;

    if (isLoading) {
      return(
        <ActivityIndicator size="large" />
      )
    } else {
        return (
              <Button
                raised
                title='Login'
                titleStyle={styles.btnText}
                buttonStyle={styles.btnStyle}
                onPress={()=>{this.userLogin()}}
              />
        );
    }
  }
 
  render() {
    return (
      <View style={styles.Wrapper}>
        <View style={styles.formContainer}>
          <View style={styles.formStyle}>
            <Input
              placeholder="user@gmail.com"
              onChangeText={this.onEmailChange.bind(this)}
              value= { this.props.email }
              inputContainerStyle={{borderBottomWidth: 0}}
              rightIcon={{ type: 'material-community', name:'account', color:'#ceb7b7' }}
            />
          </View>
          <View style={styles.formStyle}>
            <Input
              placeholder = "Password"
              secureTextEntry = {true}
              inputContainerStyle={{borderBottomWidth: 0}}
              onChangeText= {this.onPasswordChange.bind(this) }
              value = {this.props.password}
              rightIcon={{ type: 'material-community', name:'lock', color:'#ceb7b7' }}
            
              />
          </View>
         {this.state.passwordError !== ''?
            (<View>
                <Text style={styles.errorTextStyle}>
                {this.state.passwordError}
                </Text>
            </View>):null 
          }
           {this.state.emailError !== ''?
            (<View>
                <Text style={styles.errorTextStyle}>
                {this.state.emailError}
                </Text>
            </View>):null 
          }
          <View style={styles.btnContainer}>
             {this.renderButton()}
          </View>
        
          <TouchableWithoutFeedback onPress={()=>this.props.navigation.navigate('Register')}>
            <Text style={{color:'#f1e4e4', margin:20, fontSize:14, }}>Create account?</Text>
          </TouchableWithoutFeedback>
        </View>
      </View>
    );
  }
}

const styles = {
  Wrapper:{
    justifyContent:'center', 
    alignItems:'center', 
    flex:1, 
    height:'100%', 
    backgroundColor:COLOR.primary
  },
  errorTextStyle: {
      fontSize: 15,
      alignSelf: 'center',
      color: '#ff8484'
  }, 
  formStyle:{
    flexDirection: 'row-reverse',
    backgroundColor:'#f1e4e4',
    marginBottom: 5,
    marginHorizontal: 16,
    padding:5, 
    width:'80%', 
    borderRadius:8
  }, 
  formContainer:{
    marginTop:0, 
    height:'50%', 
  }, 
  btnStyle:{
    backgroundColor:COLOR.secondary,
    width:'100%',
    borderRadius:10,
    borderColor:COLOR.secondary,
    borderWidth:1 
  }, 
  faceBtnContainer:{
    backgroundColor:COLOR.secondary,
    marginHorizontal:15,
    borderRadius:10,
    borderColor:COLOR.secondary,
    borderWidth:1, 
    marginTop:5
  },
  btnContainer:{
    backgroundColor:COLOR.secondary,
    marginHorizontal:15,
    borderRadius:10,
    borderColor:COLOR.secondary,
    borderWidth:1
  }, 
  btnText:{
    textAlign:'center', 
    fontSize:20, 
    fontWeight:'500', 
    color:'#f1e4e4'
  }, 
};

export default LoginScreen;
