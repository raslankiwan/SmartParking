import React from 'react';
import {ScrollView, Text, View, RefreshControl, Alert} from 'react-native';
import {request} from '../globals/api';
import {styles, Input, Button} from './ui';
export default class ZoneScreen extends React.Component {
  static navigationOptions = ({navigation}) => ({
    title: navigation.getParam('name', 'Spaces'),
  });
  state = {
    spots: [],
    busy: false,
    error: '',
    plate: '',
    hours: '1',
    onlyAvailable: false,
  };
  componentDidMount() {
    this.load();
    this.timer = setInterval(this.load, 15000);
  }
  componentWillUnmount() {
    clearInterval(this.timer);
  }
  load = async () => {
    try {
      const {spots} = await request(
        `/spots?zoneId=${this.props.navigation.getParam('id')}`,
      );
      this.setState({spots, error: ''});
    } catch (e) {
      this.setState({error: e.message});
    }
  };
  book = async (spot) => {
    this.setState({busy: true, error: ''});
    try {
      await request('/reservations', {
        spotId: spot.id,
        vehiclePlate: this.state.plate,
        hours: Number(this.state.hours),
      });
      this.props.navigation.navigate('MyBooks');
    } catch (e) {
      await this.load();
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
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={this.load} />
        }
      >
        <Text style={styles.title}>A space for your arrival.</Text>
        <Text style={styles.subtitle}>
          {this.props.navigation.getParam('currency', 'ILS')}{' '}
          {this.props.navigation.getParam('hourlyRate')}/hour ·{' '}
          {this.props.navigation.getParam('timeZone', 'UTC')}. Time starts
          immediately. Occupancy is managed manually.
        </Text>
        <Input
          accessibilityLabel="Vehicle plate"
          placeholder="Vehicle registration"
          value={this.state.plate}
          onChangeText={(plate) => this.setState({plate})}
        />
        <Input
          accessibilityLabel="Booking hours"
          placeholder="Hours (1–24)"
          keyboardType="numeric"
          value={this.state.hours}
          onChangeText={(hours) => this.setState({hours})}
        />
        <Text
          style={styles.link}
          onPress={() =>
            this.setState({onlyAvailable: !this.state.onlyAvailable})
          }
        >
          {this.state.onlyAvailable ? 'Show all spaces' : 'Show available only'}
        </Text>
        <Text style={styles.error}>{this.state.error}</Text>
        {this.state.spots
          .filter(
            (s) =>
              !this.state.onlyAvailable || (!s.occupied && !s.reservationId),
          )
          .map((s) => (
            <View style={styles.card} key={s.id}>
              <Text style={styles.name}>{s.name}</Text>
              <Text style={styles.text}>
                {s.distance} meters ·{' '}
                {s.reservationId
                  ? 'Reserved'
                  : s.occupied
                    ? 'Occupied'
                    : 'Available'}
              </Text>
              <Button
                title="Reserve & pay with credits"
                disabled={this.state.busy || s.occupied || !!s.reservationId}
                onPress={() =>
                  Alert.alert(
                    'Reserve this space?',
                    `Pay for ${this.state.hours} hour(s) using your parking credits.`,
                    [
                      {text: 'Cancel', style: 'cancel'},
                      {text: 'Reserve', onPress: () => this.book(s)},
                    ],
                  )
                }
              />
            </View>
          ))}
      </ScrollView>
    );
  }
}
