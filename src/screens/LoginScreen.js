import React from 'react';
import { Text, TouchableWithoutFeedback, View, Image, ActivityIndicator,AsyncStorage } from 'react-native';
import {Button, Input} from 'react-native-elements'
import COLOR from '../constants/Colors'
import { postRequest } from '../globals/RequestFetch'
import {SERVER_ADDRESS} from '../constants/ServerConstants'

class LoginScreen extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      form:{
        email: '',
        password: '',
        userLoginningIn:false
      },
      email: '',
      password: '',
      loading:true,
      error:null, 
      emailError: '',
      passwordError: '',
      pageLoading:true
    };
  }
  componentDidMount(){
    //this.checkUserCredentialsExisting();
   
  }

//   componentWillReceiveProps(nextProps) {
//     if (nextProps.shouldRedirect) {
//       this.props.navigation.navigate('MainNavigation');  
//     }
//   }
//   shouldComponentUpdate(nextProps, nextState) {
//      return true;
//   }
    

  checkUserCredentialsExisting = async () =>{
    let user = await AsyncStorage.getItem('userInfo');

    
    if (!user) {
    //  this.props.setLoadingLogInForm(true); 
      this.setState({pageLoading:false})
    }else{
      user = JSON.parse(user);
     // this.props.setLoadingLogInForm(false); 
      // this.props.setLoadingLogInForm(true); 
      console.log('login user', user);
     this.setState({pageLoading:false})
      this.props.navigation.navigate('MainNavigation'); 
    
    }
  }

  toggleUserLoginningIn = (initialBoolean=null) =>{
    if (!initialBoolean) {
      initialBoolean=this.state.form.userLoginningIn;
    }
    let form = {...this.state.form};
    form.userLoginningIn = !initialBoolean;                   
    this.setState({form});
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

 // this.props.emailChanged(text);
  }

  onPasswordChange(text) {
    if (text.length !== 0){
      this.setState({ passwordError: '', password: text });
    } else {
      this.setState({ passwordError: 'This field cannot be empty !!'})
    }
    //this.props.passwordChanged(text);
  }

  onLoginSuccess() {
    //code to save user info in async storage

    console.log('Success')
  }

  onLoginFail() {
    //code to display error message / popup
    console.log('Fail')
  }

  userLogin() {
    let url = `${SERVER_ADDRESS}/auth`
    postRequest(url, {email:'raslan', password: '12345'}, 'POST', this.onLoginSuccess, this.onLoginFail)
  }

  renderFacebookButton() {
    return (
      <Button
        raised
        title='Login with Facebook'
        titleStyle={styles.btnText}
        buttonStyle={styles.btnStyle}
        // containerStyle={styles.btnContainer}
        // onPress={()=>{this.onButtonPress()}}
     />
    );
  }

  //modify to enable/disable button based on state variable
  renderButton() {
    const { emailError, passwordError, submit} = this.state;

    if( emailError === '' &&
        passwordError === '' ) {

        if(this.props.loading) {
            return (
              <ActivityIndicator size="large" />
            );
        } else {
            return (
              <Button
                raised
                title='Login'
                titleStyle={styles.btnText}
                buttonStyle={styles.btnStyle}
                // containerStyle={styles.btnContainer}
                onPress={()=>{this.userLogin()}}
              />
            );
        }
    
    } else if (!(emailError === '' &&
        passwordError === '')) {
        return (
          <Button
            raised
            title='Login'
            titleStyle={styles.btnText}
            buttonStyle={styles.btnStyle}
          />
                   
        );
    } else {
        return (
          <Button
              raised
              title='Login'
              titleStyle={styles.btnText}
              buttonStyle={styles.btnStyle}
            />
        );
    }
  }


 
  render() {
    if(this.state.pageLoading){
      return(
        <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
          <ActivityIndicator size='large' />
        </View>
      )
    }
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
          <View style={styles.faceBtnContainer}>
             {this.renderFacebookButton()}
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
    felx:1, 
    height:'100%', 
    backgroundColor:COLOR.primary
  },
  errorTextStyle: {
      fontSize: 15,
      alignSelf: 'center',
      color: '#ff8484'
  }, 
  headerStyle:{
    height:'25%', 
    justifyContent:'flex-start', 
    alignItems:'center', 
    paddingTop:30,
    marginTop:30
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
