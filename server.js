const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const authJwtController = require('./auth_jwt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const User = require('./Users');
const Movie = require('./Movies');
const Review = require('./reviews');
const mongoose = require('mongoose');
let rp = require('request-promise');
const crypto = require('crypto');
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());

const router = express.Router();
const GA_TRACKING_ID = process.env.GA_KEY;


function trackDimension(category, action, label, value, dimension, metric)
{
    const options =
        {
            method: 'GET',
            url: 'https://www.google-analytics.com/collect',
            qs:
                {
                    v: '1',

                    tid: GA_TRACKING_ID,

                    cid: crypto.randomBytes(16).toString("hex"),

                    t: 'event',

                    ec: category,

                    ea: action,

                    el: label,

                    ev: value,

                    cd1: dimension,

                    cm1: metric
                },
            headers:
                {  'Cache-Control': 'no-cache' } };
    return rp(options);
}



router.route('/signup')
    .post(function(req, res)
    {
        if (!req.body.username || !req.body.password)
        {
            res.json({success: false, msg: 'Username or Password field is missing. Please include both username and password to signup.'})
        }
        else
        {
            const user = new User();
            user.name = req.body.name;
            user.username = req.body.username;
            user.password = req.body.password;
            user.save(function (err, user)
            {
                if (err)
                {
                    return res.json({success: false, message: "This User is already exist in our system. Please enter a new user"});
                }
                else
                {
                    return res.json({success: true, msg: 'Great News! You have successfully created a new user.', User : user});
                }
            });
        }
    })
    .all(function(req, res)
        {
            return res.json({success: false, msg: 'This HTTP method is not supported.'});
        }
    );



router.route('/signin')
    .post(function (req, res)
    {
        const userNew = new User();
        userNew.username = req.body.username;
        userNew.password = req.body.password;
        User.findOne({username: userNew.username}).select('name username password').exec(function (err, user)
        {
            if (err)
            {
                res.send(err);
            }
            user.comparePassword(userNew.password, function (isMatch)
            {
                if (isMatch)
                {
                    const userToken = {id: user.id, username: user.username};
                    const token = jwt.sign(userToken, process.env.SECRET_KEY);
                    res.json({success: true, token: 'JWT ' + token});
                } else
                {
                    return res.status(401).send({success: false, msg: 'Authentication failed.'});
                }
            })
        })
    })



router.route('/movies/:title_of_the_movie')
    .get(authJwtController.isAuthenticated, function (req, res){
        if(req.query && req.query.reviews && req.query.reviews === "true")
        {

            Movie.findOne({title : req.params.title_of_the_movie}, function(err, movie)
            {
                if (err)
                {
                    return res.status(404).json({success: false, message: "Sorry! The system could not find the movie."});
                }
                else if (!movie)
                {
                    return res.status(403).json({success: false, message: "Sorry! The Movie does not exist in our system."})
                }
                else
                {
                    Movie.aggregate([
                        {
                            $match : {_id: mongoose.Types.ObjectId(movie._id)}
                        },
                        {
                            $lookup:
                                {
                                    from: "reviews",
                                    localField: "_id",
                                    foreignField: "Unique_id_of_the_movie",
                                    as: "Review_of_the_Movie"
                                }
                        },
                        {
                            $addFields:
                                {
                                    AverageReviews: {$avg: "$Review_of_the_Movie.User_rating"}
                                }
                        }
                    ])
                        .exec(function (err, movie)
                        {
                            if (err)
                            {
                                return res.json(err);
                            }
                            else
                            {
                                return res.json({movie : movie});
                            }
                        })
                }
            })
        }
        else
        {
            Movie.find({title: req.params.title_of_the_movie}).select("title yearReleased genre actors").exec(function (err, movie)
            {
                if (err)
                {
                    return res.status(404).json({success: false, message: "Unable to find movie"});
                }
                else if (movie.length <= 0)
                {
                    return res.status(403).json({success: false, message: "Movie Does Not Exist"});
                }else {
                    return res.status(200).json({success: true, message: "Found Movie", Movie: movie})
                }
            })
        }
    })


router.route('/movies')
    .delete(authJwtController.isAuthenticated, function(req, res)
        {
            if(!req.body.title)
            {
                res.json({success:false, message: "Movie field missing, Please enter the name of Movie"});
            }
            else
            {
                Movie.findOneAndDelete({title : req.body.title}, function(err, movie)
                {
                    if(err)
                    {
                        return res.status(403).json({success:false, message: "Sorry! The system could not delete the Movie"});
                    }
                    else if(!movie)
                    {
                        return res.status(403).json({success: false, message: "Sorry! The system could not find the Movie"});
                    }
                    else
                    {
                        return res.status(200).json({success: true, message: "The Movie has been deleted"});
                    }
                })
            }
        }
    )
    .put(authJwtController.isAuthenticated, function(req, res)
        {
            if(!req.body.title || !req.body)
            {
                res.json({success:false, message: "To update the field, please provide the title of the Movie"});
            }
            else
            {
                const filter = {title : req.body.title};
                const update = {title : req.body};
                Movie.updateOne({title : req.body.title}, req.body, function(err, movie)
                {
                    if(err)
                    {
                        return res.status(403).json({success:false, message: "Sorry! The system could not update the Movie"});
                    }
                    else if(!movie)
                    {
                        return res.status(403).json({success: false, message: "Sorry! The system could not find the Movie"});
                    }
                    else
                    {
                        return res.status(200).json({success: true, message:"The Movie has been updated"});
                    }
                });
            }
        }
    )
    .get(authJwtController.isAuthenticated, function (req, res)
        {
            if (req.query && req.query.reviews && req.query.reviews === "true")
            {
                Movie.find(function (err, movies)
                {
                    console.log(movies);
                    if (err)
                    {
                        return res.status(403).json({success: false, message: "Sorry! The system could not retrieve reviews for this Movie"});
                    }
                    else if (!movies)
                    {
                        return res.status(403).json({success: false, message: "Sorry! The title of the Movie is missing"});
                    }
                    else
                    {
                        Movie.aggregate([
                            {
                                $lookup:
                                    {
                                        from: "reviews",
                                        localField: "_id",
                                        foreignField: "Unique_id_of_the_movie",
                                        as: "Review_of_the_Movie"
                                    }
                            },
                            {
                                $addFields:
                                    {
                                        AverageReviews: {$avg: "$Review_of_the_Movie.User_rating"}
                                    }
                            },
                            {
                                $sort: {AverageReviews : -1}
                            }
                        ])
                            .exec(function (err, movie)
                            {
                                if (err)
                                {
                                    return res.json(err);
                                }
                                else
                                {
                                    return res.json({movie : movie});
                                }
                            })
                    }
                })
            }
            else
            {
                Movie.find(function(err, movies)
                {
                    if(err)
                    {
                        res.send(err);
                    }
                    else
                    {
                        return res.json(movies).status(200).end();
                    }
                })
            }
        }
    )
    .post(authJwtController.isAuthenticated, function (req, res)
    {
        console.log(req.body);
        if (!req.body.title || !req.body.yearReleased || !req.body.genre || !req.body.actors[0] || !req.body.actors[1] || !req.body.actors[2])
        {

            res.json({success: false, message:
                    "One of the field is missing: " +
                    "Title, yearReleased, Genre, 3 Actors. Please check the field and try again"});
        }
        else
        {
            const movie = new Movie();
            movie.title = req.body.title;
            movie.yearReleased = req.body.yearReleased;
            movie.genre = req.body.genre;
            movie.link_for_movie_picture = req.body.link_for_movie_picture;
            movie.actors = req.body.actors;
            Movie.find({title:req.body.title}, function(err, movies)
            {
                if(err)
                {
                    return res.json(err);
                }
                else if(movies.length <= 0)
                {
                    movie.save(function (err)
                    {
                        if (err)
                        {
                            return res.json(err);
                        }
                        else
                        {
                            res.json({success: true, msg: 'The Movie has been created', Movie : movie});
                        }
                    })
                }
                else
                {
                    return res.json({success: false, message : "The Movie already exist in the system"})
                }
            })
        }
    })
    .all(function(req, res)
    {
        return res.json({success: false, msg: "This HTTP method is not supported."});
    });



router.route('/reviews')
    .post(authJwtController.isAuthenticated, function (req, res)
    {
        if(!req.body.title || !req.body.User_feedback || !req.body.User_rating)
        {
            return res.json({success: false, message :"One of the field is missing: " +
                    "Title, Username, User Feedback, Rating. Please check the field and try again."});
        }
        else
        {
            const review = new Review();
            //Retrieve the token from the authorization header
            jwt.verify(req.headers.authorization.substring(4), process.env.SECRET_KEY, function(err, unique)
            {
                if(err)
                {
                    return res.status(403).json({success : false, message: "Sorry! The system could not post the review"});
                }
                else
                {
                    review.Id_of_the_User = unique.id;
                    Movie.findOne({title: req.body.title}, function(err, movie)
                    {
                        if(err)
                        {
                            return res.status(403).json({success: false, message: "Sorry! The system could not post the review"});
                        }
                        else if(!movie)
                        {
                            return res.status(403).json({success: false, message: "Sorry! No Movie is found in the system"});
                        }
                        else
                        {
                            review.Unique_id_of_the_movie = movie._id;
                            review.username = unique.username;
                            review.User_feedback = req.body.User_feedback;
                            review.User_rating = req.body.User_rating;
                            review.save(function (err)
                            {
                                if (err)
                                {
                                    return res.json(err);
                                }
                                else
                                {
                                    trackDimension(movie.genre, 'Rating', 'Feedback for Movie', review.User_rating, review.title, "1");
                                    return res.json({success: true, message: "The Review has been successfully saved in the system"});
                                }
                            })
                        }
                    })
                }
            })
        }
    })


router.all('/', function (req, res)
{
    res.json({success: false, msg: 'This route is not supported.'});
})

app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only
