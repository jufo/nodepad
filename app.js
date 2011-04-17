// Module dependencies.

var express = require('express'),
    mongoose = require('mongoose'),
    mongoStore = require('connect-mongodb'),
    models = require('./models.js'),
    app = module.exports = express.createServer(),
    Document,
    User,
    Settings = { development: {}, test: {}, production: {} };

// Configuration

// Converts a database connection URI string to
// the format connect-mongodb expects
function mongoStoreConnectionArgs() {
  return { dbname: db.db.databaseName,
           host: db.db.serverConfig.host,
           port: db.db.serverConfig.port,
           username: db.uri.username,
           password: db.uri.password };
}

app.configure('development', function() {
    app.set('db-uri', 'mongodb://localhost/nodepad-development');
});

app.configure('test', function() {
    app.set('db-uri', 'mongodb://localhost/nodepad-test');
});

app.configure('production', function() {
    app.set('db-uri', 'mongodb://localhost/nodepad-production');
});

mongoose.connect(app.set('db-uri'));

app.configure(function() {
    app.set('views', __dirname + '/views');
    app.use(express.favicon());
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.cookieDecoder());
    app.use(express.session({
      store: mongoStore(mongoStoreConnectionArgs())
    }));
    app.use(express.logger({ format: '\x1b[1m:method\x1b[0m \x1b[33m:url\x1b[0m :response-time ms' }))
    app.use(express.methodOverride());
    app.use(express.compiler({ src: __dirname + '/public', enable: ['less'] }));
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));

    models.defineModels(mongoose);
    app.mongoose = mongoose;  // TODO: use app.set
    app.Document = Document = mongoose.model('Document');
    app.User = User = require('./models.js').User(db);
});

function loadUser(req, res, next) {
    if (req.session.user_id) {
        User.findById(req.session.user_id, function(user) {
            if (user) {
                req.currentUser = user;
                next();
            } else {
                res.redirect('/sessions/new');
            }
        });
    } else {
        res.redirect('/sessions/new');
    }
}

// Routes

// Redirect from / to documents list
app.get('/', loadUser, function(req, res) {
  res.redirect('/documents')
});

// Document list
app.get('/documents.:format?', loadUser, function(req, res) {
    Document.find({}, function(err, documents) {
        switch (req.params.format) {
            case 'json':
                res.send(documents.map(function(d) {
                    return d.toObject();
                }));
                break;
            default:
                res.render('documents/index', 
                           { documents: documents, 
                             currentUser: req.currentUser });
        }
    });
});

app.get('/documents/:id.:format?/edit', loadUser, function(req, res) {
    console.log('Id: ' + req.params.id);
    Document.findById(req.params.id, function(err, d) {
        console.log('err: ' + err);
        console.log('d: ' + d);
        res.render('documents/edit', { d: d, currentUser: req.currentUser });
    });
});

app.get('/documents/new', loadUser, function(req, res) {
    res.render('documents/new', { d: new Document(), currentUser: req.currentUser });
});

// Create document 
app.post('/documents.:format?', loadUser, function(req, res) {
    var document = new Document(req.body['document']);
    document.save(function() {
        switch (req.params.format) {
            case 'json':
                res.send(document.toObject());
                break;
                 
            default:
                res.redirect('/documents');
        }
    });
});

// Read document
app.get('/documents/:id.:format?', loadUser, function(req, res) {
    Document.findById(req.params.id, function(err, d) {
        switch (req.params.format) {
            case 'json':
                res.send(d.toObject());
                break;

            default:
                res.render('documents/show', { d: d, currentUser: req.currentUser });
        }
    });
});

// Update document
app.put('/documents/:id.:format?', loadUser, function(req, res) {
    Document.findById(req.body.document.id, function(err, d) {
        d.title = req.body.document.title;
        d.data = req.body.document.data;
        d.save(function(err) {
            switch (req.params.format) {
                case 'json':
                    res.send(d.toObject());
                    break;

                default:
                    res.redirect('/documents');
            }
        });
    });
});

// Delete document
app.del('/documents/:id.:format?', loadUser, function(req, res) {
    Document.findById(req.params.id, function(err, d) {
        d.remove(function(err) {
            switch (req.params.format) {
                case 'json':
                    res.send('true');
                    break;

                default:
                    res.redirect('/documents');
            } 
        });
    });
});

// Users
app.get('/users/new', function(req, res) {
    res.render('users/new', { user: new User() });
});

app.post('/users.:format?', function(req, res) {
    var user = new User(req.body.user);
    
    function userSaved() {
        switch (req.params.format) {
            case 'json':
                res.send(user.toObject());
                break;
        
        default:
            req.session.user_id = user.id;
            res.redirect('/documents');
        }
    }

    function userSaveFailed() {
        // TODO: Show error messages
        res.render('users/new', { user: user });
    }

    user.save(userSaved, userSaveFailed);
});

// Sessions
app.get('/sessions/new', function(req, res) {
    res.render('sessions/new', { user: new User() });
});

app.post('/sessions', function(req, res) {
    User.find({ email: req.body.user.email }).first(function(err, user) {
        if (user && user.authenticate(req.body.user.password)) {
            req.session.user_id = user.id;
            res.redirect('/documents');
        } else {
            // TODO: Show error
            res.redirect('/sessions/new');
        }
    }); 
});

app.del('/sessions', loadUser, function(req, res) {
    if (req.session) {
        req.session.destroy(function(err) {});
    }
    res.redirect('/sessions/new');
});

// Only listen on $ node app.js

if (!module.parent) {
    app.listen(3000);
    console.log("Express server listening on port %d", app.address().port);
}
