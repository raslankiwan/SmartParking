import firebase from 'firebase'
import React from 'react'
import { ActivityIndicator, AsyncStorage, FlatList, ScrollView, View } from 'react-native'
import { Button, ListItem } from 'react-native-elements'
import { LocalNotification } from '../globals/NotificationController'
import { fetchZoneById } from '../globals/actions'
import Dialog from 'react-native-dialog'


export default class Test extends React.Component {

    state = {
        dataSource: [],
        alternativeSpot: '',
        currentSpot: null,
        showModal: false,
        newNumberOfHours: 0,
        showRenewModal: false,
        currentBook: null
    }

    async componentDidMount() {
        let user = await AsyncStorage.getItem('user')
        user = JSON.parse(user)
        this.setState({user: user})
        this.fetchBooks();

    }

    fetchBooks = () => {
        const { user } = this.state
        let books = [...this.state.dataSource]
        books = []
        this.setState({dataSource: []})
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
            books.sort((a, b) => a.startTime > b.startTime ? -1 : 1)
            console.log('books1: ', this.state.dataSource.length)
            // books.filter((item, index) => books.indexOf(item) === index);
            this.setState({dataSource: books})
            console.log('books2: ', this.state.dataSource.length)

        })
    } 

    onConfirmPress = (item) => {
        console.log('item: ', item)
        const { user } = this.state
        firebase.database().ref(`/users/${this.state.user.key}/books/${item.key}`)
        .update({confirmed: true})
        .then(() => {
            this.fetchBooks()
        })
        LocalNotification((item.numberOfHours * 60 * 60 * 1000) - (10 * 60 * 1000))
        // LocalNotification(3 * 1000)
    }

    handleReject = (item) => {
        const spots = fetchZoneById(item.zoneId);
        // console.log('spots: ', spots)
        let spot;
        for (let p of spots) {
            if(!p.occupied) {
                spot = p;
                break;
            }
        }
        if (spot !== null && spot !== undefined) {
            this.setState({alternativeSpot: spot, showModal:true, currentSpot: item})
            console.log(spot)
        }
        firebase.database().ref(`/users/${this.state.user.key}/books/${item.key}`)
        .remove()
        // .then(() => {})
    }

    handleRenew = (item) => {

    }

    renderList() {
        // console.log('datasource: ', this.state.dataSource)
        let data = this.state.dataSource
        data.filter((item, index) => data.indexOf(item) === index);
        return(
            <View>
                <FlatList
                    data={data}
                    renderItem={item => this.renderItem(item)}
                />                    
            </View>
        )
    }

    renderItem = ( {item} ) => {
       let date =  new Date(item.startTime).toLocaleDateString()
       let currentDate = new Date().getTime()
        return (
            <ListItem
                title={'Zone ' + item.zoneId + ', ' + item.slotId}
                subtitle={date}
                badge={{ value: item.numberOfHours + ' Hrs' , textStyle: { color: 'white' }, containerStyle: {  } }}
                bottomDivider
                rightElement={
                   !item.confirmed ? <View style={{flex: 1, flexDirection: 'column', margin: 5}}>
                        <Button title="Confirm" buttonStyle={{width: '70%', marginBottom: 10}} 
                            onPress={() => {this.onConfirmPress(item)}} >
                        </Button>
                        <Button 
                            title="Reject" buttonStyle={{width: '70%', backgroundColor: 'red'}}
                            onPress={() => this.handleReject(item)}
                        />
                    </View>
                    :
                    (((item.numberOfHours * 60 * 60 * 1000) + item.startTime) > currentDate) && <View>
                        <Button 
                            title="Renew" buttonStyle={{width: '70%', backgroundColor: 'green'}}
                            onPress={() =>this.setState({showRenewModal: true, currentBook: item})}
                        />
                    </View>
                }
            />
        )
        
    }

    renderModal() {
        const { alternativeSpot } = this.state;
        return (
            <View>
                <Dialog.Container visible={this.state.showModal}>
                <Dialog.Title>Book Spot</Dialog.Title>
                <Dialog.Description>
                    {alternativeSpot.name} is free, would you like to reserve it ?
                </Dialog.Description>
                
                {this.state.errorReserving && <Dialog.Description style={styles.errorTextStyle}>{this.state.errorReserving}</Dialog.Description>}
                <Dialog.Button label="Cancel" onPress={() => this.setState({showModal: false})} />
                <Dialog.Button label="Confirm" onPress={() => this.reserveSpot()}/>
                </Dialog.Container>
            </View>
        );
    }

    renderRenewModal() {
        const { currentSpot } = this.state;
        return (
            <View>
                <Dialog.Container visible={this.state.showRenewModal}>
                <Dialog.Title>Renew Spot</Dialog.Title>
                <Dialog.Description>
                    Please enter number of hours 
                </Dialog.Description>
                <Dialog.Input 
                            placeholder='Enter Hours'
                            keyboardType={'numeric'}
                            type="number"
                            style={styles.inputStyle}
                            value={this.state.newNumberOfHours} 
                            onChangeText={(newNumberOfHours) => {
                                this.setState({newNumberOfHours})}
                            }
                        />
                {this.state.errorReserving && <Dialog.Description style={styles.errorTextStyle}>{this.state.errorReserving}</Dialog.Description>}
                <Dialog.Button label="Cancel" onPress={() => this.setState({showRenewModal: false})} />
                <Dialog.Button label="Confirm" onPress={() => this.renewSpot(currentSpot)}/>
                </Dialog.Container>
            </View>
        );
    }

    renewSpot() {
        const { newNumberOfHours, currentBook } = this.state
        
        if (newNumberOfHours == '') {
            this.setState({errorReserving: 'Hours cannot be empty'})
        } else {
            let {balance} = this.state.user

            let newBalance = parseInt(balance) - parseInt(newNumberOfHours) * 2
            if (newBalance >= 0) {
                let num = parseInt(currentBook.numberOfHours) + parseInt(newNumberOfHours)
                console.log('item: ', num);

                 firebase.database().ref(`/users/${this.state.user.key}/books/${currentBook.key}`)
                .update({numberOfHours: num})
                .then(() => {
                    this.fetchBooks()
                    this.setState({showRenewModal: false})
                })
                // this.reserveSpot(selectedSpot)
                this.updateUser(newBalance)
                LocalNotification((newNumberOfHours * 60 * 60 * 1000) - (10 * 60 * 1000))

            } else {
                this.setState({errorReserving: 'You don\'t have enough balance'})
            }
        }
    }

    async updateUser(newBalance) {
        let user = this.state.user
        const {key} = this.state.user
        firebase.database().ref(`/users/${key}`)
        .update({balance:`${newBalance}`})
        
        user.balance = newBalance

        this.setState({user})
        await AsyncStorage.setItem('user', JSON.stringify(user))
        
    }


    onReserveClick() {
        const {selectedSpot, numberOfHours} = this.state
        if (numberOfHours == '') {
            this.setState({errorReserving: 'Hours cannot be empty'})
        } else {
            let {balance} = this.state.user
            let newBalance = parseInt(balance) - parseInt(numberOfHours) * 2
            if (newBalance >= 0) {
    
                this.reserveSpot(selectedSpot)
                this.updateUser(newBalance)
            } else {
                this.setState({errorReserving: 'You don\'t have enough balance'})
            }
        }
        
    }
    reserveSpot() {
        let { currentSpot, alternativeSpot } = this.state
        let date = new Date()
        console.log(currentSpot)
        this.setState({showModal: false})

        // let url = `${SERVER_ADDRESS}/reserveSpot/${id}/${item.name}`
        // postRequest(url, {}, 'POST', this.onReserveSuccess, this.onReserveFail)
        firebase.database().ref(`/zones/zone_${currentSpot.zoneId}/${alternativeSpot.name}`)
        .update({occupied: true})
        .then(() => {
            firebase.database().ref(`/users/${this.state.user.key}/books`)
            .push({
                zoneId: currentSpot.zoneId,
                slotId: alternativeSpot.name,
                numberOfHours: currentSpot.numberOfHours,
                startTime: date.getTime(),
                confirmed: false
            }).then(()=> {
                console.log('pushed')

                this.onReserveSuccess()

            })
        })
        .catch(err => {
            this.onReserveFail({err})
        })
       // this.fetchSpots()
    }

    onReserveSuccess() {
        this.setState({showModal: false})
        this.fetchBooks()
    }

    onReserveFail() {
        
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
                    <View>
                        {this.renderModal()}
                    </View>
                    <View>
                        {this.renderRenewModal()}
                    </View>
                </View>
                :
                <ActivityIndicator size="large" />
            }

            </View>
        )
    }
}



const styles = {

    textStyle: {
        flex: 1,
        fontSize: 18,
        textAlign: 'center',
        lineHeight: 40
    },
    inputStyle: {
        height: 40, 
        borderColor: 'gray', 
        borderWidth: 1
    }, 
    modalContainer: {
        marginTop: 200, 
        marginBottom:200, 
        position:'relative',
        flex: 1,
        justifyContent: 'center', 
        backgroundColor: '779',
        
    },
    errorTextStyle: {
        fontSize: 15,
        alignSelf: 'center',
        color: '#ff8484'
    }, 


};
