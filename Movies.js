
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

//mongoose.connect(process.env.DB, { useNewUrlParser: true });
try
{
    mongoose.connect( process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true}, () =>
        console.log("connected"));
}catch (error)
{
    console.log("could not connect");
}
//mongoose.set('useCreateIndex', true);

//movies schema
let MovieSchema = new Schema({
    title: {type: String, required: true, index: { unique: true}},
    yearReleased: {type: String, required: true},
    genre: {type: String, required: true},
    actors: [{actorName: String, characterName: String}]
});


//return the model to server
module.exports = mongoose.model('Movie', MovieSchema);