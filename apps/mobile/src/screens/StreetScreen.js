import React from 'react';
import {ScrollView, Text, View, RefreshControl} from 'react-native';
import {request} from '../globals/api';
import {styles, Button} from './ui';
export default class StreetScreen extends React.Component {
  static navigationOptions = ({navigation}) => ({
    title: navigation.getParam('name', 'Zones'),
  });
  state = {zones: [], busy: false, error: ''};
  componentDidMount() {
    this.load();
  }
  load = async () => {
    this.setState({busy: true, error: ''});
    try {
      const {zones} = await request(
        `/zones?streetId=${this.props.navigation.getParam('id')}`,
      );
      this.setState({zones});
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
        <Text style={styles.title}>Find your zone.</Text>
        <Text style={styles.error}>{this.state.error}</Text>
        {this.state.zones.map((z) => (
          <View style={styles.card} key={z.id}>
            <Text style={styles.name}>{z.name}</Text>
            <Text style={styles.text}>
              {z.distance} meters · ₪{z.hourlyRate}/hour
            </Text>
            <Button
              title="View spaces"
              onPress={() =>
                this.props.navigation.navigate('Zone', {
                  id: z.id,
                  name: z.name,
                  hourlyRate: z.hourlyRate,
                })
              }
            />
          </View>
        ))}
      </ScrollView>
    );
  }
}
