'use strict';
require('dotenv').config();
const uri = process.env.DB;
const {MongoClient} = require('mongodb');
const client = new MongoClient(uri, {useUnifiedTopology: true});


module.exports = function (app) {

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

    } catch (e) {
      console.log(e);
    } finally {
      await client.close();
    }
  }

  async function newThreadPost(coll, info) {
    // find board
    const found = await getThreads(coll, info);
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

  async function getThreads(coll, info) {
    return await coll.findOne({board: info.board});
  }
  
  app.route('/api/threads/:board')
    .post(function(req, res) {
      console.log('threads post');
      //console.log('the request obj -------> ', req);
      console.log(req.headers.referer, req.headers.origin);
      let boardName = req.params.board;
      console.log('the body ---->', req.body);
      if (req.headers.referer == (req.headers.origin + '/')) {
        console.log('build a board');

        dbMain( ['threadPost', {board: req.body.board, post: [{text: req.body.text, pass: req.body.delete_password}]}] );
        res.redirect(`/b/${boardName}`);
      } else {
        console.log('update board');
        console.log(req.headers.host);
        let pattern = req.headers.host + '/b/';
        let regex = new RegExp(`${pattern}(.*)`);
        console.log('the pattern ----> ', pattern);
        console.log('the regex ----> ', regex);
        console.log('the referer ---->', req.headers.referer);
        boardName = (req.headers.referer).match(regex)[1];
        console.log('the board name ----> ', boardName);
        console.log('the wrong board name --> ', req.params.board);
        res.redirect(`/b/${boardName}`);
      }
      
      
    })

    .put(function(req, res) {
      console.log('threads put');
    })
    
    .delete(function(req, res) {
      console.log('threads delete');
    })

    .get(function(req, res) {
      console.log('threads get');
      //console.log('req ->>>> ', req);
      console.log('wrong board name ----> ', req.params.board);
      let pattern = req.headers.host + '/b/';
      let regex = new RegExp(`${pattern}(.*)`);
      let boardName = (req.headers.referer).match(regex)[1];
      console.log('the board name ---> ', boardName);
      let data = dbMain(['threadGet', {board: boardName}]);
      console.log('the data retrieved threadGet -----> ', data);
      res.json(data);
    });
  
    
  app.route('/api/replies/:board')
  .post(function(req, res) {
    console.log('replies post');
  })

  .put(function(req, res) {
    console.log('replies put');
  })
  
  .delete(function(req, res) {
    console.log('replies delete');
  })

  .get(function(req, res) {
    console.log('replies get');
    //console.log('req ->>>> ', req);
    //console.log('board name ----> ', req.params.board);
  });

};
