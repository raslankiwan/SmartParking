import React from 'react';
import {ScrollView, Text, AsyncStorage} from 'react-native';
import {request, saveSession} from '../globals/api';
import {styles, Input, Button} from './ui';
export default class LoginScreen extends React.Component {
  static navigationOptions = {title: 'SmartParking', headerLeft: null};
  state = {email: '', password: '', busy: false, error: ''};
  async componentDidMount() {
    try {
      const saved = await AsyncStorage.getItem('user');
      if (saved) {
        await request('/auth/me');
        this.props.navigation.navigate('Home');
      }
    } catch {
      await AsyncStorage.removeItem('user');
    }
  }
  submit = async () => {
    this.setState({busy: true, error: ''});
    try {
      const json = await request('/auth/login', {
        email: this.state.email,
        password: this.state.password,
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
        <Text style={styles.title}>Good days start with a space.</Text>
        <Text style={styles.subtitle}>Sign in to SmartParking.</Text>
        <Input
          accessibilityLabel="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          value={this.state.email}
          onChangeText={(email) => this.setState({email})}
        />
        <Input
          accessibilityLabel="Password"
          placeholder="Password"
          secureTextEntry
          value={this.state.password}
          onChangeText={(password) => this.setState({password})}
        />
        <Text style={styles.error}>{this.state.error}</Text>
        <Button
          title={this.state.busy ? 'Signing in…' : 'Sign in'}
          disabled={this.state.busy}
          onPress={this.submit}
        />
        <Text
          style={styles.link}
          onPress={() => this.props.navigation.navigate('Register')}
        >
          Create an account
        </Text>
      </ScrollView>
    );
  }
}
