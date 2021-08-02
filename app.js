require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
//step-1 requiring modulle for session and cookies
const session = require('express-session');
const passport =require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const { response, request } = require("express");

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
mongoose.connect('mongodb://localhost:27017/userDB', { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false ,useCreateIndex: true});

const userSchema=new mongoose.Schema({
    email:String,
    password:String
});

// step-2 d  added pLM as a plugin
userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User",userSchema);

// step-2 e config of passport-local
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());




//creating routes
app.get("/",(req,res)=>{
    res.render("home");
});

app.get("/login",(req,res)=>{
    res.render("login");
});

app.get("/register",(req,res)=>{
    res.render("register");
});

app.get("/secrets",(req,res)=>{
    //step 3 a(2) login route process
    if(req.isAuthenticated()){
        console.log(req);
        res.render("secrets");
    }else{
        res.redirect("/login");
    }
});

app.get("/logout",(req,res)=>{
    req.logout();
    res.redirect("/");
});

app.post("/register",(req,res)=>{
    //step 3 a(1) registration process
    User.register({username: req.body.username},req.body.password,(err,user)=>{
        if(err){
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/login",(req,res)=>{

    //step 3 b login route process
    const user =new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err) {
        if (err) {
            console.log(err);
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    });

});



app.listen(3000, function () {
    console.log("Server started on port 3000");
});