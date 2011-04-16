// Run $ expresso

// Force test environment
process.env.NODE_ENV = 'test';

// Module dependencies.

var app = require('../app'),
    assert = require('assert'),
    lastID = '';

module.exports = {
    
    'GET /': function() {
        console.log('>>>>> Test: GET /');
        assert.response(app,
                        { url: '/' },
                        { status: 200, 
                          headers: { 'Content-Type': 'text/html; charset=utf-8' }},
                        function(res){
                            assert.includes(res.body, '<title>Express</title>');
                        });
    },
  
    'GET /documents.json': function() {
        console.log('>>>>> Test: GET /documents.json');
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
        console.log('>>>>> Test: POST /documents.json');
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
        console.log('>>>>> Test: HTML POST /documents');
        assert.response(app, 
                        { url: '/documents',
                          method: 'POST',
                          data: 'document[title]=test',
                          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }},
                        { status: 302 }
                       );
    }
};

// This is a quick hack to allow the tests to finish and exit.
setTimeout(function() {
    console.log("***** C L O S I N G *****");
    app.mongoose.connection.close();
}, 2000);
