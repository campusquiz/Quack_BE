
const geolib = require("geolib");

const functions = require('firebase-functions');

const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

exports.findMatch = functions.firestore.document('/users/{userId}')
  .onWrite((change, context) => {

    let userId = context.params.userId;

    // let prevLocation = change.before.exists ? change.before.data().location : null;
    let user = change.after.data();
    let userDoc = change.after.ref;

    // if (prevLocation) {
    //   let bearing = geolib.getBearing(prevLocation, user.location);
    //   userDoc.set({bearing}, {merge: true});
    // }

    if (user.awaitingMatch) {

      db.collection("users").where("awaitingMatch", "==", true).get()
        .then(potentials => {
          // let locationMap = {};
          // for (let doc of potentials.docs) {
          //   locationMap[doc.id] = doc.data().location;
          // }
          // let nearest = geolib.findNearest(user.location, coords);

          let nearest = {
            distance: 10,
            key: potentials.docs[0].id == userId ? potentials.docs[1].id : potentials.docs[0].id
          }

          if (nearest.distance < 20) { //TODO make configurable

            //MATCH

            let matchUser = potentials.docs.find(d => d.id == nearest.key);

            userDoc.set({awaitingMatch: false}, {merge: true});
            matchUser.ref.set({awaitingMatch: false}, {merge: true});

            userDoc.collection("matchings").doc(nearest.key).set({
              new: true,
              name: matchUser.data().name,
              profile: matchUser.data().profile
            });
            matchUser.ref.collection("matchings").doc(userId).set({
              new: true,
              name: user.name,
              profile: user.profile
            });

          }
        })


    }
  })


exports.updateLastMessage = functions.firestore.document('/messages/{messageId}')
  .onCreate((snapshot, context) => {
    let ids = snapshot.data().chatId.split("-");
    console.log("Got data", snapshot.data());
    console.log("Got ids:", ids);
    let text = snapshot.data().body;
    db.collection("users").doc(ids[0]).collection("matchings").doc(ids[1]).set({
      lastMessage: text
    }, {merge: true})
    db.collection("users").doc(ids[1]).collection("matchings").doc(ids[0]).set({
      lastMessage: text
    }, {merge: true})
  })
