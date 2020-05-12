import React from 'react'
import { View, Text, TextInput, AsyncStorage, ActivityIndicator } from 'react-native'
import { Card, Button, Input } from 'react-native-elements'
import { ScrollView } from 'react-native-gesture-handler'
import firebase from 'firebase'
import COLOR from '../constants/Colors'
import Modal from 'react-native-modal'
import Dialog from 'react-native-dialog'
import  Icon  from 'react-native-vector-icons/FontAwesome'
import { fetchZone } from '../globals/actions'

export default class ZoneScreen extends React.Component {

    static navigationOptions =  ({ navigation }) => {
        const { params } = navigation.state;
        return params;
    }

    constructor() {
        super()
        this.state = {
            user: null,
            spots: [],
            displayAvailable: false,
            id: 0,
            showModal: false,
            numberOfHours: '',
            selectedSpot: null,
            isLoading: false
        }
    }

    async componentDidMount() {
        let user = await AsyncStorage.getItem('user')
        user = JSON.parse(user)
        this.setState({user})
        const { navigation } = this.props;
        const id = navigation.getParam('id','there is no details ');
        this.props.navigation.setParams({
            title: `Zone ${id}`, 
            headerRight: (
                <Text style={{marginRight: 20, color: 'white'}}>{user.balance} NIS</Text>
            ),
         });
        this.setState({id})
        this.fetchSpots()
    }

    fetchSpots() {
        this.setState({isLoading: true})
        let id = this.props.navigation.getParam('id','there is no details ');
        // let spots =
        fetchZone(id, this.onFetchSuccess, this.onFetchFail)
        // firebase.database().ref(`/zones/zone_${id}/`)
        // .on('value', snapshot => {
        //     snapshot.forEach(child => {
        //         let spot = {
        //             name: child.key,
        //             distance: child.val().distance,
        //             occupied: child.val().occupied
        //         }
        //         spots.push(spot)
        //     })
            
        // })
        // this.onFetchSuccess({spots})
    }

    onFetchSuccess = (json) => {
        let spots = json.spots
        this.setState({spots: spots, isLoading: false})
    }
    
    onFetchFail() {
        this.setState({isLoading: false})
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

    reserveSpot(item) {
        let { id, numberOfHours } = this.state
        let date = new Date()
        // let url = `${SERVER_ADDRESS}/reserveSpot/${id}/${item.name}`
        // postRequest(url, {}, 'POST', this.onReserveSuccess, this.onReserveFail)
        firebase.database().ref(`/zones/zone_${id}/${item.name}`)
        .update({occupied: true})
        .then(() => {
            firebase.database().ref(`/users/${this.state.user.key}/books`)
            .push({
                zoneId: id,
                slotId: item.name,
                numberOfHours,
                startTime: date.getTime(),
                confirmed: false
            })
            this.onReserveSuccess()
        })
        .catch(err => {
            this.onReserveFail({err})
        })
       // this.fetchSpots()
    }

    onReserveSuccess() {
        this.setState({showModal: false, numberOfHours:''})
        this.fetchSpots()
    }

    onReserveFail() {
        
    }

    async updateUser(newBalance) {
        let user = this.state.user
        const {key} = this.state.user
        firebase.database().ref(`/users/${key}`)
        .update({balance:`${newBalance}`})
        
        user.balance = newBalance

        this.setState({user})
        await AsyncStorage.setItem('user', JSON.stringify(user))
        this.props.navigation.setParams({
            headerRight: (
                <Text style={{marginRight: 20, color: 'white'}}>{newBalance} NIS</Text>
            ),
         });
    }

    flipDisplay() {
        this.setState(prev => {
            return {displayAvailable: !prev.displayAvailable}
        })
    }

    render() {
        let {displayAvailable, id, isLoading} = this.state
        let imgUrl = '../../assets/Images/Jaffa/'+id+'.jpg'
        return(
            isLoading ? <ActivityIndicator size="large" color="white" />
            :
            <ScrollView >
                <View>
                    <View>
                         {/* id && <View>
                            <Card containerStyle={styles.CardStyle}>
                                <Image 
                                    resizeMode="cover"
                                    source={require(imgUrl)}
                                    style={{width:'100%', height:150}}
                                />
                            </Card>
                        </View> */}
                        <View style={styles.btnContainer}>
                            <View style={{width:'50%'}}>
                                <Button 
                                    disabled={displayAvailable} 
                                    title="Available" 
                                    buttonStyle={[styles.selectedBtnStyle,  !displayAvailable ? styles.selectedBtnStyle : styles.unselectedBtnStyle]}
                                    onPress={()=> this.flipDisplay()} 
                                />
                            </View>
                           
                            <View style={{width:'50%'}}>
                                <Button                             
                                    buttonStyle={[styles.unselectedBtnStyle,  !displayAvailable ? styles.unselectedBtnStyle : styles.selectedBtnStyle]}
                                    disabled={!displayAvailable} 
                                    title="All" 
                                    onPress={()=> this.flipDisplay()} 
                                />
                            </View>
                            
                        </View>

                        {
                            this.state.spots && this.state.spots.map((item) => {
                            // console.log('item: ', item)
                            return(
                            // displayAvailable ?
                            ( !item.occupied || !displayAvailable ) &&
                                <View>
                                    <Card>
                                        <View style={styles.horizontalView}>
                                            <View style={styles.zoneDetails}>
                                                <Text>Name: {item.name}</Text>
                                                <Text>Distance: {item.distance} Meters</Text>
                                                <Text>Occupied: {item.occupied ? 'Yes' : 'No' } </Text>
                                            </View>
                                            <View style={styles.iconStyle}>
                                                <Icon
                                                    name="circle"
                                                    color={item.occupied ? "red" : "green"}
                                                    size={25}
                                                />
                                            </View>
                                        </View>
                                        
                                        
                                        {
                                            !item.occupied && <Button title="Book" onPress={() => this.setState({showModal:true, selectedSpot: item})}/>
                                        }
                                    </Card>
                                </View> 
                                )
                            })
                        } 
                    
                        
                    </View>
                    <View>
                        <Dialog.Container visible={this.state.showModal}>
                        <Dialog.Title>Book Spot</Dialog.Title>
                        <Dialog.Description>
                            How many hours will you stay?
                        </Dialog.Description>
                        <Dialog.Input 
                            placeholder='Enter Hours'
                            style={styles.inputStyle} 
                            keyboardType={'numeric'}
                            type="number"
                            value={this.state.numberOfHours} 
                            onChangeText={(numberOfHours) => {
                                this.setState({numberOfHours})}
                            }
                        />
                        {this.state.errorReserving && <Dialog.Description style={styles.errorTextStyle}>{this.state.errorReserving}</Dialog.Description>}
                        <Dialog.Button label="Cancel" onPress={() => this.setState({showModal: false})} />
                        <Dialog.Button label="Confirm" onPress={() => this.onReserveClick()}/>
                        </Dialog.Container>
                    </View>
                    {/* <Modal
                        style={styles.modalContainer}
                        backdropColor={'red'}
                        animationType="fade"
                        visible={this.state.showModal}
                    > 
                        <View >
                            <Text>How many hours will you stay?</Text>
                            <TextInput 
                                placeholder='Enter number of hours'
                                style={styles.inputStyle} 
                                keyboardType={'numeric'}
                                type="number"
                                value={this.state.numberOfHours} 
                                onChangeText={(numberOfHours) => {
                                    this.setState({numberOfHours})}
                                }>
                            </TextInput>
                            {this.state.errorReserving && <Text>{this.state.errorReserving}</Text>}
                            <View>
                                <Button title="Confirm" onPress={() => this.onReserveClick()}/>
                                <Button title="Cancel" onPress={() => this.setState({showModal: false})}/>
                            </View>
                        </View>
                    </Modal> */}
                </View>
            </ScrollView>    
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
    containerStyle: {
        marginTop: 200, 
        marginBottom:200, 
        position:'relative',
        flex: 1,
        justifyContent: 'center', 
        backgroundColor: COLOR.lightGray
    },
    inputStyle: {
        height: 40, 
        borderColor: 'gray', 
        borderWidth: 1
    }, 
    btnContainer: {
        flex: 1,
        flexDirection: 'row',
        // justifyContent: 'center',
        width: '100%'

    },
    selectedBtnStyle: {
        width: '100%', 
        height:'100%',
        backgroundColor: COLOR.secondaryLight
    },
    unselectedBtnStyle: {
        width: '100%', 
        height:'100%',
        backgroundColor: COLOR.lightGray
    },
    modalContainer: {
        marginTop: 200, 
        marginBottom:200, 
        position:'relative',
        flex: 1,
        justifyContent: 'center', 
        backgroundColor: COLOR.lightGray,
        
    },
    errorTextStyle: {
        fontSize: 15,
        alignSelf: 'center',
        color: '#ff8484'
    }, 
    horizontalView: {
        flex: 1,
        flexDirection: 'row',
        width: '100%'
    },
    zoneDetails: {
        width: '90%'
    },
    iconStyle: {
        width: '10%'
    }

};