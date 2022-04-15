const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const cors = require('cors');

const authJwtController = require('./auth_jwt');
const jwt = require('jsonwebtoken');
const User = require('./Users');
const Movie = require("./Movies");
const Review = require("./Reviews");

const rp = require('request-promise');
const mongoose = require("mongoose");
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(passport.initialize());
const router = express.Router();

function getJSONObjectForMovieRequirement(req, msg)
{
    let json =
        {
            message: msg,
            headers: "No headers",
            key: process.env.UNIQUE_KEY,
            body: "No body"
        };

    if (req.body != null)
    {
        json.body = req.body;
    }

    if (req.headers != null)
    {
        json.headers = req.headers;
    }

    return json;
}

const GA_TRACKING_ID = process.env.GA_KEY;

function trackDimension(category, action, label, value, dimension, metric) {

    var options = { method: 'GET',
        url: 'https://www.google-analytics.com/collect',
        qs:
            {
                v: '1',
                tid: GA_TRACKING_ID,
                cid: crypto.randomBytes(16).toString("hex"),
                // Event type, category, action, label, value, dimension, metric
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

//put code here for getting event to google analytics

router.post('/signup', function (req, res)
{
    if (!req.body.username || !req.body.password)
    {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    }
    else
    {
        let user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;
        user.save(function (err)
        {
            if (err)
            {
                if (err.code === 11000)
                    return res.json({success: false, message: 'A user with that username already exists.'});
                else
                    return res.json(err);
            }
            res.json({success: true, msg: 'Successfully created new user.'})
        });
    }
});

router.post('/signin', function (req, res)
{
    let userNew = new User();
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
                let userToken = {id: user.id, username: user.username};
                let token = jwt.sign(userToken, process.env.SECRET_KEY, null, null);
                res.json({success: true, token: 'JWT ' + token});
            } else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        })
    })
});

router.route('/movies')
    .get(authJwtController.isAuthenticated, function (req, res)
    {
        if (req.query && req.query.reviews && req.query.reviews === "true") {
            Movie.find(function(err, movies) {
                console.log(movies);
                if(err) {
                    return res.status(400).json({success: false, message: "No reviews found"});
                } else if (!movies) {
                    return res.status(400).json({success: false, message: "Provide movie title"})
                } else {
                    Movie.aggregate([
                        {
                            $lookup: {
                                from: "Reviews",
                                localField: "_id",
                                foreignField: "movie_id",
                                as: "movie_review"
                            }
                        },
                        {
                            $addFields: {
                                avg_review: {$avg: "movie_review.rating"}
                            }
                            },
                        {
                            $sort: {avg_review : -1}
                        }
                    ])
                        .exec(function (err, movie)
                        {
                            if (err)
                            {
                                return res.json(err);
                            } else {
                                return res.json({movie : movie});
                            }
                        })
                }
            }
        )}
        else {
            console.log(req.body);
            res = res.status(200);
            if (req.get('Content-Type')) {
                res = res.type(req.get('Content-Type'));
            }
            Movie.find().exec(function (err, movies) {
                if (err) {
                    res.send(err);
                }
                if (movies.length < 1) {
                    res.json({success: false, message: 'There are no movies available.'});
                } else {
                    res.json(movies);
                }
            })
        }
    })

    .post(authJwtController.isAuthenticated, function (req, res)
    {
        console.log(req.body);
        res = res.status(200);
        const genres =
            ["Action",
                "Anime",
                "Adventure",
                "Comedy",
                "Drama",
                "Fantasy",
                "Horror",
                "Mystery",
                "Suspense",
                "Thriller"];
        if(!req.body.title){res.json({success: false, message: "Title Missing"});}
        else if (!req.body.genre)
        {
            res.json({success: false, message: 'Title Missing.'})
        }
        else if (!genres.includes(req.body.genre))
        {
            res.json({success: false, message: "Genre Missing.", accepted_genres: genres})
        }
        else if (!req.body.yearReleased)
        {
            res.json({success: false, message: 'Missing Year YYYY.'})
        }
        else if (req.body.actors.length < 3)
        {
            res.json({success: false, message: 'Must include at least 3 Actors.'})
        }
        else {
            let movieNew = new Movie();
            movieNew.title = req.body.title;
            movieNew.yearReleased = req.body.yearReleased;
            movieNew.genre = req.body.genre;
            movieNew.actors = req.body.actors;

            if (req.get('Content-Type'))
            {
                res = res.type(req.get('Content-Type'));
            }

            movieNew.save(function (err)
            {
                if (err) {
                    if (err.code === 11000)
                        return res.json({success: false, message: 'This Movie already exists.'});
                    else
                        return res.json(err);
                } else {
                    var o = getJSONObjectForMovieRequirement(req, 'Movie has been saved');
                    res.json(o)
                }
            });
        }
    })



router.route('/movies/:title') //able to read the different dynamic segments within our component using the ":" with the segment we want

    .get(authJwtController.isAuthenticated, function (req, res)
    {
        if (req.query && req.query.reviews && req.query.reviews === "true") {
            Movie.find(function(err, movies) {
                    console.log(movies);
                    if(err) {
                        return res.status(400).json({success: false, message: "No reviews found"});
                    } else if (!movies) {
                        return res.status(400).json({success: false, message: "Provide movie title"})
                    } else {
                        Movie.aggregate([
                            {
                                $lookup: {
                                    from: "Reviews",
                                    localField: "_id",
                                    foreignField: "movie_id",
                                    as: "movie_review"
                                }
                            },
                            {
                                $addFields: {
                                    avg_review: {$avg: "movie_review.rating"}
                                }
                            },
                            {
                                $sort: {avg_review : -1}
                            }
                        ])
                            .exec(function (err, movie)
                            {
                                if (err)
                                {
                                    return res.json(err);
                                } else {
                                    return res.json({movie : movie});
                                }
                            })
                    }
                }
            )}
        else
        {
            console.log(req.body);
            res = res.status(200);

            if (req.get('Content-Type')) {
                res = res.type(req.get('Content-Type'));
            }
            Movie.find({title: req.params.title}).exec(function (err, movie) {
                if (err) {
                    res.send(err);
                }
                res.json(movie);
            })
        }
    })


    .delete(authJwtController.isAuthenticated, function (req, res)
    {
        console.log(req.body);
        res = res.status(200);
        if (req.get('Content-Type'))
        {
            res = res.type(req.get('Content-Type'));
        }
        Movie.find({title: req.params.title}).exec(function (err, movie) {
            if (err)
            {
                res.send(err);
            }
            console.log(movie);
            if (movie.length < 1)
            {
                res.json({success: false, message: 'Movie Title not found.'});
            } else
            {
                Movie.deleteOne({title: req.params.title}).exec(function (err)
                {
                    if (err)
                    {
                        res.send(err);
                    } else
                    {
                        var o = getJSONObjectForMovieRequirement(req, 'Movie deleted');
                        res.json(o);
                    }
                })
            }
        })
    })
    .put(authJwtController.isAuthenticated, function (req, res)
    {
        console.log(req.body);
        res = res.status(200);
        if (req.get('Content-Type'))
        {
            res = res.type(req.get('Content-Type'));
        }
        Movie.updateOne({title: req.params.title},
            {
                title: req.body.title,
                yearReleased: req.body.yearReleased, genre: req.body.genre, actors: req.body.actors
            })
            .exec(function (err)
            {
                if (err)
                {
                    res.send(err);
                }
            })
        var o = getJSONObjectForMovieRequirement(req, 'Movie updated');
        res.json(o);
    });


router.route('/reviews')
    .post(authJwtController.isAuthenticated, function(req, res) {
        if (!req.body.small_quote || !req.body.rating || !req.body.title)
        {
            return res.json({ success: false, message: 'Please include all information (small quote, rating, and title of movie)'});
        }
        else {
            var review = new Review();


            jwt.verify(req.headers.authorization.substring(4), process.env.SECRET_KEY, function(err, ver_res) {
                if (err)
                {
                    return res.status(403).json({success: false, message: "Unable to post review"});
                } else {
                    review.user_id = ver_res.id;

                    Movie.findOne({title: req.body.title}, function(err, movie) {
                        if (err) {
                            return res.status(403).json({success: false, message: "Unable to post review"});
                        } else if (!movie) {
                            return res.status(403).json({success: false, message: "Unable to find movie"});
                        } else {
                            review.movie_id = movie._id;
                            review.username = ver_res.username;
                            review.small_quote = req.body.small_quote;
                            review.rating = req.body.rating;

                            review.save (function (err) {
                                if (err) {
                                    return res.status(403).json({success: false, message: "Unable to post review"});
                                } else {
                                    //trackDimension(movie.genre, 'post/review', 'POST', review.rating, movie.title, '1');

                                    return res.status(200).json({success: true, message: "Review posted", movie: movie});
                                }
                            })
                        }
                    })
                }
            })
        }
    });





app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only

