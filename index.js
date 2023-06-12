const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


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

		// Users API
		app.get('/users', async (req, res) => {
			const result = await userCollection.find().toArray();
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


		// classes API
		app.get('/classes', async (req, res) => {
			const result = await classesCollection.find().toArray();
			res.send(result);
		})

		// my Class collection 
		app.get('/myClass', async(req,res) => {
			const email = req.query.email;
			if (!email) {
				res.send([]);
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