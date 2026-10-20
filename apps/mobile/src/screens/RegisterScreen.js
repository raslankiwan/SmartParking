import React from 'react';
import {ScrollView, Text} from 'react-native';
import {request, saveSession} from '../globals/api';
import {styles, Input, Button} from './ui';
export default class RegisterScreen extends React.Component {
  static navigationOptions = {title: 'Create account'};
  state = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    busy: false,
    error: '',
  };
  submit = async () => {
    this.setState({busy: true, error: ''});
    try {
      const {firstName, lastName, email, password, phone} = this.state;
      const json = await request('/auth/register', {
        firstName,
        lastName,
        email,
        password,
        phone,
      });
      await saveSession(json);
      this.props.navigation.navigate('Home');
    } catch (e) {
      this.setState({error: e.message});
    } finally {
      this.setState({busy: false});
    }
  };
  render() {
    return (
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>A fresh start.</Text>
        {['firstName', 'lastName', 'email', 'password', 'phone'].map((key) => (
          <Input
            key={key}
            accessibilityLabel={key}
            placeholder={
              {
                firstName: 'First name',
                lastName: 'Last name',
                email: 'Email',
                password: 'Password (at least 10 characters)',
                phone: 'Phone (optional)',
              }[key]
            }
            value={this.state[key]}
            secureTextEntry={key === 'password'}
            autoCapitalize={key === 'email' ? 'none' : 'sentences'}
            keyboardType={
              key === 'email'
                ? 'email-address'
                : key === 'phone'
                  ? 'phone-pad'
                  : 'default'
            }
            onChangeText={(value) => this.setState({[key]: value})}
          />
        ))}
        <Text style={styles.error}>{this.state.error}</Text>
        <Button
          title={this.state.busy ? 'Creating account…' : 'Create account'}
          disabled={this.state.busy}
          onPress={this.submit}
        />
      </ScrollView>
    );
  }
}
