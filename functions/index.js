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

// newScream endpoint
app.post('/scream', (request, response) => {
  const requestBody = request.body;
  const newScream = {
    body: requestBody.body,
    userHandle: requestBody.userHandle,
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

// Signup route
app.post('/signup', (request, response) => {
  const requestBody = request.body;
  const newUser = {
    email: requestBody.email,
    password: requestBody.password,
    confirmPassword: requestBody.confirmPassword,
    handle: requestBody.handle,
  };

  // @todo validate data

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

exports.api = functions.region('australia-southeast1').https.onRequest(app);
