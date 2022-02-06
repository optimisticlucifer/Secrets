require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
//step-1 requiring modulle for session and cookies
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
//level6-step-1
const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// step-2 a setup express-session
app.use(session({
    secret: 'my little secret',
    resave: false,
    saveUninitialized: false
}));

// step-2 b,c init passport and use to manage session
app.use(passport.initialize());
app.use(passport.session());

//DB connecting then creating schema and there model
mongoose.connect('mongodb://localhost:27017/userDB', { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true });

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    // facebookId: String,
    secret: String
});

// step-2 d  added pLM as a plugin
userSchema.plugin(passportLocalMongoose);

//level6-step-2
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

// step-2 e config of passport-local
passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});


//level6-step-2
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        // console.log(profile);
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

// passport.use(new FacebookStrategy({
//     clientID: process.env.F_CLIENT_ID,
//     clientSecret: process.env.F_CLIENT_SECRET,
//     callbackURL: "http://localhost:3000/auth/facebook/secrets",
// },
//     function (accessToken, refreshToken, profile, cb) {
//         User.findOrCreate({ facebookId: profile.id }, function (err, user) {
//             return cb(err, user);
//         });
//     }
// ));

//creating routes
app.get("/", (req, res) => {
    res.render("home");
});

//level6-step-4
app.get("/auth/google",
    passport.authenticate('google', { scope: ['profile'] })
);

app.get("/auth/google/secrets",
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect to secretes.
        res.redirect('/secrets');
    });

// app.get('/auth/facebook',
//     passport.authenticate('facebook'));

// app.get('/auth/facebook/secrets',
//     passport.authenticate('facebook', { failureRedirect: '/login' }),
//     function (req, res) {
//         // Successful authentication, redirect to secretes.
//         res.redirect('/secrets');
//     });

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/secrets", (req, res) => {
    //step 3 a(2) login route process
    User.find({ "secret": { $ne: null } }, (err, foundUsers) => {
        if (err) {
            console.log(err);
        } else {
            if (foundUsers) {
                res.render("secrets", { userWithSecrets: foundUsers });
            }
        }
    });
});

app.get("/submit", function (req, res) {
    if (req.isAuthenticated()) {
        // console.log(req);
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
});


app.post("/submit", (req, res) => {
    const submittedSecret = req.body.secret;
    // console.log(req.user);//passport blende this info in req 

    User.findById(req.user.id, (err, foundUser) => {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(() => {
                    res.redirect("/secrets");
                });
            }
        }
    })
});

app.post("/register", (req, res) => {
    //step 3 a(1) registration process
    User.register({ username: req.body.username }, req.body.password, (err, user) => {
        if (err) {
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/login", (req, res) => {

    //step 3 b login route process
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });

});



app.listen(3000, function () {
    console.log("Server started on port 3000");
});