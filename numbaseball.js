// https://stackoverflow.com/questions/5656436/how-to-create-my-own-module-of-functions-in-a-node-js-app

const mysql = require('promise-mysql');

(function() {

  function checkNumber(num) {
    if (num.length != 3) return false;
    if (num[0] == num[1] || num[0] == num[2] || num[1] == num[2]) return false;
    return true;
  }

  function makeNumber() {
    while (true) {
      const num = Math.floor(Math.random() * 1000);
      const str = ('00' + num).substr(-3);
      if (str[0] != str[1] && str[0] != str[2] && str[1] != str[2])
        return str;
    }
  }
  
  function getBallCount(num1, num2) {
    var b = 0;
    var s = 0;
    for (var i = 0; i < 3; i++)
      for (var j = 0; j < 3; j++)
      {
        if (num1[i] == num2[j])
          if (i == j) 
            s++;
          else
            b++;
      }
    return [ s, b ];
  }
  
  function connectDB() {
    const con = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '!dbadmin',
      port: 3306,
      database: 'chatbot'
    });
    return con;
  }

  
  //...

  module.exports.checkNumber = checkNumber;
  module.exports.makeNumber = makeNumber;
  module.exports.getBallCount = getBallCount;
  module.exports.connectDB = connectDB;

})();
