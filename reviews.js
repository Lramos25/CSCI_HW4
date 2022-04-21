
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

try
{
    mongoose.connect(process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true}, () =>
        console.log("connected"));
}
catch(error)
{
    console.log("could not connect");
}
mongoose.set('useCreateIndex', true);

//Review Schema
const ReviewSchema = new Schema
({
    User_Id :
        {
        type : Schema.Types.ObjectId,
        ref: "UserSchema",
        required: true
    },
    Unique_id_of_movie:
        {
        type : Schema.Types.ObjectId,
        ref : "MovieSchema",
        required : true
    },
    username:
        {
        type: String,
        required: true
    },
    User_feedback:
        {
        type: String,
        required: true,
    },
    User_rating:
        {
        type : Number,
        required : true,
        min : 1,
        max : 5
    }

});

ReviewSchema.pre('save', function(next)
{
    next();
});

//return the model to server
module.exports = mongoose.model('Review', ReviewSchema);
