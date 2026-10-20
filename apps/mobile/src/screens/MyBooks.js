import React from 'react';
import {ScrollView, Text, View, RefreshControl} from 'react-native';
import {request} from '../globals/api';
import {styles, Input, Button} from './ui';
export default class MyBooks extends React.Component {
  static navigationOptions = {title: 'My reservations'};
  state = {reservations: [], busy: false, error: '', hours: '1'};
  componentDidMount() {
    this.load();
    this.timer = setInterval(this.load, 15000);
  }
  componentWillUnmount() {
    clearInterval(this.timer);
  }
  load = async () => {
    try {
      const {reservations} = await request('/reservations');
      this.setState({reservations});
    } catch (e) {
      this.setState({error: e.message});
    }
  };
  change = async (path, body) => {
    this.setState({busy: true, error: ''});
    try {
      await request(path, body);
      await this.load();
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
          <RefreshControl refreshing={false} onRefresh={this.load} />
        }
      >
        <Text style={styles.title}>A little more time.</Text>
        <Text style={styles.subtitle}>
          Unconfirmed cancellations receive a full refund. Confirmed time is
          non-refundable.
        </Text>
        <Text style={styles.error}>{this.state.error}</Text>
        {!this.state.reservations.length && (
          <Text style={styles.text}>No reservations yet.</Text>
        )}
        {this.state.reservations.map((r) => (
          <View style={styles.card} key={r.id}>
            <Text style={styles.name}>
              {r.vehiclePlate} · {r.status}
            </Text>
            <Text style={styles.text}>
              Until {new Date(r.expiresAt).toLocaleString()}
              {'\n'}
              {r.hours} hours · ₪{(r.paidCents / 100).toFixed(2)} prepaid{'\n'}
              {r.confirmed ? 'Arrival confirmed' : 'Arrival not confirmed'}
            </Text>
            {r.status === 'active' && (
              <View>
                {!r.confirmed && (
                  <Button
                    disabled={this.state.busy}
                    title="Confirm arrival"
                    onPress={() =>
                      this.change(`/reservations/${r.id}/confirm`, {})
                    }
                  />
                )}
                <Input
                  accessibilityLabel="Additional hours"
                  placeholder="Additional hours"
                  keyboardType="numeric"
                  value={this.state.hours}
                  onChangeText={(hours) => this.setState({hours})}
                />
                <Button
                  disabled={this.state.busy}
                  title="Renew with credits"
                  onPress={() =>
                    this.change(`/reservations/${r.id}/renew`, {
                      hours: Number(this.state.hours),
                    })
                  }
                />
                <Button
                  disabled={this.state.busy}
                  title={r.confirmed ? 'Finish parking' : 'Cancel & refund'}
                  onPress={() =>
                    this.change(`/reservations/${r.id}/end`, {
                      status: r.confirmed ? 'completed' : 'cancelled',
                    })
                  }
                />
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    );
  }
}
