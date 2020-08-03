const { db } = require('../util/admin');

exports.getAllScreams = (request, response) => {
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
};

exports.postOneScream = (request, response) => {
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
};
