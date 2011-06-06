// Run $ expresso

// Force test environment
process.env.NODE_ENV = 'test';

// Module dependencies.

var app = require('../app'),
    assert = require('assert'),
    url = require('url'),
    lastID = '',
    cookies = [];

app.on('close', function(errno) { 
    console.log("********** CLOSED " + errno + " *********")
});
    
function clearCollection(model, callback) {
    model.remove({}, function(err) {
        if (err) throw err;
        callback.call();
    });
}

function clearCollections(models, callback) {
    // Clear collections in parallel, and call the callback
    // when the last one completes.
    var toGo = models.length;
    for (var i = 0; i < models.length; i++) {
        clearCollection(models[i], function() {
            if (--toGo === 0) callback.call();
        });
    }
}

function clearDB(callback) {
    clearCollections([app.Document, app.User, app.LoginToken], callback);
}

function createTestUser(callback) {
    new app.User({ email: 'alex@example.com', password: 'test' }).save(function(err) {
        if (err) throw err;
        callback.call();
    });
}

function login(userEmail, userPassword, callback) {
    assert.response(app, 
        { url: '/sessions',
          method: 'POST',
          data: JSON.stringify({ user: { email: userEmail, password: userPassword } }),
          headers: { 'Content-Type': 'application/json' } },
        { status: 302 },
        function(res) {
            cookies = res.headers['set-cookie'];
            callback.call();
        });
}
    
module.exports = {
    
    setup: function(done) {
        console.log('===== Setup - clearing DB and creating test user =====');
        clearDB(function() {
            createTestUser(function() {
                console.log('Setup complete');
                done.call();
            });
        });
    },
    
    'Test registration': function(done) {
        console.log('Test registration');
        assert.response(app, 
            { url: '/users.json',
              method: 'POST',
              data: JSON.stringify({ user: { email: 'alex@example.com', password: 'test' } }),
              headers: { 'Content-Type': 'application/json' } }, 
            { status: 200,
              headers: { 'Content-Type': 'application/json; charset=utf-8' } },
            function(res) {
                var user = JSON.parse(res.body);
                assert.equal('alex@example.com', user.email);
                console.log('Test complete');
                done();
            });
    },

    'Test login': function(done) {
        console.log('Test login');
        assert.response(app, 
            { url: '/sessions',
              method: 'POST',
              data: JSON.stringify({ user: { email: 'alex@example.com', password: 'test' } }),
              headers: { 'Content-Type': 'application/json' } },
            { status: 302 },
            function(res) {
                var redirectUrl = res.headers.location;
                var redirectPathname = url.parse(redirectUrl).pathname;
                assert.equal('/documents', redirectPathname);
                console.log('Test complete');
                done();
            });
    },
    
    'HTML POST /documents': function(done) {
        console.log('HTML POST /documents');
        login('alex@example.com', 'test', function() {
            console.log('cookies: ' + cookies);
            assert.response(app, 
                           { url: '/documents',
                             method: 'POST',
                             data: 'document[title]=test',
                             headers: { 'Content-Type': 'application/x-www-form-urlencoded',
                                        'Cookie': cookies }},
                           { status: 302 },
                           function(res) {
                               console.log(res.headers.location);
                               console.log('Test complete');
                               done();
                           });
        });
    }
    
};

// This is a quick hack to allow the tests to finish and exit.
setTimeout(function() {
    process.exit();
}, 500);

// ----------------



var newTests = {
    'Test login': function(beforeExit) {
        assert.response(app, 
            { url: '/sessions',
              method: 'POST',
              data: JSON.stringify({ user: { email: 'alex@example.com', password: 'test' } }),
              headers: { 'Content-Type': 'application/json' } },
            { status: 302,
              headers: { 'location': '/documents' } });
    },

    'Test document index': function(beforeExit) {
        assert.response(app, 
            { url: '/documents.json',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            }, 
            { status: 200 },
           function (res) {
              console.log(res.body);
           });
    },

    'GET /': function() {
        assert.response(app,
                        { url: '/' },
                        { status: 200, 
                          headers: { 'Content-Type': 'text/html; charset=utf-8' }},
                        function(res){
                            assert.includes(res.body, '<title>Express</title>');
                        });
    },
  
    'GET /documents.json': function() {
        assert.response(app,
                        { url: '/documents.json' },
                        { status: 200, 
                          headers: { 'Content-Type': 'application/json' }},
                        function(res) {
                            var documents = JSON.parse(res.body);
                            assert.type(documents, 'object')
                            console.log('Documents: ' + documents); // *****
                            documents.forEach(function(d) {
                                console.log('Document id: ' + d._id); // *****
                                app.Document.findById(d._id, function(err, document) {
                                    document.remove();
                                })
                            });
                        });
    },

  
    'POST /documents.json': function() {
        assert.response(app, 
                        { url: '/documents.json',
                          method: 'POST',
                          data: JSON.stringify({ document: { title: 'Test' } }),
                          headers: { 'Content-Type': 'application/json' }}, 
                         { status: 200,
                          headers: { 'Content-Type': 'application/json' }},
                        function(res) {
                            var document = JSON.parse(res.body);
                            assert.equal('Test', document.title);
                            lastID = document._id;
                        });
    },

    'HTML POST /documents': function() {
        assert.response(app, 
                        { url: '/documents',
                          method: 'POST',
                          data: 'document[title]=test',
                          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }},
                        { status: 302 }
                       );
    },
    
   'POST /documents.json': function(beforeExit) {
    assert.response(app, {
        url: '/documents.json',
        method: 'POST',
        data: JSON.stringify({ d: { title: 'Test' } }),
        headers: { 'Content-Type': 'application/json' }
      }, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      },

      function(res) {
        var d = JSON.parse(res.body);
        assert.equal('Test', d.title);
      }
    );
  },

  'HTML POST /documents': function(beforeExit) {
    assert.response(app, {
        url: '/documents',
        method: 'POST',
        data: 'd[title]=test',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }, {
        status: 302,
        headers: { 'Content-Type': 'text/plain' }
      });
  },

  'GET /documents/id.json': function(beforeExit) {
  },

  'GET /documents.json and delete them all': function(beforeExit) {
    assert.response(app,
      { url: '/documents.json' },
      { status: 200, headers: { 'Content-Type': 'application/json' }},
      function(res) {
        var documents = JSON.parse(res.body);
        assert.type(documents, 'object');

        documents.forEach(function(data) {
          app.Document.findById(data._id, function(d) {
            d.remove();
          });
        });
      });
  },

  'GET /': function(beforeExit) {
    assert.response(app,
      { url: '/' },
      { status: 302 },
      function(res) {
        process.exit();
      });
  }
};

