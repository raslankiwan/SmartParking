import firebase from 'firebase'
import React from 'react'
import { ActivityIndicator, AsyncStorage, FlatList, ScrollView, View } from 'react-native'
import { Button, ListItem } from 'react-native-elements'

export default class Test extends React.Component {

    state = {
        dataSource: []
    }

    async componentDidMount() {
        let user = await AsyncStorage.getItem('user')
        user = JSON.parse(user)
        this.setState({user: user})
        let books = []
        firebase.database().ref(`/users/${user.key}/books`)
        .on('value', snapshot => {
            snapshot.forEach(child => {
                let book = {
                    key: child.key,
                    slotId: child.val().slotId,
                    zoneId: child.val().zoneId,
                    numberOfHours: child.val().numberOfHours,
                    startTime: child.val().startTime,
                    confirmed: child.val().confirmed,

                }
                books.push(book)
            })
            this.setState({dataSource: books})
        })

    }

    renderList() {
        console.log('datasource: ', this.state.dataSource)
        return(
            <View>
                <FlatList
                    data={this.state.dataSource}
                    renderItem={item => this.renderItem(item)}
                />                    
            </View>
        )
    }

    renderItem = ( {item} ) => {
       let date =  new Date(item.startTime).toLocaleDateString()
        return (
            <ListItem
                title={'Zone ' + item.zoneId + ', ' + item.slotId}
                subtitle={date}
                badge={{ value: item.numberOfHours + ' Hrs' , textStyle: { color: 'white' }, containerStyle: {  } }}
                bottomDivider
                rightElement={
                    <View style={{flex: 1, flexDirection: 'column', margin: 5}}>
                        <Button title="Confirm" buttonStyle={{width: '70%', marginBottom: 10}} >
                        </Button>
                        <Button title="Reject" buttonStyle={{width: '70%', backgroundColor: 'red'}}>
                        </Button>
                    </View>
                }
            />
        )
        
    }

    render() {
        const { dataSource } = this.state
        return( 
            <View>
            {   
                dataSource.length > 0 
                ?
                <View>
                {this.renderList()}
                </View>
                :
                <ActivityIndicator size="large" />
            }
            </View>
        )
    }
}
