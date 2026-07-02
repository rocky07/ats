import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js';

let _pool = null;

export function initCognito({ userPoolId, clientId }) {
  _pool = new CognitoUserPool({ UserPoolId: userPoolId, ClientId: clientId });
}

function getPool() {
  if (!_pool) throw new Error('Cognito not initialised — call initCognito first');
  return _pool;
}

// Returns { accessToken, idToken, payload } on success
// Returns { challenge: 'NEW_PASSWORD_REQUIRED', cognitoUser } when admin-created user must set a new password
export function cognitoLogin(email, password) {
  return new Promise((resolve, reject) => {
    const pool = getPool();
    const user = new CognitoUser({ Username: email, Pool: pool });
    const auth = new AuthenticationDetails({ Username: email, Password: password });

    user.authenticateUser(auth, {
      onSuccess(session) {
        const accessToken = session.getAccessToken().getJwtToken();
        const idToken = session.getIdToken().getJwtToken();
        const payload = session.getIdToken().decodePayload();
        resolve({ accessToken, idToken, payload });
      },
      onFailure(err) {
        reject(err);
      },
      newPasswordRequired(_userAttr, _requiredAttr) {
        resolve({ challenge: 'NEW_PASSWORD_REQUIRED', cognitoUser: user });
      },
    });
  });
}

// Complete the NEW_PASSWORD_REQUIRED challenge
export function completeNewPassword(cognitoUser, newPassword) {
  return new Promise((resolve, reject) => {
    cognitoUser.completeNewPasswordChallenge(newPassword, {}, {
      onSuccess(session) {
        const accessToken = session.getAccessToken().getJwtToken();
        const idToken = session.getIdToken().getJwtToken();
        const payload = session.getIdToken().decodePayload();
        resolve({ accessToken, idToken, payload });
      },
      onFailure(err) {
        reject(err);
      },
    });
  });
}

export function cognitoLogout() {
  try {
    const pool = getPool();
    const user = pool.getCurrentUser();
    user?.signOut();
  } catch {
    // ignore
  }
}

export function getCognitoCurrentSession() {
  return new Promise((resolve, reject) => {
    try {
      const pool = getPool();
      const user = pool.getCurrentUser();
      if (!user) return reject(new Error('No current user'));
      user.getSession((err, session) => {
        if (err) return reject(err);
        if (!session?.isValid()) return reject(new Error('Session invalid'));
        resolve({
          accessToken: session.getAccessToken().getJwtToken(),
          payload: session.getIdToken().decodePayload(),
        });
      });
    } catch (e) {
      reject(e);
    }
  });
}
