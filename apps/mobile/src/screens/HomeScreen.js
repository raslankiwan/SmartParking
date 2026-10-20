import React from 'react';
import {ScrollView, Text, View, Image, RefreshControl} from 'react-native';
import {request, logout} from '../globals/api';
import {SERVER_ADDRESS} from '../constants/ServerConstants';
import {styles, Button, Input} from './ui';
export default class HomeScreen extends React.Component {
  static navigationOptions = {title: 'Your streets', headerLeft: null};
  state = {search: '', streets: [], user: null, busy: false, error: ''};
  componentDidMount() {
    this.focus = this.props.navigation.addListener('didFocus', this.load);
    this.load();
  }
  componentWillUnmount() {
    this.focus.remove();
  }
  load = async () => {
    this.setState({busy: true, error: ''});
    try {
      const [{streets}, {user}] = await Promise.all([
        request('/streets'),
        request('/auth/me'),
      ]);
      this.setState({streets, user});
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
        refreshControl={
          <RefreshControl refreshing={this.state.busy} onRefresh={this.load} />
        }
      >
        <Text style={styles.title}>
          Hello, {this.state.user ? this.state.user.firstName : 'driver'}.
        </Text>
        <Text style={styles.subtitle}>
          {this.state.user
            ? Object.entries(
                this.state.user.balances || {ILS: this.state.user.balanceCents},
              )
                .map(
                  ([currency, amount]) =>
                    `${currency} ${amount / 10 ** (this.state.user.balanceDigits?.[currency] ?? 2)}`,
                )
                .join(' · ')
            : 'Loading balances…'}
          {'\n'}Ask your administrator for credits in the currency of your
          destination.
        </Text>
        <Button
          title="My reservations"
          onPress={() => this.props.navigation.navigate('MyBooks')}
        />
        <Text style={styles.error}>{this.state.error}</Text>
        <Input
          accessibilityLabel="Search cities and streets"
          placeholder="Search country, city, or street"
          value={this.state.search}
          onChangeText={(search) => this.setState({search})}
        />
        {this.state.streets
          .filter((s) =>
            `${s.countryCode} ${s.city} ${s.name}`
              .toLocaleLowerCase()
              .includes(this.state.search.toLocaleLowerCase()),
          )
          .map((street) => (
            <View style={styles.card} key={street.id}>
              {street.image ? (
                <Image
                  source={{
                    uri: street.image.startsWith('/')
                      ? SERVER_ADDRESS.replace(/\/api$/, '') + street.image
                      : street.image,
                  }}
                  style={{height: 150, borderRadius: 7, marginBottom: 15}}
                />
              ) : null}
              <Text style={styles.name}>{street.name}</Text>
              <Text style={styles.text}>
                {street.city} · {street.countryCode} · {street.currency} ·{' '}
                {street.timeZone}
              </Text>
              <Button
                title="Explore zones"
                onPress={() =>
                  this.props.navigation.navigate('Street', {
                    id: street.id,
                    name: street.name,
                    currency: street.currency,
                    currencyDigits: street.currencyDigits,
                    timeZone: street.timeZone,
                    city: street.city,
                    countryCode: street.countryCode,
                  })
                }
              />
            </View>
          ))}
        <Text style={styles.link} onPress={() => logout(this.props.navigation)}>
          Sign out
        </Text>
      </ScrollView>
    );
  }
}
