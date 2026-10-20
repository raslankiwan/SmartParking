import {AsyncStorage} from 'react-native';
import {SERVER_ADDRESS} from '../constants/ServerConstants';
export async function request(path, body, method) {
  const saved = await AsyncStorage.getItem('user');
  const user = saved ? JSON.parse(saved) : null;
  const response = await fetch(`${SERVER_ADDRESS}${path}`, {
    method: method || (body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(user && user.token ? {Authorization: `Bearer ${user.token}`} : {}),
    },
    ...(body ? {body: JSON.stringify(body)} : {}),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'Request failed');
  return json;
}
export async function saveSession(json) {
  await AsyncStorage.setItem(
    'user',
    JSON.stringify({...json.user, token: json.token}),
  );
}
export async function logout(navigation) {
  try {
    await request('/auth/logout', {});
  } finally {
    await AsyncStorage.removeItem('user');
    navigation.navigate('Login');
  }
}
