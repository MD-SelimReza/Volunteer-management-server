const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();

const corsOptions = {
    origin: [
        'http://localhost:5173',
        'https://volunteer-management-406ea.web.app',
        'https://volunteer-management-406ea.firebaseapp.com'
    ],
    credentials: true,
    optionSuccessStatus: 200,
}

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) return res.status(401).send({ message: 'unauthorized access' })
    // console.log('form verify token', token, req.method, req.url);
    if (token) {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                // console.log(err);
                return res.status(401).send({ message: 'unauthorized access' })
            }
            // console.log('form decoded', decoded);
            req.user = decoded
            next()
        })
    }
}


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

        // jwt implement
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '7d',
            })
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            }).send({ success: true });
        });

        // Clear token on logout
        app.get('/logOut', (req, res) => {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                maxAge: 0,
            }).send({ success: true })
        })

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
            // console.log(post);
            const result = await postCollection.insertOne(post);
            res.send(result);
        })

        // Route to get all post posted by a specific user
        app.get('/posts/:email', verifyToken, async (req, res) => {
            const tokenEmail = req.user.email;
            const email = req.params.email;
            // console.log(tokenEmail, email, 'form token');
            if (tokenEmail !== email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
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
            // console.log(requestInfo);
            const query = {
                volunteer_email: requestInfo.volunteer_email,
                requestId: requestInfo.requestId
            };
            // console.log(query);
            const alreadyRequest = await infoCollection.findOne(query);
            // console.log(alreadyRequest);
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
            // console.log(updateNoOfVolunteer);
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
        app.get('/request/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { organizer_email: email };
            const result = await infoCollection.find(query).toArray();
            res.send(result);
        })

        // Route to delete request post from db
        app.delete('/request/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { volunteer_email: email };
            const result = await infoCollection.deleteOne(query);
            res.send(result);
        })

        // Route to fetch all posts
        app.get('/all-post', async (req, res) => {
            const page = parseInt(req.query.page) - 1;
            const size = parseInt(req.query.size);
            const filter = req.query.filter;
            const sort = req.query.sort;
            const search = req.query.search;

            let query = { post_title: { $regex: search, $options: 'i' } };
            if (filter) query = { ...query, category: filter };
            let options = {}
            if (sort) options = { sort: { deadline: sort === 'asc' ? 1 : -1 } }
            const result = await postCollection
                .find(query, options)
                .skip(page * size)
                .limit(size)
                .toArray();
            res.send(result);
        });

        // Route to get total number of posts
        app.get('/total-post', async (req, res) => {
            const filter = req.query.filter;
            const search = req.query.search
            let query = {
                post_title: { $regex: search, $options: 'i' },
            }
            if (filter) query = { ...query, category: filter };
            const total = await postCollection.countDocuments(query);
            res.send({ total });
        });

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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