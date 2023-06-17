const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 3000;
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_SK);

app.use(cors());
app.use(express.json());


// JWT verification 
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Unauthorized access' });
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) return res.status(401).send({ error: true, message: 'Unauthorized access' });
        req.decoded = decoded;
        next();

    })
}

//---------MongoDB----------

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qvaeumc.mongodb.net/?retryWrites=true&w=majority`;

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
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        //DB connection
        const database = client.db("FineArts");
        const userCollection = database.collection("users");
        const classesCollection = database.collection("classes");
        const cartsCollection = database.collection("carts");

        //-------JWT---------
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send(token)
        })


        //--------------Get-----------------
        app.get('/carts', async (req, res) => {

            const uid = req.query.uid;
            if (!uid) res.send([]);
            const query = { uid: uid }
            const result = await cartsCollection.find(query).toArray();
            res.send(result);
        });

        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find().toArray();
            res.send(result);
        });

        //Based on UID
        app.get('/carts/:uid', async (req, res) => {
            const uid = req.params.uid;
            console.log('Carts Based on UID', uid);
            if (!uid) res.send([]);
            const query = { uid: uid }

            const result = await cartsCollection.find(query).toArray();
            console.log('Carts Based on result', result);
            res.send(result);
        });

        app.get('/carts/subtotal/:uid', async (req, res) => {
            const uid = req.params.uid;
            console.log('Carts subtotal Based on UID', uid);
            if (!uid) res.send([]);
            const query = { uid: uid }

            const result = await cartsCollection.find(query).toArray();
            let sub = 0;
            result.forEach(element => {
                sub += element.price;
            });
            console.log('Carts Based on result', { "subtotal": sub });
            res.send({ "subtotal": sub });
        });



        //Based on UID
        app.get('/classes/:uid', async (req, res) => {
            const uid = req.params.uid;
            console.log('Based on UID', uid);
            if (!uid) res.send([]);
            const query = { uid: uid }

            const result = await classesCollection.find(query).toArray();
            res.send(result);
        });



        //Based on class id
        app.get('/classes/:id', async (req, res) => {
            const id = req.params.id;
            console.log('Based on class id', id);
            const query = { _id: new ObjectId(id) }
            const result = await classesCollection.findOne(query);
            res.send(result);
        });


        //Based on class id
        app.get('/updateclass/:id', async (req, res) => {
            const id = req.params.id;
            console.log('id', id);
            const query = { _id: new ObjectId(id) }
            const result = await classesCollection.findOne(query);
            res.send(result);
        });

        //Based on user id
        app.get('/users/:id', async (req, res) => {
            const id = req.params.id;
            console.log('id', id);
            const query = { uid: id }
            const result = await userCollection.findOne(query);
            res.send(result);
        });


        //--------------Post---------

        app.post('/carts', async (req, res) => {

            const newCartItem = req.body;
            console.log('newCartItem', newCartItem);
            const result = await cartsCollection.insertOne(newCartItem);
            res.send(result);

        });


        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = 100 * price;
            console.log('create-payment-intent amount', amount);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ["card"]
            });

            res.send({
                ClientSecret: paymentIntent.client_secret
            })
        })

        app.post('/users', async (req, res) => {

            const newUser = req.body;
            console.log('User', newUser);
            const result = await userCollection.insertOne(newUser);
            res.send(result);

        });

        app.post('/classes', async (req, res) => {

            const newClass = req.body;
            console.log('Class', newClass);
            const result = await classesCollection.insertOne(newClass);
            res.send(result);

        });

        //-----------------Put----------------
        app.put('/updateclass/:id', async (req, res) => {
            const id = req.params.id;
            console.log('id', id);
            console.log('body', req.body);
            const query = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const receivedClass = req.body;
            const updatedClass = {
                $set: {
                    "name": receivedClass.name,
                    "image": receivedClass.image,
                    "total_seats": receivedClass.total_seats,
                    "available_seats": receivedClass.available_seats,
                    "number_of_classes": receivedClass.number_of_classes,
                    "price": receivedClass.price
                }
            }
            const result = await classesCollection.updateOne(query, updatedClass, options);
            res.send(result);
        });

        app.put('/manageclass/:id', async (req, res) => {
            const id = req.params.id;
            console.log('id', id);
            console.log('body', req.body);
            const query = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const receivedClass = req.body;
            if (receivedClass.status) {
                const updatedClass = {
                    $set: {
                        "status": receivedClass.status,
                    }
                }
                const result = await classesCollection.updateOne(query, updatedClass, options);
                res.send(result);
            }

            if (receivedClass.feedback) {
                const updatedClass = {
                    $set: {
                        "feedback": receivedClass.feedback,
                    }
                }
                const result = await classesCollection.updateOne(query, updatedClass, options);
                res.send(result);
            }
        });

        app.put('/manageuser/:id', async (req, res) => {
            const id = req.params.id;
            console.log('id', id);
            console.log('body', req.body);
            const query = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const receivedClass = req.body;
            if (receivedClass.account_type) {
                const updatedClass = {
                    $set: {
                        "account_type": receivedClass.account_type,
                    }
                }
                const result = await userCollection.updateOne(query, updatedClass, options);
                res.send(result);
            }

        });



        app.put('/users/:id', async (req, res) => {
            const uid = req.params.id;
            console.log('users id', uid);
            console.log('users body', req.body);
            const query = { uid: uid }
            const receivedData = req.body;
            const updatedData = {
                $push: { number_of_courses: receivedData }
            }
            const result = await userCollection.updateOne(query, updatedData);
            res.send(result);
        });


        //----------------Delete----------------
        app.delete('/classes/:id', async (req, res) => {
            const id = req.params.id;
            console.log('Class delete id', id);
            console.log('body', req.body);
            const query = { _id: new ObjectId(id) }
            const result = await classesCollection.deleteOne(query);
            res.send(result);
        });

        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            console.log('Cart delete id', id);
            console.log('body', req.body);
            const query = { _id: new ObjectId(id) }
            const result = await cartsCollection.deleteOne(query);
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //await client.close();
    }
}
run().catch(console.dir);


//----------------------



app.get('/', (req, res) => {
    res.send('FineArts server is up');
});


app.listen(port, () => {
    console.log(`FineArts is running on port ${port}`);
});