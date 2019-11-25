import React from 'react'
import { View, Text } from 'react-native'
import { postRequest } from '../globals/RequestFetch'
import {SERVER_ADDRESS} from '../constants/ServerConstants'
import { Card, Button } from 'react-native-elements'

export default class ZoneScreen extends React.Component {

    static navigationOptions = ({ navigation, navigationOptions }) => {
        return ({
          title: navigation.getParam('name', 'Home'),
          headerTitleStyle :{textAlign: 'center', flex: 1},
      });
    }

    constructor() {
        super()
        this.state = {
            spots: []
        }
    }

    componentDidMount() {
        const { navigation } = this.props;
        const id = navigation.getParam('id','there is no details ');
        this.setState({id})
        let url = `${SERVER_ADDRESS}/fetchZones/${id}`
        postRequest(url, {}, 'POST', this.onSuccess, this.onFail)
    }

    onSuccess = (json) => {
        let id = 18
        let spots = json.spots
        let spot_name = `spot_${id}`
       // console.log('spots : ', spots)
        this.setState({spots: spots})
    }
    
    onFail() {

    }

    render() {
        return(
            <View>
                {this.state.spots && this.state.spots.map((item) => {
                   // console.log('item: ', item)
                    return (
                    <View>
                        <Card>
                            <Text>Name: {item.name}</Text>
                            <Text>Distance: {item.distance}</Text>
                            <Text>Occupied: {item.occupied ? 'Yes' : 'No'}</Text>
                            <Button title="Book"></Button>
                        </Card>
                    </View>)
                })} 
            
                
            </View>
        )
    }
}