const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
	const authorization = req.headers.authorization;
	if (!authorization) {
		return res.status(401).send({ error: true, message: 'unauthorized access' });
	}
	//   bearer token
	const token = authorization.split(' ')[1];

	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
		if (err) {
			return res.status(401).send({ error: true, message: 'unauthorized access' });
		}
		req.decoded = decoded;
		next();
	})
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iutwb2x.mongodb.net/?retryWrites=true&w=majority`;

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

		const userCollection = client.db("languageDb").collection("users");
		const instructorCollection = client.db("languageDb").collection("instructors");
		const classesCollection = client.db("languageDb").collection("classes");
		const myClassCollection = client.db("languageDb").collection("myClass");
		const paymentCollection = client.db("languageDb").collection("payments");

		// JWT
		app.post('/jwt', (req, res) => {
			const user = req.body;
			const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
			res.send({ token });
		})

		const verifyAdmin = async (req, res, next) => {
			const email = req.decoded.email;
			const query = { email: email }
			const user = await userCollection.findOne(query);
			if (user?.role !== 'admin') {
				return res.status(403).send({ error: true, message: 'forbidden message' });
			}
			next();
		}
		const verifyInstructor = async (req, res, next) => {
			const email = req.decoded.email;
			const query = { email: email }
			const user = await userCollection.findOne(query);
			if (user?.role !== 'instructor') {
				return res.status(403).send({ error: true, message: 'forbidden message' });
			}
			next();
		}

		// Users API
		app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
			const result = await userCollection.find().toArray();
			res.send(result);
		})

		app.get('/users/admin/:email', verifyJWT, async (req, res) => {
			const email = req.params.email;

			if (req.decoded.email !== email) {
				res.send({ admin: false })
			}

			const query = { email: email }
			const user = await userCollection.findOne(query);
			const result = { admin: user?.role === 'admin' }
			res.send(result);
		})
		app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
			const email = req.params.email;

			if (req.decoded.email !== email) {
				res.send({ instructor: false })
			}

			const query = { email: email }
			const user = await userCollection.findOne(query);
			const result = { instructor: user?.role === 'instructor' }
			res.send(result);
		})

		app.patch('/users/admin/:id', async (req, res) => {
			const id = req.params.id;
			const filter = { _id: new ObjectId(id) };
			const updateDoc = {
				$set: {
					role: 'admin'
				}
			};
			const result = await userCollection.updateOne(filter, updateDoc);
			res.send(result);
		})

		app.patch('/users/instructor/:id', async (req, res) => {
			const id = req.params.id;
			const filter = { _id: new ObjectId(id) };
			const updateDoc = {
				$set: {
					role: 'instructor'
				}
			};
			const result = await userCollection.updateOne(filter, updateDoc);
			res.send(result);
		})


		app.post('/users', async (req, res) => {
			const user = req.body;
			const query = { email: user.email }
			const existingUser = await userCollection.findOne(query);
			if (existingUser) {
				return res.send({ message: 'user already exist' });
			}
			const result = await userCollection.insertOne(user);
			res.send(result);

		})




		// instructor API
		app.get('/instructors', async (req, res) => {
			const result = await instructorCollection.find().toArray();
			res.send(result);
		})

		// Class added by instructor

		app.post("/classes", async (req, res) => {
			const body = req.body;

			if (!body) {
				return res.status(404).send({ message: "body data not found" });
			}

			const result = await classesCollection.insertOne(body);
			console.log(result);
			res.send(result);
		})


		// classes API
		app.get('/classes', async (req, res) => {
			const result = await classesCollection.find({}).sort({ availableSeats: -1 }).toArray();
			res.send(result);
		})

		// my Class collection 
		app.get('/myClass', verifyJWT, async (req, res) => {
			const email = req.query.email;
			if (!email) {
				res.send([]);
			}
			const decodedEmail = req.decoded.email;
			if (email !== decodedEmail) {
				return res.status(403).send({ error: true, message: 'forbidden access' });
			}
			const query = { email: email };
			const result = await myClassCollection.find().toArray();
			res.send(result);
		})


		app.post('/myClass', async (req, res) => {
			const item = req.body;
			console.log(item);
			const result = await myClassCollection.insertOne(item);
			res.send(result);
		})

		app.delete('/myClass/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await myClassCollection.deleteOne(query);
			res.send(result);
		})


		// create payment intent
		app.post('/create-payment-intent', verifyJWT, async (req, res) => {
			const { price } = req.body;
			const amount = parseInt(price * 100);
			const paymentIntent = await stripe.paymentIntents.create({
				amount: amount,
				currency: 'usd',
				payment_method_types: ['card']
			});

			res.send({clientSecret: paymentIntent.client_secret})
		})

		// payment related api
		app.post('/payments', verifyJWT, async (req, res) => {
			const payment = req.body;
			const insertResult = await paymentCollection.insertOne(payment);

			// const query = { _id: { $in: payment.cartItems.map(id => new ObjectId(id)) } }
			// const deleteResult = await cartCollection.deleteMany(query)

			// res.send({ insertResult, deleteResult });
			res.send(insertResult);
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
	res.send('Global Language is ongoing');
})

app.listen(port, () => {
	console.log(`Global Language is ongoing on port:${port}`);
})