const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
let bodyParser = require('body-parser');
let mongoose = require('mongoose');

mongoose
  .connect(process.env.ETDB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Database connected!"))
  .catch(err => console.log(err));

const Schema = mongoose.Schema;

//user scehma
const userSchema = new Schema({
  username: { type: String, required: true }
})
let userModel = mongoose.model("user", userSchema);


//exercise scehma
const exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: new Date() },
})

let exerciseModel = mongoose.model("exercise", exerciseSchema);


app.use(cors())
app.use(express.static('public'))
// app.use("/",bodyParser.urlencoded({extended : false}));
app.use(bodyParser.urlencoded({ extended: true })); // if not included gives validation error in duration feild
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', (req, res) => {
  let username = req.body.username;
  //Creating a newUser Document
  let newUser = userModel({ username: username });
  newUser.save();
  res.json(newUser);
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  // console.log(req.body);
  let userId = req.params._id;
  let exerciseObj = {
    //JavaScript object exerciseObj is created to hold the exercise information
    userId: userId,
    description: req.body.description,
    duration: req.body.duration
  }

  if (req.body.date != '') {
    exerciseObj.date = req.body.date;
  }
  //A new instance of the exerciseModel is created using the exerciseObj.
  let newExercise = new exerciseModel(exerciseObj);

  try {
    const userFound = await userModel.findById(userId);
    // console.log(userFound);
    newExercise.save();
    //newly created exercise instance is saved to the database using the save() method. 
    res.json({
      _id: userFound._id,
      username: userFound.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString()
    });
  } catch (err) {
    console.log(err);
  }

})

app.get('/api/users', (req, res) => {
  userModel.find({}).then((users) => {
    res.json(users);
  })
})

app.get('/api/users/:_id/logs', async (req, res) => {
  let userId = req.params._id;

  let responseObj = {};
  
  let limitParam = req.query.limit;
  let toParam = req.query.to;
  let fromParam = req.query.from;

  limitParam = limitParam ? parseInt(limitParam) : limitParam;

    let queryObj = {userId : userId}

  if(fromParam || toParam){
    queryObj.date = {};

    if(fromParam){
      queryObj.date['$gte'] = fromParam;
    }
    if(toParam){
      queryObj.date['$lte'] = toParam;
    }
  }

  try {
    const userFound = await userModel.findById(userId);
    // console.log(userFound);
    // newExercise.save();

    let username = userFound.username;
    let userID = userFound._id;

    responseObj = {
      _id : userID,
      username : username
    }
    exerciseModel.find(queryObj).limit(limitParam).then(
      (exercises) => {

        exercises = exercises.map((x) =>{
          // To meet the second last testcase of dateString
          return {
            description : x.description,
            duration : x.duration,
            date : x.date.toDateString()
          }
        } )
    
        responseObj.log = exercises;
        responseObj.count = exercises.length;
        res.json(responseObj);
      })
  } catch (err) {
    console.log(err);
  }
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
