const functions = require('firebase-functions');
const admin = require('firebase-admin');
const app = require('express')();

admin.initializeApp();

const firebaseConfig = {
  apiKey: "AIzaSyBYmLTtWfzbW_erD-448BCYHQflMA14cpk",
  authDomain: "socialape-2fc21.firebaseapp.com",
  databaseURL: "https://socialape-2fc21.firebaseio.com",
  projectId: "socialape-2fc21",
  storageBucket: "socialape-2fc21.appspot.com",
  messagingSenderId: "109124313300",
  appId: "1:109124313300:web:3c605071d9469e0c055b41"
};
const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

const db = admin.firestore();

// getScreams endpoint
app.get('/screams', (request, response) => {
  db
    .collection('screams')
    .orderBy('createdAt', 'desc')
    .get()
    .then(data => {
      let screams = [];
      data.forEach(doc => {
        screams.push({
          screamId: doc.id,
          ...doc.data()
        });
      });
      return response.json(screams);
    })
    .catch(error => console.error(error));
});

const FBAuth = (request, response, next) => {
  let idToken;
  if (request.headers.authorization && request.headers.authorization.startsWith('Bearer ')) {
    idToken = request.headers.authorization.split('Bearer ')[1];
  } else {
    console.error('No token found');
    return response.status(403).json({ error: 'Unathorized' });
  }
  admin.auth().verifyIdToken(idToken)
    .then(decodedToken => {
      request.user = decodedToken;
      console.log(decodedToken);
      return db.collection('users')
        .where('userId', '==', request.user.uid)
        .limit(1)
        .get();
    })
    .then(data => {
      request.user.handle = data.docs[0].data().handle;
      return next();
    })
    .catch(err => {
      console.error('Error while verifying token', err);
      return response.status(403).json(err);
    });
};

// newScream endpoint
app.post('/scream', FBAuth, (request, response) => {
  const requestBody = request.body;
  const newScream = {
    body: requestBody.body,
    userHandle: request.user.handle,
    createdAt: new Date().toISOString()
  };

  db
    .collection('screams')
    .add(newScream)
    .then(doc => {
      response.json({ message: `document ${doc.id} created successfully` });
    })
    .catch(error => {
      response.status(500).json({ error: 'Something went wrong' });
      console.error(error);
    });
});

const isEmail = (email) => {
  const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(regEx)) return true;
  else return false;
};

const isEmpty = (string) => {
  if (string.trim() === '') return true;
  else return false;
};

// Signup route
app.post('/signup', (request, response) => {
  const requestBody = request.body;
  const newUser = {
    email: requestBody.email,
    password: requestBody.password,
    confirmPassword: requestBody.confirmPassword,
    handle: requestBody.handle,
  };

  let errors = {};

  if (isEmpty(newUser.email)) {
    errors.email = 'Must not be empty';
  } else if (!isEmail(newUser.email)) {
    errors.email = 'Must be a valid email address';
  }

  if (isEmpty(newUser.password)) errors.password = 'Must not be empty';
  if (newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'Passwords must match';
  if (isEmpty(newUser.handle)) errors.handle = 'Must not be empty';

  if (Object.keys(errors).length > 0) return response.status(200).json(errors);

  let token, userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        return response.status(400).json({ handle: 'This handle is already taken' });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then(data => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then(idToken => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return response.status(201).json({ token });
    })
    .catch(err => {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        return response.status(400).json({ email: 'Email is already in use' });
      } else {
        return response.status(500).json({ error: err.code });
      }
    });
});

app.post('/login', (request, response) => {
  const requestBody = request.body;
  const user = {
    email: requestBody.email,
    password: requestBody.password
  };

  let errors = {};
  if (isEmpty(user.email)) errors.email = 'Must not be empty';
  if (isEmpty(user.password)) errors.password = 'Must not be empty';
  if (Object.keys(errors).length > 0) return response.status(400).json(errors);

  firebase.auth().signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken();
    })
    .then(token => {
      return response.json({ token });
    })
    .catch(err => {
      console.error(err);
      if (err.code === 'auth/wrong-password') {
        return response.status(403).json({ general: 'Wrong credentials, please try again' });
      } else return response.status(500).json({ error: err.code });
    });
});

exports.api = functions.region('australia-southeast1').https.onRequest(app);
