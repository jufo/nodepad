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

app.configure('development', function() {
    app.set('db-uri', 'mongodb://localhost/nodepad-development');
    app.use(express.errorHandler({ dumpExceptions: true }));  
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
    app.use(express.cookieParser());
    app.use(express.session({ store: mongoStore(app.set('db-uri')), secret: 'topsecret' }));
    app.use(express.logger({ format: '\x1b[1m:method\x1b[0m \x1b[33m:url\x1b[0m :response-time ms' }))
    app.use(express.methodOverride());
    app.use(express.compiler({ src: __dirname + '/public', enable: ['less'] }));
//    app.use(app.router);
    app.use(express.static(__dirname + '/public'));

    models.defineModels(mongoose);
    app.mongoose = mongoose;  // TODO: use app.set
    app.Document = Document = mongoose.model('Document');
    app.User = User = mongoose.model('User');
});

function loadUser(req, res, next) {
    if (req.session.user_id) {
        User.findById(req.session.user_id, function(err, user) {
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

// Error handling
function NotFound(msg) {
    this.name = 'NotFound';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}

sys.inherits(NotFound, Error);

app.get('/404', function(req, res) {
    throw new NotFound;
});

app.get('/500', function(req, res) {
    throw new Error('An expected error');
});

app.get('/bad', function(req, res) {
    unknownMethod();
});

app.error(function(err, req, res, next) {
    if (err instanceof NotFound) {
        res.render('404', { status: 404 });
    } else {
        next(err);
    }
});

app.error(function(err, req, res) {
    res.render('500', {
      status: 500,
      locals: { error: err } 
    });
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

app.get('/documents/:id.:format?/edit', loadUser, function(req, res, next) {
    Document.findById(req.params.id, function(err, d) {
        if (!d) return next(new NotFound('Document not found'));
        
        res.render('documents/edit', { d: d, currentUser: req.currentUser });
    });
});

app.get('/documents/new', loadUser, function(req, res) {
    res.render('documents/new', { d: new Document(), currentUser: req.currentUser });
});

// Create document 
app.post('/documents.:format?', loadUser, function(req, res) {
    var d = new Document(req.body.d);
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

// Read document
app.get('/documents/:id.:format?', loadUser, function(req, res, next) {
    Document.findById(req.params.id, function(err, d) {
        if (!d) return next(new NotFound('Document not found'));
        
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
app.put('/documents/:id.:format?', loadUser, function(req, res, next) {
    Document.findById(req.body.d.id, function(err, d) {
        if (!d) return next(new NotFound('Document not found'));
        
        d.title = req.body.d.title;
        d.data = req.body.d.data;
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
app.del('/documents/:id.:format?', loadUser, function(req, res, next) {
    Document.findById(req.params.id, function(err, d) {
        if (!d) return next(new NotFound('Document not found'));
        
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
    User.findOne({ email: req.body.user.email }, function(err, user) {
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
