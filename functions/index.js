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

// getScreams endpoint
app.get('/screams', (request, response) => {
  admin.firestore()
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
  const newScream = {
    ...request.body,
    createdAt: new Date().toISOString()
  };

  admin
    .firestore()
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

  firebase
    .auth()
    .createUserWithEmailAndPassword(newUser.email, newUser.password)
    .then((data) => {
      return response
        .status(201)
        .json({ message: `User ${data.user.uid} signed up successfully` });
    })
    .catch((err) => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
});

exports.api = functions.region('australia-southeast1').https.onRequest(app);
