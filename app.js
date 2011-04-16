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

app.get('/', function(req, res){
    res.render('index', {
        title: 'Express'
    });
});

// Document list
app.get('/documents.:format', function(req, res) {
    Document.find({}, function(err, documents) {
        switch (req.params.format) {
            case 'json':
                res.send(documents.map(function(d) {
                    return d.toObject();
                }));
                break;
            default:
                res.render('documents/index.jade');
        }
    });
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
    res.render('index', {
        title: 'Get ' + req.params.id
    });
});

// Update document
app.put('/documents/:id.:format?', function(req, res) {
    res.render('index', {
        title: 'Put ' + req.params.id
    });
});

// Delete document
app.del('/documents/:id.:format?', function(req, res) {
    res.render('index', {
        title: 'Delete ' + req.params.id
    });
});

// Only listen on $ node app.js

if (!module.parent) {
    app.listen(3000);
    console.log("Express server listening on port %d", app.address().port);
}
