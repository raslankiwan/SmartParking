import React from 'react'
import { View, Text, AsyncStorage} from 'react-native'

export default class HomeScreen extends React.Component {

    state = {
        user: null
    }

    componentWillMount = async () => {
        let user = await AsyncStorage.getItem('user')
        console.log(user)
        this.setState({user: JSON.parse(user)})
    }
 
    render() {
        return(
            <View>
                {this.state.user && <Text>Hello, {this.state.user.firstName} </Text>}
            
            </View>
        )
    }
}