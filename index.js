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

        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // Get all posts from db
        app.get('/posts', async (req, res) => {
            const result = await postCollection.find().toArray();
            res.send(result);
        })

        // Get all upcoming posts from db
        app.get('/posts/upcoming', async (req, res) => {
            const query = { deadline: 1 };
            const result = await postCollection.find().sort(query).toArray();
            res.send(result);
        })

        // Get a single post from db by specific id
        app.get('/post-details/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await postCollection.findOne(query);
            res.send(result);
        })



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