function defineModels(mongoose) {
    
    var Document = new mongoose.Schema({
        title: {type: String, index: true},
        data: String,
        tags: [String]
    });
    
    Document.virtual('id').get(function() {
        return this._id.toHexString();
    });
    
    mongoose.model('Document', Document);
}

exports.defineModels = defineModels;
