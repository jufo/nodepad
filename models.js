function defineModels(mongoose) {
	
	var Document = new mongoose.Schema({
		    title: {type: String, index: true},
		    data: String,
		    tags: [String]
	    });

	mongoose.model('Document', Document);	
}

exports.defineModels = defineModels;
