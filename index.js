const express = require('express');
const app = express();
const logger = require('morgan');
const bodyParser = require('body-parser');
//const mysql = require('promise-mysql');
/*
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '!dbadmin',
  port: 3306,
  database: 'chatbot'
});
*/
const numbaseball = require('./numbaseball.js');

const apiRouter = express.Router();

app.use(logger('dev', {}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use('/api', apiRouter);

apiRouter.post('/sayHello', function(req, res) {
  console.log(req.body.userRequest.user.id);
  const responseBody = {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: "hello I'm Ryan"
          }
        }
      ]
    }
  };

  res.status(200).send(responseBody);
});

apiRouter.post('/showHello', function(req, res) {
  console.log(req.body);

  const responseBody = {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleImage: {
            imageUrl: "https://t1.daumcdn.net/friends/prod/category/M001_friends_ryan2.jpg",
            altText: "hello I'm Ryan"
          }
        }
      ]
    }
  };

  res.status(200).send(responseBody);
});

apiRouter.post('/gameNumber', function(req, res) {
  const userid = req.body.userRequest.user.id;
  //console.log(req.body.userRequest.user.id);
  //console.log(req.body);
  const num = req.body.userRequest.utterance;
  let rows;
  
  async function processNum(num) {
    if (numbaseball.checkNumber(num) == false)
    {
      console.log('checkNumber == false');
      return '올바른 숫자를 입력해 주세요.';
    }
    /*
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '!dbadmin',
      port: 3306,
      database: 'chatbot'
    });
    */
    const connection = await numbaseball.connectDB();
    await connection.query('INSERT INTO `userinfo`(`userid`, `username`, `status`) VALUES ("' + userid + '","", "N") ON DUPLICATE KEY UPDATE mtime=now()');
    rows = await connection.query('SELECT status FROM userinfo WHERE userid="' + userid + '"');
    console.log(rows[0].status);
    const status = rows[0].status;
    let comnum, gameseq;
    if (status == 'N')
    {
      comnum = await numbaseball.makeNumber();
      await connection.query('INSERT INTO gameinfo (userid, comnum, status) VALUES ("' + userid + '","' + comnum + '","N")');
      rows = await connection.query('SELECT max(seq) as seq FROM gameinfo WHERE userid="' + userid + '"');
      gameseq = rows[0].seq;
      await connection.query('UPDATE userinfo SET status="G" WHERE userid="' + userid + '"');
    }
    else
    {
      rows = await connection.query('SELECT seq, comnum FROM gameinfo WHERE userid="' + userid + '" ORDER BY seq DESC LIMIT 1');
      gameseq = rows[0].seq;
      comnum = rows[0].comnum;
    }
    console.log(gameseq);
    console.log(comnum);
    rows = await connection.query('SELECT count(seq) as cnt FROM gamehistory WHERE gameseq=' + gameseq);
    const game_count = rows[0].cnt + 1;
    
    let b, s;
    const bs = await numbaseball.getBallCount(comnum, num);
    s = bs[0];
    b = bs[1];
    
    const msg = game_count + ': ' + s + 'S, ' + b + 'B'
    await connection.query('INSERT INTO gamehistory (gameseq, num, msg) VALUES ("' + gameseq + '","' + num + '","' + msg + '")');
    if (s == 3)
    {
      await connection.query('UPDATE userinfo SET status="N" WHERE userid="' + userid + '"');
      await connection.query('UPDATE gameinfo SET status="W" WHERE seq="' + gameseq + '"');
      return game_count + '번만에 맞췄습니다. 축하합니다.';
    }
    
    return msg;
  }
  
  processNum(num).then(msg => {
    console.log('msg:' + msg);
    const responseBody = {
      version: "2.0",
      data: {
        "msg" : msg
      }
    };

    res.status(200).send(responseBody);
  });
});

apiRouter.post('/getStatus', function(req, res) {
  //console.log(req.body.userRequest.user.id);
  //console.log(req.body);
  const userid = req.body.userRequest.user.id;
  let rows;
  
  async function processStatus() {
    /*
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '!dbadmin',
      port: 3306,
      database: 'chatbot'
    });
    */
    const connection = await numbaseball.connectDB();
    await connection.query('INSERT INTO `userinfo`(`userid`, `username`, `status`) VALUES ("' + userid + '","", "N") ON DUPLICATE KEY UPDATE mtime=now()');
    rows = await connection.query('SELECT status FROM userinfo WHERE userid="' + userid + '"');
    const status = (rows[0].status == 'N') ? '대기중' : '게임중';
    rows = await connection.query('SELECT status, count(*) as cnt FROM `gameinfo` WHERE userid="' + userid + '" GROUP BY status');
    
    let win_count = 0, try_count = 0;
    for (let i = 0; i < rows.length; i++)
    {
      if (rows[i].status == 'W')
        win_count = rows[i].cnt;
      else
        try_count = rows[i].cnt;
    }
    
    return {
      version: "2.0",
      data: {
      "game_status" : status,
      "game_total" : win_count + try_count,
      "game_won" : win_count,
      "game_lost" : try_count
      }
    };
  }
    
  processStatus().then(responseBody => {
    res.status(200).send(responseBody);
  });
});

apiRouter.post('/getHistory', function(req, res) {
  //console.log(req.body.userRequest.user.id);
  //console.log(req.body);
  const userid = req.body.userRequest.user.id;
  let rows;
  
  async function processStatus() {
    /*
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '!dbadmin',
      port: 3306,
      database: 'chatbot'
    });
    */
    const connection = await numbaseball.connectDB();
    
    rows = await connection.query('SELECT status FROM userinfo WHERE userid="' + userid + '"');
    let msg;
    if (rows[0].status == 'N') {
      msg = '게임중이 아닙니다.';
    }
    else {
      rows = await connection.query('SELECT status, count(*) as cnt FROM `gameinfo` WHERE userid="' + userid + '" GROUP BY status');

      await connection.query('INSERT INTO `userinfo`(`userid`, `username`, `status`) VALUES ("' + userid + '","", "N") ON DUPLICATE KEY UPDATE mtime=now()');
      rows = await connection.query('SELECT status FROM userinfo WHERE userid="' + userid + '"');
      const status = (rows[0].status == 'N') ? '대기중' : '게임중';
      rows = await connection.query('SELECT status, count(*) as cnt FROM `gameinfo` WHERE userid="' + userid + '" GROUP BY status');
      
      let win_count = 0, try_count = 0;
      for (let i = 0; i < rows.length; i++)
      {
        if (rows[i].status == 'W')
          win_count = rows[i].cnt;
        else
          try_count = rows[i].cnt;
      }
    }
    
    return {
      version: "2.0",
      data: {
      "game_status" : status,
      "game_total" : win_count + try_count,
      "game_won" : win_count,
      "game_lost" : try_count
      }
    };
  }
    
  processStatus().then(responseBody => {
    res.status(200).send(responseBody);
  });
});

app.listen(3000, "0.0.0.0", function() {
  console.log('Example skill server listening on port 3000!');
});
