

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
require("dotenv").config()

try
{
    mongoose.connect( process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true}, () =>
        console.log("connected"));
}
catch (error)
{
    console.log("could not connect");
}
mongoose.set('useCreateIndex', true);

//movies schema
let MovieSchema = new Schema({
    title: {
        type: String,
        trim: true,
        required: "Title is required",

    },
    yearReleased: {
        type: Number,
        required: "Year Released is required",

    },
    genre: {
        type: String,
        required: true,
        enum: ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Thriller", "Western"]
    },
    imageUrl : {
        type: String,
        required : false
    },

    actors:
        [
            {ActorName : {type : String, required : true}, CharacterName : {type : String, required :true}},
            {ActorName : {type : String, required : true}, CharacterName : {type : String, required :true}},
            {ActorName : {type : String, required : true}, CharacterName : {type : String, required :true}},
            {ActorName : {type : String, required : true}, CharacterName : {type : String, required :true}}
        ]
});


//return the model to server
module.exports = mongoose.model('Movie', MovieSchema);
