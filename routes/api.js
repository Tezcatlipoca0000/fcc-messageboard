'use strict';
require('dotenv').config();
const uri = process.env.DB;
const {MongoClient} = require('mongodb');
const client = new MongoClient(uri, {useUnifiedTopology: true});
const ObjectId = require('mongodb').ObjectId;
let boardName;

module.exports = async function (app) {

  // Main DB Handler
  async function dbMain(fun) {
    try {
      await client.connect()
      const db = client.db('fcc-messageboard');
      const coll = db.collection('boards');

      if (fun[0] == 'threadPost') {
        await newThreadPost(coll, fun[1]);
      }
      if (fun[0] == 'threadGet') {
        return await getThreads(coll, fun[1]);
      }
      if (fun[0] == 'replyPost') {
        await pushReply(coll, fun[1]);
      }

    } catch (e) {
      console.log(e);
    } finally {
      await client.close();
    }
  }

  // DB Insert or Update Thread Controller
  async function newThreadPost(coll, info) {
    // find board
    let found = await getThreads(coll, info);
    console.log('result of found ----> ', found);
    // update or insert
    if (found) {
      const updateThread = await coll.updateOne( {board: info.board}, {$push: {post: info.post[0]}} );
      console.log('result of updateOne -----> ', updateThread);
    } else {
      const insertThread = await coll.insertOne(info);
      console.log('result of insertOne ----> ', insertThread);
    }
    
  }

  // DB Search Board Controller 
  async function getThreads(coll, info) {
    return await coll.findOne({board: info.board});
  }

  // DB Push Reply Controller
  async function pushReply(coll, info) {
    let found = await getThreads(coll, info);
    console.log('result of found ----> ', found);

    const reply = await coll.updateOne( {board: info.board}, {
      $push: {replies: info.reply},
      $inc: {replycount: 1}
    } );
    console.log('result of updateOne ---> ', reply);
  }

  // DB Search Thread Controller
  async function getReplies(coll, info) {
    return await coll.findOne( {board: info.board, post: [{_id: info.id}]} );
  }
  
  // Main Routing
  app.route('/api/threads/:board')

    .post(async function(req, res) {
      console.log('threads post');
      
      if (req.headers.referer == (req.headers.origin + '/')) {
        console.log('build a board');

        boardName = req.params.board;
        await  dbMain( ['threadPost', {board: boardName, post: [ {_id: new ObjectId(), text: req.body.text, pass: req.body.delete_password, replies: [], replycount: 0, created_on: new Date()} ]}] );
        res.redirect(`/b/${boardName}`);

      } else {
        console.log('update board');
        let pattern = req.headers.host + '/b/';
        let regex = new RegExp(`${pattern}(.*)`);

        boardName = (req.headers.referer).match(regex)[1];
        await dbMain( ['threadPost', {board: boardName, post: [ {_id: new ObjectId(), text: req.body.text, pass: req.body.delete_password, replies: [], replycount: 0, created_on: new Date()} ]}] );
        res.redirect(`/b/${boardName}`);

      }
    })

    .put(function(req, res) {
      console.log('threads put');
    })
    
    .delete(function(req, res) {
      console.log('threads delete');
    })

    .get(async function(req, res) {
      console.log('threads get');
      console.log('parameters of request ---> ', req.params.board);
      let pattern = req.headers.host + '/b/';
      let regex = new RegExp(`${pattern}(.*)`);
      
      boardName = (req.headers.referer).match(regex)[1];

      // ERROR --> on "see full thread here" pending to separate board name from thread id

      //console.log('the referer ---> ', req.headers.referer);
      //console.log('the boardName ---> ', boardName);
      //console.log('the req ---> ', req);

      let data = await dbMain(['threadGet', {board: boardName}]);
      console.log('the data retrieved threadGet -----> ', data);
      res.json(data.post);

    });
  
    
  app.route('/api/replies/:board')
  .post(async function(req, res) {
    console.log('replies post');
    //console.log('the req ----> ', req);
    let pattern = req.headers.host + '/b/';
    let regex = new RegExp(`${pattern}(.*)`);
      
    boardName = (req.headers.referer).match(regex)[1];
    await dbMain( ['replyPost', {board: boardName, reply: req.body}] );
  })

  .put(function(req, res) {
    console.log('replies put');
  })
  
  .delete(function(req, res) {
    console.log('replies delete');
  })

  .get(function(req, res) {
    console.log('replies get');
  });

};
