import React from 'react';

import { View, Text, ScrollView, AsyncStorage } from 'react-native';
import { Button, Input} from 'react-native-elements';
import COLOR from '../constants/Colors';
import { postRequest } from '../globals/RequestFetch'
import {SERVER_ADDRESS} from '../constants/ServerConstants'
import KeyboardSpacer from 'react-native-keyboard-spacer';

export default class RegisterScreen extends React.Component {
    state = {
        emailError: '',
        passwordError: '',
        phoneError: '',
        name1Error: '',
        name2Error: '',
        lastName:'',
        email: '',
        password:'',
        phone: '',
        submit: false,
        btnDisabled: true
    };

    
    static navigationOptions = {
        title: 'Register',
    };


    renderButton() {
        const { emailError, nameError, passwordError, phoneError, submit } = this.state;
        // if( emailError === '' &&
        //     nameError === '' &&
        //     passwordError === '' &&
        //     phoneError === '') {

        //     if(this.props.loading) {
        //         return <Spinner size="large" />;
        //     } else {
        //         return (
        //             <Button 
        //                 title='Sign Up' 
        //                 raised
        //                 titleStyle={styles.btnText}
        //                 buttonStyle={styles.btnStyle}
        //                 onPress={this.onButtonPress.bind(this)}
        //             />
        //         );
        //     }
        // } else {
            return (
                <Button 
                    title='Sign Up' 
                    disabled={this.state.btnDisabled}
                    raised
                    titleStyle={styles.btnText}
                    buttonStyle={styles.btnStyle}
                    onPress={this.signUp()}
                />
            );
        //}
    }

    updateEmail(email) {
        let reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/ ;
        if (reg.test(email)) {
            this.setState({emailError: '', email});
        } else {
            this.setState({emailError: 'Invalid Email !!', email});
        }
        this.enableBtn()
    }

    updateFirstName(firstName) {
        let regex = /^[a-zA-Z ]{2,30}$/;
        if (regex.test(firstName)) {
            this.setState({ name1Error: '', firstName});
        } else {
            this.setState({ name1Error: 'Please enter a valid name', firstName});
        }
        this.enableBtn()
    }

    updateLastName(lastName) {
        let regex = /^[a-zA-Z ]{2,30}$/;
        if (regex.test(lastName)) {
            this.setState({ name2Error: '', lastName});
        } else {
            this.setState({ name2Error: 'Please enter a valid name', lastName});
        }
        this.enableBtn()
    }

    updatePassword(password) {
        if (password.length < 6) {
            this.setState({ passwordError: 'Password at least 6 characters !!', password});
        } else {
            this.setState({ passwordError: '', password});
        }
    }

    updatePhone(phone) {
        let regex = /^[0][1-9]\d{9}$|^[1-9]\d{9}$/;
        if (regex.test(phone)) {
            this.setState({ phoneError: '', phone});
        } else {
            this.setState({ phoneError: 'Please enter a 10 digit number', phone});
        }
        this.enableBtn()
    }


    onSignupSuccess = async () => {
        let { firstName, lastName, email, phone } = this.state
        let user = {
            firstName, lastName, email, phone
        }
        await AsyncStorage.setItem('user', JSON.stringify(user))
        this.props.navigation.navigate('Home')
        console.log('Success')
    }

    onSignupFail = () => {
        //code to display error message / popup
        alert('Account already exists')
        console.log('Fail')
    }

    signUp = () => {
        let { email, password, firstName, lastName, phone} = this.state;
        let url = `${SERVER_ADDRESS}/register`
        postRequest(url, {email, password, firstName, lastName, phone}, 'POST', this.onSignupSuccess, this.onSignupFail)
    }

    enableBtn() {
        let { emailError, name1Error, name2Error, passwordError, phoneError } = this.state
        if (emailError == '' && name1Error == '' && name2Error == '' && passwordError == '' && phoneError == '') {
            return true
        } else {
            return false
        }

    }

    showSignupError() {
        alert('Error')
    }

    render() {
        return (
            <View style={styles.Wrapper}>
                <ScrollView>
                    <View style={styles.formContainer}>
                        <View style={styles.formStyle}>
                            <Input
                                placeholder="First Name"
                                onChangeText={firstName => this.updateFirstName(firstName)}
                                value={this.state.firstName}
                                inputContainerStyle={{borderBottomWidth: 0}}
                            />
                        </View>

                        <View>
                            {this.state.name1Error != '' && <Text style={styles.errorTextStyle}>{this.state.name1Error}</Text>}
                        </View>

                        <View style={styles.formStyle}>
                            <Input
                                placeholder="Last Name"
                                onChangeText={lastName => this.updateLastName(lastName)}
                                value={this.state.LastName}
                                inputContainerStyle={{borderBottomWidth: 0}}
                            />
                        </View>

                        <View>
                            {this.state.name2Error != '' && <Text style={styles.errorTextStyle}>{this.state.name2Error}</Text>}
                        </View>

                        <View style={styles.formStyle}>
                            <Input
                                placeholder="user@gmail.com"
                                onChangeText={email => this.updateEmail(email)}
                                value= { this.state.email }
                                inputContainerStyle={{borderBottomWidth: 0}}
                            />
                        </View>

                        <View>
                            {this.state.emailError != '' && <Text style={styles.errorTextStyle}>{this.state.emailError}</Text>}
                        </View>

                        <View style={styles.formStyle}>
                            <Input
                                placeholder = "Password"
                                secureTextEntry = {true}
                                onChangeText= {password => this.updatePassword(password) }
                                value = {this.state.password}
                                inputContainerStyle={{borderBottomWidth: 0}}
                            />
                        </View>

                        <View>
                            {this.state.passwordError != '' && <Text style={styles.errorTextStyle}>{this.state.passwordError}</Text>}
                        </View>

                        <View style={styles.formStyle}>
                            <Input
                                placeholder="Phone"
                                onChangeText={phone => this.updatePhone(phone)}
                                value= { this.state.phone }
                                inputContainerStyle={{borderBottomWidth: 0}}
                            />
                        </View>

                        <View>
                            {this.state.phoneError != '' && <Text style={styles.errorTextStyle}>{this.state.phoneError}</Text>}
                        </View>

                        <View style={styles.btnContainer}>
                            <Button 
                                title='Sign Up' 
                                raised
                                titleStyle={styles.btnText}
                                buttonStyle={styles.btnStyle}
                                onPress={() => {
                                    if (this.enableBtn()) {
                                        this.signUp()
                                    } else {
                                        this.showSignupError()
                                    }
                                     
                                }}
                            />
                        </View>
                    </View>
                    <KeyboardSpacer />
                </ScrollView>
            </View>
        );
    }
}

const styles = {
  errorTextStyle: {
      fontSize: 20,
      alignSelf: 'center',
      color: '#ff8484'
  }, 
  formStyle:{
    flexDirection: 'row-reverse',
    backgroundColor:'#f1e4e4',
    marginBottom: 5,
    marginHorizontal: 16,
    padding:5, 
    width:'90%', 
    borderRadius:8
  }, 
  Wrapper:{
    justifyContent:'center', 
    alignItems:'center', 
    flex:1, 
    height:'100%', 
    backgroundColor:COLOR.primary, 
  
  },
  formContainer:{
    marginTop:20, 
  }, 
  btnStyle:{
    backgroundColor:COLOR.secondary,
    width:'100%',
    borderRadius:10,
    borderColor:COLOR.secondary,
    borderWidth:1 
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
  }
};

// const mapStateToProps = ({auth}) => {
//   const { email, password, name, phone, error, loading, shouldRedirect, zip, country, street, city } = auth;

//   return { email, password, error, name, phone, loading, shouldRedirect, zip, country, street, city };
// };

// export default connect(mapStateToProps, {
//     emailChanged, 
//     passwordChanged, 
//     nameChanged,    
//     phoneChanged, 
//     zipChanged, 
//     streetChanged,
//     cityChanged, 
//     countryChanged,
//     signUpUser
// })(Register);
