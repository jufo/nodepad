var crypto = require('crypto');

function defineModels(mongoose) {
    
    var Schema = mongoose.Schema,
        ObjectId = Schema.ObjectId;
    
    var Document = new Schema({
        title: { type: String, index: true },
        data: String,
        tags: [String],
        user_id: { type: ObjectId, index: true }
    });
    
    Document.virtual('id').get(function() {
        return this._id.toHexString();
    });
    
    mongoose.model('Document', Document);
    
    function validateLength(s) {
        return s && s.length > 0 && s.length < 255
    }
    
    var User = new Schema({
        email: { type: String, unique: true },
        salt: String,
        hashed_password: String
    });
    
    User.virtual('id').get(function() {
        return this._id.toHexString();
    });
    
    User.virtual('password').get(function() {
        return this._password;
    }).set(function(password) {
        this._password = password;
        this.salt = this.makeSalt();
        this.hashed_password = this.hashPassword(password);        
    });
    
    User.method('authenticate', function(password) {
        return this.hashPassword(password) === this.hashed_password;
    });
    
    User.method('makeSalt', function() {
        return Math.round((new Date().valueOf() * Math.random())) + '';        
    });

    User.method('hashPassword', function(password) {
        return crypto.createHmac('sha1', this.salt).update(password).digest('hex');       
    });
    
    User.method('isValid', function() {
        // TODO: Better validation
        return validateLength(this.email) && validateLength(this.password);
    });
    
    User.pre('save', function(next) {
        if (!validateLength(this.email)) {
            next(new Error('Invalid email'));
        } else if (!validateLength(this.password)) {
            next(new Error('Invalid password'));
        } else {
            next();
        }
    });
    
    mongoose.model('User', User);
}

exports.defineModels = defineModels;
