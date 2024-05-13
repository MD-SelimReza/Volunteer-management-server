const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();

const corsOptions = {
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
    ],
    credentials: true,
    optionSuccessStatus: 200,
}

app.use(cors(corsOptions));
app.use(express.json())
console.log(process.env.DB_PASS, process.env.DB_USER);


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4ldhpeq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const postCollection = client.db('volunteerDB').collection('posts');
        const infoCollection = client.db('volunteerDB').collection('info');

        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // Route to get all posts from db
        app.get('/posts', async (req, res) => {
            const result = await postCollection.find().toArray();
            res.send(result);
        })

        // Route to get all upcoming posts from db
        app.get('/posts/upcoming', async (req, res) => {
            const query = { deadline: 1 };
            const result = await postCollection.find().sort(query).toArray();
            res.send(result);
        })

        // Route to get a single post from db by specific id
        app.get('/post-details/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await postCollection.findOne(query);
            res.send(result);
        })

        // Route to insert a post in db
        app.post('/post', async (req, res) => {
            const post = req.body;
            console.log(post);
            const result = await postCollection.insertOne(post);
            res.send(result);
        })

        // Route to get all post posted by a specific user
        app.get('/posts/:email', async (req, res) => {
            const email = req.params.email;
            const query = { organizer_email: email };
            const result = await postCollection.find(query).toArray();
            res.send(result);
        })

        // Route to get a post using id
        app.get('/update-post/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await postCollection.findOne(query);
            res.send(result);
        })

        // Route to get a post for be a volunteer from db 
        app.get('/be-volunteer/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await postCollection.findOne(query);
            res.send(result);
        })

        // Route to insert client request data from db
        app.post('/request', async (req, res) => {
            const requestInfo = req.body;
            console.log(requestInfo);
            const query = {
                volunteer_email: requestInfo.volunteer_email,
                requestId: requestInfo.requestId
            };
            console.log(query);
            const alreadyRequest = await infoCollection.findOne(query);
            console.log(alreadyRequest);
            if (alreadyRequest) {
                return res.status(400).send('You have already request on this post');
            }
            const result = await infoCollection.insertOne(requestInfo);
            // update volunteer number
            const updateDoc = {
                $inc: { NoOfVolunteers: -1 },
            }
            const requestQuery = { _id: new ObjectId(requestInfo.requestId) };
            const updateNoOfVolunteer = await postCollection.updateOne(requestQuery, updateDoc);
            console.log(updateNoOfVolunteer);
            res.send(result);
        })

        // Route to update a post using id
        app.put('/post/:id', async (req, res) => {
            const id = req.params.id;
            const post = req.body;
            const query = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatePost = {
                $set: {
                    ...post
                }
            };
            const result = await postCollection.updateOne(query, updatePost, options);
            res.send(result);
        })

        // Route to delete a post using id
        app.delete('/post/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await postCollection.deleteOne(query);
            res.send(result);
        })


        // Route to get all request posts for a organizer from db 
        app.get('/request/:email', async (req, res) => {
            const email = req.params.email;
            const query = { organizer_email: email };
            const result = await infoCollection.find(query).toArray();
            res.send(result);
        })

        // Route to delete request post from db
        app.delete('/request/:email', async (req, res) => {
            const email = req.params.email;
            const query = { volunteer_email: email };
            const result = await infoCollection.deleteOne(query);
            res.send(result);
        })

        // Route to fetch all posts
        app.get('/all-post', async (req, res) => {
            const page = parseInt(req.query.page) - 1;
            const result = await postCollection.find().skip(page * 6).limit(6).toArray();
            res.send(result);
        });

        // Route to get total number of posts
        app.get('/total-post', async (req, res) => {
            const total = await postCollection.countDocuments();
            res.send({ total });
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Server is running.....')
})

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
})