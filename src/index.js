const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const bearerToken = require("express-bearer-token");

// local dependencies
const User = require("./models/UserModel");

const app = express();
const PORT = 8081;
const JWT_SECRET = "LzghUGOhz0DJrskl7bix";

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bearerToken());

// bcrypt password
const hashedPassword = password => {
  return bcrypt.genSalt(10).then(salt => {
    return bcrypt.hash(password, salt).then(hash => {
      return hash;
    });
  });
};

mongoose
  .connect(
    "mongodb://admin:admin1234@ds151383.mlab.com:51383/ceegees",
    { useNewUrlParser: true }
  )
  .then(() => {
    console.log("connected to mongodb");
  });

app.get("/", (req, res) => {
  res.send("welcome");
});

app.post("/register", (req, res) => {
  console.log(req.body);
  let { body } = req;
  let token = jwt.sign(
    {
      data: {
        name: body.name,
        email: body.email
      }
    },
    JWT_SECRET
  );

  let userObject = new User({
    name: body.name,
    email: body.email,
    token
  });

  hashedPassword(body.password).then(hash => {
    userObject.password = hash;
    console.log(userObject);
    User.find({ email: body.email })
      .then(user => {
        if (user.length === 0) {
          userObject
            .save()
            .then(response => {
              console.log(response);
              res.send({
                success: "true",
                message: "user registered successfully",
                payload: {
                  id: response._id,
                  name: response.name,
                  mail: response.email
                }
              });
            })
            .catch(err => {
              console.log(err);
              res.send({
                success: "fail"
              });
            });
        } else {
          res.send({ success: "fail", message: "email already exists" });
        }
      })
      .catch(() => {
        console.log("internal server error");
      });
  });
});

app.post("/login", (req, res) => {
  console.log(req.body);
  let { body } = req;
  let userObject = {
    email: body.email
  };
  User.find(userObject)
    .then(user => {
      if (user.length === 0) {
        res.send({ success: "fail", message: "user not registered" });
      } else {
        let isVerified = bcrypt.compareSync(body.password, user[0].password);
        if (isVerified) {
          res.send({ success: "true", message: "login success" });
        } else {
          res.send({ success: "fail", message: "passwords doesnot match" });
        }
      }
    })
    .catch(err => {
      res.send({ success: "fail", message: "internal server error" });
    });
});

app.post("/password/forgot", (req, res) => {
  console.log(req.body);
  let { body } = req;
  let userObject = {
    email: body.email
  };
  User.find(userObject).then(user => {
    if (user.length === 0) {
      res.send({ success: "fail", message: "user not registered" });
    } else {
      let token = jwt.sign(
        {
          exp: Math.floor(Date.now() / 1000) + 60 * 60,
          data: { userId: user[0]._id, email: user[0].email }
        },
        JWT_SECRET
      );
      res.send({
        success: "true",
        message: "email exists",
        payload: {
          link: `http://ceeges-frontend.s3-website-us-east-1.amazonaws.com/resetPassword?token=${token}`
        }
      });
    }
  });
});

app.post("/password/reset", (req, res) => {
  let { body, headers } = req;
  console.log("headers", req.token);
  let token = req.token;
  jwt.verify(String(token), JWT_SECRET, (err, decoded) => {
    console.log("decoded", err, decoded);
    if (decoded) {
      let userObject = {
        email: decoded.data.email
      };
      hashedPassword(body.password).then(hash => {
        User.updateOne(userObject, { password: hash }).then(user => {
          res.send({
            success: "true",
            message: "password reset successfully"
          });
        });
      });
    } else {
      console.log("decoded err", err, decoded);
      res.send({ success: "fail", message: "internal server error" });
    }
  });
});

app.listen(PORT, () => {
  console.log("app now listening on " + PORT);
});
