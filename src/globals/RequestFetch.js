export const postRequest = (url, data, method, callBackSuccess, callBackFail) => {
    let body = null;
    if (method !== 'GET' && method !== 'DELETE') {
        body = JSON.stringify(data);
    } 
    
    return fetch(url, {
        method: method,
        body:body,        
        headers: new Headers({
            'Content-Type': 'application/json'
        }),
    })
    .then(response => response.json())
    .then(json => {  
        if (json.status === 'success') {
            callBackSuccess(json) 
        } else if (json.status === 'failed') {
            callBackFail(json)
        }
    })
    .catch(error => console.log(error));
}