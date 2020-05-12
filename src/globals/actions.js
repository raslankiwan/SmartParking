
import firebase from 'firebase';

export const fetchZone = (zoneId, successCallback, failCallback) => {
    let spots = []
    firebase.database().ref(`/zones/zone_${zoneId}/`)
    .on('value', snapshot => {
        snapshot.forEach(child => {
            let spot = {
                name: child.key,
                distance: child.val().distance,
                occupied: child.val().occupied
            }
            spots.push(spot)
        })
        successCallback({spots})
       
    })
    // .catch((err) => failCallback({error: err}))
    // return spots;
}

export const fetchZoneById = (zoneId) => {
    let spots = []
    firebase.database().ref(`/zones/zone_${zoneId}/`)
    .on('value', snapshot => {
        snapshot.forEach(child => {
            let spot = {
                name: child.key,
                distance: child.val().distance,
                occupied: child.val().occupied
            }
            spots.push(spot)
        })
       
    })
    return spots;
}