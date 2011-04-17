// Module dependencies.

var express = require('express'),
    mongoose = require('mongoose'),
    models = require('./models.js'),
    app = module.exports = express.createServer(),
    Document;

// Configuration

app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));

    models.defineModels(mongoose);
    app.mongoose = mongoose;
    app.Document = Document = mongoose.model('Document');
});

app.configure('development', function() {
    app.use(express.logger({ format: ':method :uri' }));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    mongoose.connect('mongodb://localhost/nodepad-development');
});

app.configure('production', function() {
    app.use(express.logger());
    app.use(express.errorHandler()); 
    mongoose.connect('mongodb://localhost/nodepad-production');
});

app.configure('test', function() {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    mongoose.connect('mongodb://localhost/nodepad-test');
});

// Routes

// Redirect from / to documents list
app.get('/', function(req, res) {
  res.redirect('/documents')
});

// Document list
app.get('/documents.:format?', function(req, res) {
    Document.find({}, function(err, documents) {
        switch (req.params.format) {
            case 'json':
                res.send(documents.map(function(d) {
                    return d.toObject();
                }));
                break;
            default:
                res.render('documents/index', { documents: documents });
        }
    });
});

app.get('/documents/:id.:format?/edit', function(req, res) {
    console.log('Id: ' + req.params.id);
    Document.findById(req.params.id, function(err, d) {
        console.log('err: ' + err);
        console.log('d: ' + d);
        res.render('documents/edit', { d: d });
    });
});

app.get('/documents/new', function(req, res) {
    res.render('documents/new', { d: new Document() });
});

// Create document 
app.post('/documents.:format?', function(req, res) {
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
app.get('/documents/:id.:format?', function(req, res) {
    Document.findById(req.params.id, function(err, d) {
        switch (req.params.format) {
            case 'json':
                res.send(d.__doc);
                break;

            default:
                res.render('documents/show.jade', { d: d });
        }
    });
});

// Update document
app.put('/documents/:id.:format?', function(req, res) {
    Document.findById(req.body.document.id, function(err, d) {
        d.title = req.body.document.title;
        d.data = req.body.document.data;
        d.save(function(err) {
            switch (req.params.format) {
                case 'json':
                    res.send(d.__doc);
                    break;

                default:
                    res.redirect('/documents');
            }
        });
    });
});

// Delete document
app.del('/documents/:id.:format?', function(req, res) {
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

// Only listen on $ node app.js

if (!module.parent) {
    app.listen(3000);
    console.log("Express server listening on port %d", app.address().port);
}
